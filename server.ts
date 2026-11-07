import express from 'express';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { normalizeAISpec, synthesizeFallbackPathologySpec } from './src/utils/pathologyEngine.ts';

dotenv.config();

/**
 * Generates a valid solid/gradient RGBA PNG buffer of given width x height without native dependencies
 * so PWA manifest icons (192x192, 512x512, apple-touch-icon) are always present on disk.
 */
function createSolidMedicalPng(width: number, height: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcInput = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(crcInput), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);
  const cx = width / 2;
  const cy = height / 2;
  const outerR = width * 0.34;
  const innerR = width * 0.14;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < innerR) {
        // Diagnostic Teal core (#0D9488)
        rawData[px] = 13;
        rawData[px + 1] = 148;
        rawData[px + 2] = 136;
        rawData[px + 3] = 255;
      } else if (Math.abs(dist - outerR) < width * 0.035) {
        // Clinical Crimson arterial ring (#EF4444)
        rawData[px] = 239;
        rawData[px + 1] = 68;
        rawData[px + 2] = 68;
        rawData[px + 3] = 255;
      } else {
        // Deep Obsidian Surgical Canvas (#070B12)
        rawData[px] = 7;
        rawData[px + 1] = 11;
        rawData[px + 2] = 18;
        rawData[px + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', iend),
  ]);
}

function ensurePwaIconsExist() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const iconTargets: [string, number][] = [
    ['apple-touch-icon.png', 180],
    ['pwa-192x192.png', 192],
    ['pwa-512x512.png', 512],
    ['pwa-maskable-512x512.png', 512],
  ];
  for (const [filename, size] of iconTargets) {
    const filePath = path.join(publicDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, createSolidMedicalPng(size, size));
    }
  }
}

async function startServer() {
  ensurePwaIconsExist();

  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  // Container & Reverse-Proxy Readiness Health Check
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'patho3d-atlas',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Official NIH Human Reference Atlas (HuBMAP CCF) 3D Reference Organ GLB Library
  const NIH_HRA_GLB_URLS: Record<string, string> = {
    heart_coronary:
      'https://cdn.humanatlas.io/digital-objects/ref-organ/heart-male/v1.3/assets/3d-vh-m-heart.glb',
    liver_portal:
      'https://cdn.humanatlas.io/digital-objects/ref-organ/liver-male/v1.2/assets/3d-vh-m-liver.glb',
    kidney_nephron:
      'https://cdn.humanatlas.io/digital-objects/ref-organ/kidney-male-left/v1.3/assets/3d-vh-m-kidney-l.glb',
    gi_mucosa_ulcer:
      'https://cdn.humanatlas.io/digital-objects/ref-organ/small-intestine-male/v1.2/assets/3d-vh-m-small-intestine.glb',
    lung_alveoli:
      'https://cdn.humanatlas.io/digital-objects/ref-organ/lung-male/v1.4/assets/3d-vh-m-lung.glb',
    brain_vascular:
      'https://cdn.humanatlas.io/digital-objects/ref-organ/brain-male/v1.4/assets/3d-allen-m-brain.glb',
    microvascular_inflammation:
      'https://cdn.humanatlas.io/digital-objects/ref-organ/spleen-male/v1.3/assets/3d-vh-m-spleen.glb',
  };

  const glbCacheDir = path.join('/tmp', 'patho3d-glb-cache');
  if (!fs.existsSync(glbCacheDir)) {
    fs.mkdirSync(glbCacheDir, { recursive: true });
  }

  app.get('/api/anatomy/glb/:archetype', async (req, res) => {
    const archetype = String(req.params.archetype ?? '');
    const remoteUrl = NIH_HRA_GLB_URLS[archetype];
    if (!remoteUrl) {
      res.status(404).json({ error: 'Unknown 3D organ archetype' });
      return;
    }

    const cachedFile = path.join(glbCacheDir, `${archetype}.glb`);
    try {
      if (fs.existsSync(cachedFile) && fs.statSync(cachedFile).size > 1024) {
        res.setHeader('Content-Type', 'model/gltf-binary');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        fs.createReadStream(cachedFile).pipe(res);
        return;
      }

      const upstream = await fetch(remoteUrl);
      if (!upstream.ok) {
        res.status(502).json({ error: `Failed to fetch NIH 3D model (${upstream.status})` });
        return;
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      fs.writeFileSync(cachedFile, buffer);

      res.setHeader('Content-Type', 'model/gltf-binary');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch {
      res.status(502).json({ error: 'Failed to load NIH 3D reference organ' });
    }
  });

  // Server-side Gemini API endpoint for clinical pathophysiology & 3D scene synthesis
  app.post('/api/pathology/analyze', async (req, res) => {
    const question = String(req.body?.question ?? '').trim();
    if (!question || question.length < 4) {
      res.status(400).json({ error: 'Please provide a valid clinical pathology question.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const synthesized = synthesizeFallbackPathologySpec(question);
      res.json({ spec: synthesized, source: 'clinical_atlas_engine' });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `You are a senior clinical pathologist, physiologist, and 3D medical visualization architect for doctors and medical students.
Given a clinical question about how a pathology affects the body and how the body reacts, return a structured 4-stage PathologyModelSpec JSON object:
- Choose organSystem from: 'cardiovascular' | 'gastrointestinal' | 'renal' | 'hepatobiliary' | 'respiratory' | 'neurological' | 'cellular_immune'
- Choose archetype3D from: 'heart_coronary' | 'liver_portal' | 'kidney_nephron' | 'gi_mucosa_ulcer' | 'lung_alveoli' | 'brain_vascular' | 'microvascular_inflammation'
- Provide exactly 4 stages (Stage 0: Healthy Baseline, Stage 1: Early Insult, Stage 2: Acute Pathogenesis & Host Reaction, Stage 3: Advanced Remodeling / Decompensation) with rigorous medical narratives, histological hallmarks, 3D sceneParams, and 4 quantitative biomarkers per stage.
- Provide 3 to 4 anatomical hotspots with 3D coordinates in [-1.2..1.2] linking affected tissue to host physiological reaction.
- Provide 4 ordered steps in compensatoryPathway.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Clinical Question: ${question}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              organSystem: { type: Type.STRING },
              archetype3D: { type: Type.STRING },
              icdCode: { type: Type.STRING },
              summary: { type: Type.STRING },
              primaryInsultSummary: { type: Type.STRING },
              hostReactionSummary: { type: Type.STRING },
              stages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stageIndex: { type: Type.INTEGER },
                    stageName: { type: Type.STRING },
                    timeCourse: { type: Type.STRING },
                    pathophysiologyNarrative: { type: Type.STRING },
                    bodyReactionNarrative: { type: Type.STRING },
                    histologicalHallmark: { type: Type.STRING },
                    sceneParams: {
                      type: Type.OBJECT,
                      properties: {
                        stenosisRatio: { type: Type.NUMBER },
                        wallHypertrophy: { type: Type.NUMBER },
                        fibrosisIntensity: { type: Type.NUMBER },
                        inflammationLevel: { type: Type.NUMBER },
                        edemaScale: { type: Type.NUMBER },
                        perfusionSpeed: { type: Type.NUMBER },
                        lesionScale: { type: Type.NUMBER },
                        hypoxiaTint: { type: Type.NUMBER },
                        cellularInfiltrateCount: { type: Type.INTEGER },
                      },
                    },
                    biomarkers: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          value: { type: Type.NUMBER },
                          unit: { type: Type.STRING },
                          referenceRange: { type: Type.STRING },
                          status: { type: Type.STRING },
                        },
                      },
                    },
                  },
                },
              },
              hotspots: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    anatomicalStructure: { type: Type.STRING },
                    position3D: {
                      type: Type.ARRAY,
                      items: { type: Type.NUMBER },
                    },
                    pathologyEffect: { type: Type.STRING },
                    bodyReaction: { type: Type.STRING },
                    histologicalFinding: { type: Type.STRING },
                    clinicalPearl: { type: Type.STRING },
                    severity: { type: Type.STRING },
                  },
                },
              },
              compensatoryPathway: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phaseTitle: { type: Type.STRING },
                    mechanismType: { type: Type.STRING },
                    trigger: { type: Type.STRING },
                    physiologicalReaction: { type: Type.STRING },
                    clinicalConsequence: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const rawJson = JSON.parse((response.text ?? '{}').trim());
      const normalized = normalizeAISpec(rawJson, question);
      res.json({ spec: normalized, source: 'gemini' });
    } catch {
      const fallback = synthesizeFallbackPathologySpec(question);
      res.json({ spec: fallback, source: 'clinical_atlas_fallback' });
    }
  });

  app.get('/manifest.webmanifest', (_req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.json({
      id: '/',
      name: 'Patho3D — Clinical Pathophysiology & Reaction Atlas',
      short_name: 'Patho3D',
      description:
        'Interactive 3D medical pathophysiology and host physiological reaction visualizer across all organ systems.',
      theme_color: '#070B12',
      background_color: '#070B12',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    // Serve a WebSocket-free /@vite/client in dev mode so Vite 8 never throws
    // createWebSocketModuleRunnerTransport WebSocket errors inside the preview iframe.
    app.get('/@vite/client', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(`
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if ("document" in globalThis) {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
let lastInsertedStyle;
export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => { lastInsertedStyle = undefined; }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement("afterend", style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document.querySelectorAll(\`link[rel="stylesheet"][data-vite-dev-id="\${CSS.escape(id)}"]\`).forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const { search, hash } = new URL(url, "http://vite.dev");
  return \`\${pathname}?\${queryToInject}\${search ? "&" + search.slice(1) : ""}\${hash || ""}\`;
}
export class ErrorOverlay extends (globalThis.HTMLElement ?? class {}) {
  close() { this.remove?.(); }
}
`);
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || PORT;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Patho3D Clinical Server listening on http://localhost:${port}`);
  });
}

startServer();
