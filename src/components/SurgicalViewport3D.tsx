import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AnatomicalHotspot,
  Archetype3D,
  PathologyStage,
  StageSceneParams,
} from '../types/pathology';
import {
  AnatomicalLayerFilter,
  buildAnatomyRig,
  BuiltAnatomyRig,
  updateAnatomyRig,
} from '../three/anatomyBuilders';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Layers,
  MapPin,
  Maximize2,
  Microscope,
  PanelRightOpen,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Sparkles,
} from 'lucide-react';

interface SurgicalViewport3DProps {
  archetype: Archetype3D;
  caseTitle: string;
  icdCode: string;
  stages: [PathologyStage, PathologyStage, PathologyStage, PathologyStage];
  scrubberValue: number;
  onScrubberChange: (val: number) => void;
  interpolatedParams: StageSceneParams;
  hotspots: AnatomicalHotspot[];
  selectedHotspotId: string;
  onSelectHotspot: (id: string) => void;
  scaleMode: 'macro' | 'micro';
  onToggleScaleMode: (mode: 'macro' | 'micro') => void;
  cutawayEnabled: boolean;
  onToggleCutaway: () => void;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
}

export type PinDisplayMode = 'documentary' | 'leader' | 'compact' | 'hidden';
export type BackdropStyleMode = 'subsurface' | 'dark_studio' | 'netter_ivory';

interface ProjectedPoint2D {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

interface DirectNerveTag {
  id: string;
  code: string;
  pos3D: [number, number, number];
}

const DIRECT_NERVE_TAGS_BY_ARCHETYPE: Record<Archetype3D, DirectNerveTag[]> = {
  heart_coronary: [
    { id: 'nt-1', code: 'V3 · Plexus', pos3D: [-0.05, 0.34, 0.62] },
    { id: 'nt-2', code: 'X (Vagus)', pos3D: [0.38, 0.18, 0.56] },
    { id: 'nt-3', code: 'T1–T4', pos3D: [-0.42, 0.08, 0.54] },
    { id: 'nt-4', code: 'IX · Sinus', pos3D: [0.38, -0.22, 0.56] },
    { id: 'nt-5', code: 'SA / AV', pos3D: [0.06, -0.08, 0.68] },
    { id: 'nt-6', code: '6th · Purkinje', pos3D: [0.22, -0.56, 0.48] },
  ],
  kidney_nephron: [
    { id: 'nt-1', code: 'T10–L1', pos3D: [-0.05, 0.34, 0.62] },
    { id: 'nt-2', code: 'X (Vagus)', pos3D: [0.38, 0.18, 0.56] },
    { id: 'nt-3', code: 'Celiac Plexus', pos3D: [-0.42, 0.08, 0.54] },
    { id: 'nt-4', code: 'Afferent · I', pos3D: [0.38, -0.22, 0.56] },
    { id: 'nt-5', code: 'Efferent · II', pos3D: [0.06, -0.08, 0.68] },
    { id: 'nt-6', code: 'Arcuate · IV', pos3D: [0.22, -0.56, 0.48] },
  ],
  liver_portal: [
    { id: 'nt-1', code: 'Phrenic (C3–C5)', pos3D: [-0.05, 0.34, 0.62] },
    { id: 'nt-2', code: 'X (Hepatic)', pos3D: [0.38, 0.18, 0.56] },
    { id: 'nt-3', code: 'Celiac (T7–T9)', pos3D: [-0.42, 0.08, 0.54] },
    { id: 'nt-4', code: 'Seg IVa', pos3D: [0.38, -0.22, 0.56] },
    { id: 'nt-5', code: 'Portal Triad', pos3D: [0.06, -0.08, 0.68] },
    { id: 'nt-6', code: 'Seg VIII', pos3D: [0.22, -0.56, 0.48] },
  ],
  lung_alveoli: [
    { id: 'nt-1', code: 'X (Bronchial)', pos3D: [-0.05, 0.34, 0.62] },
    { id: 'nt-2', code: 'T2–T5 Symp.', pos3D: [0.38, 0.18, 0.56] },
    { id: 'nt-3', code: 'Phrenic', pos3D: [-0.42, 0.08, 0.54] },
    { id: 'nt-4', code: 'Recurrent X', pos3D: [0.38, -0.22, 0.56] },
    { id: 'nt-5', code: 'Carina · III', pos3D: [0.06, -0.08, 0.68] },
    { id: 'nt-6', code: 'Alveolar · VI', pos3D: [0.22, -0.56, 0.48] },
  ],
  gi_mucosa_ulcer: [
    { id: 'nt-1', code: 'X (Anterior)', pos3D: [-0.05, 0.34, 0.62] },
    { id: 'nt-2', code: 'X (Posterior)', pos3D: [0.38, 0.18, 0.56] },
    { id: 'nt-3', code: 'T6–T9 Splanchnic', pos3D: [-0.42, 0.08, 0.54] },
    { id: 'nt-4', code: 'Meissner', pos3D: [0.38, -0.22, 0.56] },
    { id: 'nt-5', code: 'Auerbach', pos3D: [0.06, -0.08, 0.68] },
    { id: 'nt-6', code: 'Gastroduodenal', pos3D: [0.22, -0.56, 0.48] },
  ],
  brain_vascular: [
    { id: 'nt-1', code: 'V2', pos3D: [-0.05, 0.34, 0.62] },
    { id: 'nt-2', code: 'V3', pos3D: [0.06, -0.08, 0.68] },
    { id: 'nt-3', code: 'VII', pos3D: [0.38, 0.18, 0.56] },
    { id: 'nt-4', code: 'IX', pos3D: [0.38, -0.22, 0.56] },
    { id: 'nt-5', code: 'X', pos3D: [0.22, -0.56, 0.48] },
    { id: 'nt-6', code: '6th', pos3D: [-0.42, 0.08, 0.54] },
  ],
  microvascular_inflammation: [
    { id: 'nt-1', code: 'C-Fiber', pos3D: [-0.05, 0.34, 0.62] },
    { id: 'nt-2', code: 'X (Cholinergic)', pos3D: [0.38, 0.18, 0.56] },
    { id: 'nt-3', code: 'Symp. α1', pos3D: [-0.42, 0.08, 0.54] },
    { id: 'nt-4', code: 'ICAM-1', pos3D: [0.38, -0.22, 0.56] },
    { id: 'nt-5', code: 'VCAM-1', pos3D: [0.06, -0.08, 0.68] },
    { id: 'nt-6', code: 'Selectin', pos3D: [0.22, -0.56, 0.48] },
  ],
};

const _projVec = new THREE.Vector3();
const _targetFocus = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();

export const SurgicalViewport3D: React.FC<SurgicalViewport3DProps> = ({
  archetype,
  caseTitle,
  icdCode,
  stages,
  scrubberValue,
  onScrubberChange,
  interpolatedParams,
  hotspots,
  selectedHotspotId,
  onSelectHotspot,
  scaleMode,
  onToggleScaleMode,
  cutawayEnabled,
  onToggleCutaway,
  isInspectorOpen = false,
  onToggleInspector,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>({ w: 960, h: 640 });
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [stagesExpanded, setStagesExpanded] = useState(false);
  const [pinDisplayMode, setPinDisplayMode] = useState<PinDisplayMode>('documentary');
  const [backdropMode, setBackdropMode] = useState<BackdropStyleMode>('subsurface');
  const [activeLayerFilter, setActiveLayerFilter] = useState<AnatomicalLayerFilter>('all');
  const [nihSubMeshCount, setNihSubMeshCount] = useState<number>(0);
  const [zenMode, setZenMode] = useState(false);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [projectedPins, setProjectedPins] = useState<ProjectedPoint2D[]>([]);
  const [projectedNerveTags, setProjectedNerveTags] = useState<ProjectedPoint2D[]>([]);

  // Mutable refs for animation loop access without re-mounting WebGL
  const paramsRef = useRef<StageSceneParams>(interpolatedParams);
  paramsRef.current = interpolatedParams;

  const scaleModeRef = useRef<'macro' | 'micro'>(scaleMode);
  scaleModeRef.current = scaleMode;

  const cutawayRef = useRef<boolean>(cutawayEnabled);
  cutawayRef.current = cutawayEnabled;

  const activeLayerRef = useRef<AnatomicalLayerFilter>(activeLayerFilter);
  activeLayerRef.current = activeLayerFilter;

  const hotspotsRef = useRef<AnatomicalHotspot[]>(hotspots);
  hotspotsRef.current = hotspots;

  const selectedHotspotIdRef = useRef<string>(selectedHotspotId);
  selectedHotspotIdRef.current = selectedHotspotId;

  const pinDisplayModeRef = useRef<PinDisplayMode>(pinDisplayMode);
  pinDisplayModeRef.current = pinDisplayMode;

  const backdropModeRef = useRef<BackdropStyleMode>(backdropMode);
  backdropModeRef.current = backdropMode;

  const zenModeRef = useRef<boolean>(zenMode);
  zenModeRef.current = zenMode;

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const onSelectHotspotRef = useRef(onSelectHotspot);
  onSelectHotspotRef.current = onSelectHotspot;

  const archetypeRef = useRef<Archetype3D>(archetype);

  // Camera transition refs
  const cameraGoalTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, -0.05, 0));
  const cameraGoalPosRef = useRef<THREE.Vector3 | null>(null);
  const resetCameraTriggerRef = useRef<(() => void) | null>(null);
  const rebuildArchetypeRef = useRef<((arch: Archetype3D) => void) | null>(null);

  // Auto-play progression effect
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      onScrubberChange(scrubberValue >= 2.98 ? 0 : Number((scrubberValue + 0.04).toFixed(2)));
    }, 80);
    return () => window.clearInterval(interval);
  }, [isPlaying, scrubberValue, onScrubberChange]);

  // Keyboard shortcuts: 'H' dock, 'P' pins, 'Z' zen mode, 'I' inspector panel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'h') {
        setDockCollapsed((prev) => !prev);
      } else if (key === 'z') {
        setZenMode((prev) => !prev);
      } else if (key === 'p') {
        setPinDisplayMode((prev) =>
          prev === 'documentary'
            ? 'leader'
            : prev === 'leader'
            ? 'compact'
            : prev === 'compact'
            ? 'hidden'
            : 'documentary'
        );
      } else if (key === 'i' && onToggleInspector) {
        onToggleInspector();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onToggleInspector]);

  const cyclePinMode = () => {
    setPinDisplayMode((prev) =>
      prev === 'documentary'
        ? 'leader'
        : prev === 'leader'
        ? 'compact'
        : prev === 'compact'
        ? 'hidden'
        : 'documentary'
    );
  };

  const cycleBackdropMode = () => {
    setBackdropMode((prev) =>
      prev === 'subsurface'
        ? 'dark_studio'
        : prev === 'dark_studio'
        ? 'netter_ivory'
        : 'subsurface'
    );
  };

  const handleToggleLayer = (layer: AnatomicalLayerFilter) => {
    setActiveLayerFilter((prev) => (prev === layer ? 'all' : layer));
  };

  // Trigger camera glide when user explicitly selects a hotspot
  const handleHotspotButtonClick = (hsId: string) => {
    onSelectHotspot(hsId);
    const found = hotspots.find((h) => h.id === hsId);
    if (found && scaleMode === 'macro') {
      const [hx, hy, hz] = found.position3D;
      cameraGoalTargetRef.current.set(hx * 0.35, hy * 0.35, hz * 0.35);
      cameraGoalPosRef.current = new THREE.Vector3(
        hx * 0.95 + (hx >= 0 ? 0.85 : -0.85),
        hy * 0.85 + 0.45,
        Math.max(3.8, hz + 3.6)
      );
    }
  };

  // Rebuild 3D anatomy rig when archetype changes
  useEffect(() => {
    archetypeRef.current = archetype;
    if (rebuildArchetypeRef.current) {
      rebuildArchetypeRef.current(archetype);
    }
  }, [archetype]);

  // Mount Three.js WebGL scene once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 640;
    setViewportSize({ w: width, h: height });

    const scene = new THREE.Scene();
    // Transparent canvas so the radial subsurface studio gradient shows through cleanly
    scene.background = null;

    cameraGoalTargetRef.current.set(0, -0.05, 0);

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 60);
    camera.position.set(0.22, 0.25, 4.35);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment Map via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Warm Subsurface Documentary Studio Lighting Rig (matches 00:09-00:18 of reference video)
    const hemiLight = new THREE.HemisphereLight(0xfff5eb, 0x593228, 1.35);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.75);
    keyLight.position.set(3.2, 4.2, 3.8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 14;
      const d = 2.6;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfed7aa, 1.25);
    fillLight.position.set(-3.5, 1.2, 2.2);
    scene.add(fillLight);

    // Strong Warm Rim Backlight for Translucent Subsurface Skin Envelope
    const rimLight = new THREE.DirectionalLight(0xfde68a, 1.65);
    rimLight.position.set(0.0, 2.6, -3.5);
    scene.add(rimLight);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -0.05, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.1;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI * 0.85;

    controls.addEventListener('start', () => {
      cameraGoalPosRef.current = null;
    });

    resetCameraTriggerRef.current = () => {
      cameraGoalTargetRef.current.set(0, -0.05, 0);
      cameraGoalPosRef.current = new THREE.Vector3(0.22, 0.25, 4.35);
    };

    // Subtle 3D Pinpoint Nodes for Raycasting
    const hotspotGroup = new THREE.Group();
    scene.add(hotspotGroup);
    const hotspotSphereGeo = new THREE.SphereGeometry(0.026, 12, 12);
    const hotspotMeshes: THREE.Mesh[] = [];

    const syncHotspotMeshes = () => {
      hotspotMeshes.forEach((m) => {
        if (m.material instanceof THREE.Material) m.material.dispose();
        hotspotGroup.remove(m);
      });
      hotspotMeshes.length = 0;

      hotspotsRef.current.forEach((hs) => {
        const isSelected = hs.id === selectedHotspotIdRef.current;
        const mat = new THREE.MeshBasicMaterial({
          color: isSelected ? 0xfef08a : 0xffffff,
          transparent: true,
          opacity: isSelected ? 0.95 : 0.75,
        });
        const pinMesh = new THREE.Mesh(hotspotSphereGeo, mat);
        pinMesh.position.set(hs.position3D[0], hs.position3D[1], hs.position3D[2]);
        pinMesh.layers.enable(1);
        pinMesh.userData.hotspotId = hs.id;

        hotspotGroup.add(pinMesh);
        hotspotMeshes.push(pinMesh);
      });
    };

    const computeProjectedPins = () => {
      if (!container) return;
      const cw = container.clientWidth || 960;
      const ch = container.clientHeight || 640;
      camera.updateMatrixWorld();
      const maxPinY = Math.max(190, ch - 135);

      const nextProjected: ProjectedPoint2D[] = hotspotsRef.current.map((hs, idx) => {
        _projVec.set(hs.position3D[0], hs.position3D[1], hs.position3D[2]);
        _projVec.project(camera);
        const rawX = (_projVec.x * 0.5 + 0.5) * cw + (idx % 2 === 0 ? -6 : 6);
        const rawY = (-(_projVec.y * 0.5) + 0.5) * ch;
        const x = Math.max(85, Math.min(cw - 85, rawX));
        const y = Math.max(125, Math.min(maxPinY, rawY));
        const visible = _projVec.z < 1;
        return { id: hs.id, x, y, visible };
      });

      const rawNerveTags =
        DIRECT_NERVE_TAGS_BY_ARCHETYPE[archetypeRef.current] ??
        DIRECT_NERVE_TAGS_BY_ARCHETYPE.heart_coronary;
      const nextNerveTags: ProjectedPoint2D[] = rawNerveTags.map((nt) => {
        _projVec.set(nt.pos3D[0], nt.pos3D[1], nt.pos3D[2]);
        _projVec.project(camera);
        const x = (_projVec.x * 0.5 + 0.5) * cw;
        const y = (-(_projVec.y * 0.5) + 0.5) * ch;
        const visible = _projVec.z < 1 && x > 60 && x < cw - 60 && y > 120 && y < maxPinY;
        return { id: nt.id, x, y, visible };
      });

      setProjectedPins(nextProjected);
      setProjectedNerveTags(nextNerveTags);
    };

    // Build initial anatomy rig
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    setNihSubMeshCount(0);
    let activeRig: BuiltAnatomyRig = buildAnatomyRig(
      archetypeRef.current,
      maxAniso,
      isSoftwareGl,
      (count) => {
        setNihSubMeshCount(count);
        updateAnatomyRig(
          activeRig,
          paramsRef.current,
          0,
          scaleModeRef.current,
          cutawayRef.current,
          activeLayerRef.current
        );
        renderer.render(scene, camera);
      }
    );
    scene.add(activeRig.rootGroup);
    syncHotspotMeshes();
    computeProjectedPins();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    rebuildArchetypeRef.current = (newArch: Archetype3D) => {
      scene.remove(activeRig.rootGroup);
      activeRig.dispose();
      setNihSubMeshCount(0);
      activeRig = buildAnatomyRig(newArch, maxAniso, isSoftwareGl, (count) => {
        setNihSubMeshCount(count);
        updateAnatomyRig(
          activeRig,
          paramsRef.current,
          0,
          scaleModeRef.current,
          cutawayRef.current,
          activeLayerRef.current
        );
        renderer.render(scene, camera);
      });
      scene.add(activeRig.rootGroup);
      syncHotspotMeshes();
      cameraGoalTargetRef.current.set(0, -0.05, 0);
      cameraGoalPosRef.current = new THREE.Vector3(0.22, 0.25, 4.35);
      updateAnatomyRig(
        activeRig,
        paramsRef.current,
        0,
        scaleModeRef.current,
        cutawayRef.current,
        activeLayerRef.current
      );
      renderer.render(scene, camera);
      computeProjectedPins();
    };

    // Raycasting on pointer click for 3D hotspot spheres
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hotspotMeshes, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.hotspotId;
        if (hitId) {
          onSelectHotspotRef.current(hitId);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 640;
      setViewportSize({ w, h });
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
      computeProjectedPins();
    };
    window.addEventListener('resize', onResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        onResize();
      });
      resizeObserver.observe(container);
    }

    let frameId = 0;
    let disposed = false;
    const startTime = performance.now() * 0.001;
    let prevTime = startTime;
    let lastPinSyncTime = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (disposed) return;
      const now = performance.now() * 0.001;
      const dt = Math.min(now - prevTime, 0.1);
      prevTime = now;
      const elapsed = now - startTime;

      const dampFactor = 1 - Math.exp(-5.5 * dt);
      _targetFocus.copy(cameraGoalTargetRef.current);
      controls.target.lerp(_targetFocus, dampFactor);

      if (cameraGoalPosRef.current) {
        _desiredCamPos.copy(cameraGoalPosRef.current);
        camera.position.lerp(_desiredCamPos, dampFactor);
        if (camera.position.distanceTo(_desiredCamPos) < 0.04) {
          cameraGoalPosRef.current = null;
        }
      } else if (isPlayingRef.current) {
        // Gentle documentary camera turntable rotation when playing
        activeRig.macroGroup.rotation.y = Math.sin(elapsed * 0.45) * 0.32;
      }

      controls.update();

      // Hide bokeh in Netter Ivory parchment mode, show in Subsurface & Dark Studio modes
      activeRig.bokehPoints.visible = backdropModeRef.current !== 'netter_ivory';

      updateAnatomyRig(
        activeRig,
        paramsRef.current,
        elapsed,
        scaleModeRef.current,
        cutawayRef.current,
        activeLayerRef.current
      );

      hotspotGroup.visible =
        scaleModeRef.current === 'macro' &&
        !zenModeRef.current &&
        pinDisplayModeRef.current !== 'hidden';

      hotspotMeshes.forEach((pin) => {
        const isSel = pin.userData.hotspotId === selectedHotspotIdRef.current;
        const mat = pin.material as THREE.MeshBasicMaterial;
        if (isSel) {
          mat.color.setHex(0xfef08a);
          pin.scale.setScalar(1.35);
        } else {
          mat.color.setHex(0xffffff);
          pin.scale.setScalar(1.0);
        }
      });

      renderer.render(scene, camera);

      if (elapsed - lastPinSyncTime > 0.12) {
        lastPinSyncTime = elapsed;
        computeProjectedPins();
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      controls.dispose();
      activeRig.dispose();
      hotspotSphereGeo.dispose();
      renderer.dispose();
    };
  }, []);

  const activeStageIndex = Math.min(3, Math.max(0, Math.round(scrubberValue)));
  const currentStage = stages[activeStageIndex];
  const isLightPlate = backdropMode === 'netter_ivory';

  // Extract concise uppercase documentary title & subtitle (matching 00:17-00:18 of reference video)
  const docPrimaryTitle = caseTitle.split('&')[0].split(',')[0].trim().toUpperCase();
  const docSubtitle = currentStage.stageName.toUpperCase();

  const directNerveTags =
    DIRECT_NERVE_TAGS_BY_ARCHETYPE[archetype] ?? DIRECT_NERVE_TAGS_BY_ARCHETYPE.heart_coronary;

  // Compute floating label callout coordinates (left & right of the 3D organ)
  const floatingCallouts = hotspots.map((hs, idx) => {
    const proj = projectedPins.find((p) => p.id === hs.id);
    const side: 'left' | 'right' = idx % 2 === 0 ? 'left' : 'right';
    const slotRow = Math.floor(idx / 2);
    const cardWidth = Math.min(230, Math.max(175, Math.floor(viewportSize.w * 0.22)));
    const centerSpread = Math.min(360, viewportSize.w * 0.34);
    const cardX =
      side === 'left'
        ? Math.max(24, viewportSize.w * 0.5 - centerSpread - cardWidth * 0.65)
        : Math.min(viewportSize.w - cardWidth - 24, viewportSize.w * 0.5 + centerSpread - cardWidth * 0.35);
    const cardY = 185 + slotRow * 145;
    const anchorEndX = side === 'left' ? cardX + cardWidth - 8 : cardX + 8;
    const anchorEndY = cardY + 20;
    const targetX = proj ? proj.x : viewportSize.w * 0.5 + (side === 'left' ? -55 : 55);
    const targetY = proj ? proj.y : viewportSize.h * 0.48 + (slotRow === 0 ? -40 : 40);
    const elbowX =
      side === 'left'
        ? Math.min(targetX - 16, anchorEndX + 22)
        : Math.max(targetX + 16, anchorEndX - 22);

    return {
      hs,
      side,
      cardWidth,
      cardX,
      cardY,
      anchorEndX,
      anchorEndY,
      elbowX,
      targetX,
      targetY,
      visible: proj ? proj.visible : true,
    };
  });

  const layerItems: { id: AnatomicalLayerFilter; label: string }[] = [
    { id: 'bone', label: 'BONE' },
    { id: 'muscle', label: 'MUSCLE' },
    { id: 'nerve', label: 'NERVE' },
    { id: 'vessel', label: 'VESSEL' },
  ];

  const backdropGradientClass =
    backdropMode === 'subsurface'
      ? 'bg-[radial-gradient(circle_at_50%_44%,#8D675A_0%,#593D34_52%,#221613_100%)]'
      : backdropMode === 'dark_studio'
      ? 'bg-[radial-gradient(circle_at_50%_44%,#202B38_0%,#10161F_58%,#070A0F_100%)]'
      : 'bg-[#F2ECE1]';

  return (
    <section
      aria-label="3D Anatomical and Pathophysiological Viewport"
      className={`relative flex-1 min-h-[480px] lg:min-h-0 h-full w-full overflow-hidden select-none transition-colors duration-500 ${backdropGradientClass}`}
      data-testid="surgical-viewport-3d"
      data-archetype={archetype}
      data-stage={activeStageIndex}
      data-scale-mode={scaleMode}
      data-layer-filter={activeLayerFilter}
      data-nih-meshes={nihSubMeshCount}
    >
      {/* Dedicated Empty WebGL Mount Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Classic Netter Double-Ruled Border when in Netter Ivory Parchment Mode */}
      {isLightPlate && !zenMode && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2.5 border-2 border-[#8C2D19]/35 rounded-lg z-10 shadow-[inset_0_0_45px_rgba(120,80,40,0.12)]"
        >
          <div className="absolute inset-1 border border-[#785A3C]/25 rounded" />
        </div>
      )}

      {/* =====================================================================
          ICONIC TOP-CENTER DOCUMENTARY HEADER (Exact Match to 00:17–00:18 of Reference Video)
          PHARYNGEAL ARCHES / → THE DEVELOPING HEAD & NECK / BONE • MUSCLE • NERVE • VESSEL
          ===================================================================== */}
      {!zenMode && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center text-center w-[min(640px,92vw)]">
          <h1
            className={`font-display text-lg sm:text-2xl font-extrabold tracking-[0.12em] uppercase leading-tight ${
              isLightPlate
                ? 'text-[#1C1917]'
                : 'text-[#FFF7ED] drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)]'
            }`}
          >
            {docPrimaryTitle}
          </h1>

          <p
            className={`mt-0.5 text-xs sm:text-sm font-semibold tracking-[0.14em] uppercase ${
              isLightPlate
                ? 'text-[#78350F]'
                : 'text-[#FDE68A] drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]'
            }`}
          >
            → {docSubtitle}
          </p>

          {/* Thin Horizontal Editorial Divider Line */}
          <div
            className={`w-full max-w-[440px] h-px my-2 ${
              isLightPlate ? 'bg-[#78350F]/35' : 'bg-white/40 shadow-[0_1px_4px_rgba(0,0,0,0.5)]'
            }`}
          />

          {/* Interactive BONE • MUSCLE • NERVE • VESSEL Layer Filter Bar */}
          <div
            role="group"
            aria-label="Anatomical Layer Filter"
            className="pointer-events-auto flex items-center justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-bold tracking-[0.18em] uppercase"
          >
            {layerItems.map((item, idx) => {
              const isSelected = activeLayerFilter === item.id;
              return (
                <React.Fragment key={item.id}>
                  {idx > 0 && (
                    <span
                      aria-hidden="true"
                      className={isLightPlate ? 'text-[#78350F]/60' : 'text-white/55'}
                    >
                      •
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleLayer(item.id)}
                    data-testid={`layer-filter-${item.id}`}
                    aria-pressed={isSelected}
                    className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/25 text-[#FEF08A] ring-1 ring-amber-300/60 scale-105'
                        : isLightPlate
                        ? 'text-[#292524] hover:text-[#991B1B]'
                        : 'text-white/90 hover:text-[#FEF08A] drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]'
                    }`}
                  >
                    {item.label}
                  </button>
                </React.Fragment>
              );
            })}
            {activeLayerFilter !== 'all' && (
              <>
                <span aria-hidden="true" className="text-white/45">
                  •
                </span>
                <button
                  type="button"
                  onClick={() => setActiveLayerFilter('all')}
                  className="text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-white/15 text-white hover:bg-white/25 cursor-pointer"
                >
                  ALL
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Subtle Floating Corner Controls (Top-Right: Style, Callouts, Clean 3D, Clinical Drawer) */}
      <div className="pointer-events-none absolute top-4 right-4 z-20 flex items-center gap-1.5">
        <div className="pointer-events-auto flex items-center gap-1 bg-black/35 backdrop-blur-md border border-white/15 rounded-full px-2 py-1 shadow-lg">
          {!zenMode && scaleMode === 'macro' && (
            <button
              type="button"
              onClick={cyclePinMode}
              data-testid="toggle-pins-btn"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-white/90 hover:text-[#FEF08A] transition-colors cursor-pointer"
              title="Cycle Label Style: Documentary Floating Text, Margin Cards, Numbers, or Hidden (Shortcut: P)"
            >
              <MapPin className="w-3 h-3 text-amber-300" />
              <span>
                {pinDisplayMode === 'documentary'
                  ? 'Labels: Documentary'
                  : pinDisplayMode === 'leader'
                  ? 'Labels: Plate'
                  : pinDisplayMode === 'compact'
                  ? 'Labels: Numbers'
                  : 'Labels: Off'}
              </span>
            </button>
          )}

          {!zenMode && (
            <button
              type="button"
              onClick={cycleBackdropMode}
              data-testid="toggle-plate-btn"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-amber-200 hover:text-white transition-colors cursor-pointer"
              title="Cycle Studio Backdrop: Subsurface Studio Glow, Dark Studio, or Netter Ivory Plate"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>
                {backdropMode === 'subsurface'
                  ? 'Subsurface Glow'
                  : backdropMode === 'dark_studio'
                  ? 'Dark Studio'
                  : 'Netter Ivory'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setZenMode((prev) => !prev)}
            data-testid="toggle-zen-btn"
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-white/85 hover:text-white transition-colors cursor-pointer"
            title="Toggle Clean 3D View — hides all floating overlays (Shortcut: Z)"
          >
            {zenMode ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span className="hidden sm:inline">{zenMode ? 'Show HUD' : 'Clean 3D'}</span>
          </button>

          {onToggleInspector && (
            <button
              type="button"
              onClick={onToggleInspector}
              data-testid="toggle-inspector-btn"
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                isInspectorOpen
                  ? 'bg-teal-500 text-slate-950'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
              title="Open or close Clinical Telemetry & Case Library Drawer (Shortcut: I)"
            >
              {isInspectorOpen ? (
                <>
                  <Maximize2 className="w-3 h-3" />
                  <span>Close Drawer</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="w-3 h-3 text-teal-300" />
                  <span>Clinical Data</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          DIRECT ON-ANATOMY NERVE & SEGMENT TAGS (V3, V2, VII, IX, X, 6th — Matches 00:04-00:17 of Video)
          ===================================================================== */}
      {!zenMode &&
        scaleMode === 'macro' &&
        (pinDisplayMode === 'documentary' || activeLayerFilter === 'nerve') && (
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
            {directNerveTags.map((nt) => {
              const proj = projectedNerveTags.find((p) => p.id === nt.id);
              if (!proj || !proj.visible) return null;
              return (
                <div
                  key={nt.id}
                  style={{
                    left: `${proj.x}px`,
                    top: `${proj.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute font-sans text-xs sm:text-[13px] font-bold tracking-wide whitespace-nowrap ${
                    isLightPlate
                      ? 'text-[#78350F] drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]'
                      : 'text-[#FEF9C3] drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]'
                  }`}
                >
                  {nt.code}
                </div>
              );
            })}
          </div>
        )}

      {/* =====================================================================
          DOCUMENTARY FLOATING TYPOGRAPHY CALLOUTS ('documentary' mode — Zero Boxes, Zero Circles!)
          Matches "Greater petrosal VII", "Stylohyoid cranial nerve IX", "Recurrent laryngeal nerve" in Video
          ===================================================================== */}
      {!zenMode && scaleMode === 'macro' && pinDisplayMode === 'documentary' && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <svg className="pointer-events-none absolute inset-0 w-full h-full" aria-hidden="true">
            {floatingCallouts.map((item) => {
              if (!item.visible) return null;
              const isSelected = item.hs.id === selectedHotspotId;
              const isHovered = item.hs.id === hoveredPinId;
              const lineColor = isLightPlate
                ? isSelected || isHovered
                  ? '#991B1B'
                  : 'rgba(41, 37, 36, 0.65)'
                : isSelected || isHovered
                ? '#FEF08A'
                : 'rgba(255, 248, 235, 0.62)';
              const pathD = `M ${item.targetX} ${item.targetY} L ${item.elbowX} ${item.anchorEndY} L ${item.anchorEndX} ${item.anchorEndY}`;
              return (
                <g key={`doc-line-${item.hs.id}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth={isSelected || isHovered ? 1.8 : 1.15}
                  />
                  <circle
                    cx={item.targetX}
                    cy={item.targetY}
                    r={isSelected ? 4.0 : 2.8}
                    fill={isSelected ? '#FEF08A' : '#FFFFFF'}
                  />
                </g>
              );
            })}
          </svg>

          {floatingCallouts.map((item) => {
            if (!item.visible) return null;
            const { hs } = item;
            const isSelected = hs.id === selectedHotspotId;
            return (
              <button
                key={hs.id}
                type="button"
                onClick={() => handleHotspotButtonClick(hs.id)}
                onMouseEnter={() => setHoveredPinId(hs.id)}
                onMouseLeave={() => setHoveredPinId(null)}
                style={{
                  left: `${item.cardX}px`,
                  top: `${item.cardY}px`,
                  width: `${item.cardWidth}px`,
                }}
                className={`pointer-events-auto absolute ${
                  item.side === 'left' ? 'text-right pr-2' : 'text-left pl-2'
                } py-1 transition-transform duration-150 cursor-pointer ${
                  isSelected ? 'scale-105 z-20' : 'opacity-90 hover:opacity-100 z-10'
                }`}
                aria-label={`Inspect Hotspot ${hs.indexNumber}: ${hs.label}`}
                aria-pressed={isSelected}
              >
                <div
                  className={`text-xs sm:text-[13px] font-bold leading-snug tracking-wide ${
                    isLightPlate
                      ? isSelected
                        ? 'text-[#991B1B]'
                        : 'text-[#1C1917]'
                      : isSelected
                      ? 'text-[#FEF08A] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]'
                      : 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]'
                  }`}
                >
                  {hs.label}
                </div>
                <div
                  className={`text-[11px] font-medium leading-tight mt-0.5 ${
                    isLightPlate
                      ? 'text-[#57534E]'
                      : 'text-[#FDE68A]/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.95)]'
                  }`}
                >
                  {hs.anatomicalStructure}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Classic Netter Margin Plate Cards ('leader' mode) */}
      {!zenMode && scaleMode === 'macro' && pinDisplayMode === 'leader' && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <svg className="pointer-events-none absolute inset-0 w-full h-full" aria-hidden="true">
            {floatingCallouts.map((item) => {
              if (!item.visible) return null;
              const isSelected = item.hs.id === selectedHotspotId;
              const strokeColor = isLightPlate
                ? isSelected
                  ? '#991B1B'
                  : '#292524'
                : isSelected
                ? '#FEF08A'
                : '#E2E8F0';
              const pathD = `M ${item.targetX} ${item.targetY} L ${item.elbowX} ${item.anchorEndY} L ${item.anchorEndX} ${item.anchorEndY}`;
              return (
                <g key={`plate-svg-${item.hs.id}`}>
                  <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={1.5} />
                  <circle cx={item.targetX} cy={item.targetY} r={3.8} fill={strokeColor} />
                </g>
              );
            })}
          </svg>
          {floatingCallouts.map((item) => {
            if (!item.visible) return null;
            const { hs } = item;
            const isSelected = hs.id === selectedHotspotId;
            return (
              <button
                key={hs.id}
                type="button"
                onClick={() => handleHotspotButtonClick(hs.id)}
                style={{
                  left: `${item.cardX}px`,
                  top: `${item.cardY}px`,
                  width: `${item.cardWidth}px`,
                }}
                className={`pointer-events-auto absolute text-left rounded-lg px-2.5 py-1.5 shadow-md border cursor-pointer ${
                  isSelected
                    ? 'bg-[#FAF6EE] text-[#1C1917] border-[#991B1B]'
                    : 'bg-[#FAF6EE]/90 text-[#292524] border-[#C8B9A6]'
                }`}
                aria-label={`Inspect Hotspot ${hs.indexNumber}: ${hs.label}`}
                aria-pressed={isSelected}
              >
                <div className="text-xs font-bold font-serif truncate">
                  {hs.indexNumber}. {hs.label}
                </div>
                <div className="text-[10px] italic text-[#57534E] font-serif truncate">
                  {hs.anatomicalStructure}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Compact Numbered Pins ('compact' mode) */}
      {!zenMode && scaleMode === 'macro' && pinDisplayMode === 'compact' && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {hotspots.map((hs) => {
            const proj = projectedPins.find((p) => p.id === hs.id);
            if (!proj || !proj.visible) return null;
            const isSelected = hs.id === selectedHotspotId;
            return (
              <button
                key={hs.id}
                type="button"
                onClick={() => handleHotspotButtonClick(hs.id)}
                style={{
                  left: `${proj.x}px`,
                  top: `${proj.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`pointer-events-auto absolute w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer ${
                  isSelected
                    ? 'bg-amber-300 text-slate-950 ring-2 ring-white'
                    : 'bg-black/65 text-white border border-white/40'
                }`}
                aria-label={`Inspect Hotspot ${hs.indexNumber}: ${hs.label}`}
                aria-pressed={isSelected}
              >
                {hs.indexNumber}
              </button>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          DOCUMENTARY VOICEOVER NARRATION CAPTION + MINIMAL GLASSMORPHIC SCRUBBER
          ===================================================================== */}
      {!zenMode && !dockCollapsed && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(860px,94vw)] flex flex-col items-center gap-2">
          {/* Live Documentary Subtitle Caption */}
          <div
            className={`px-4 py-1.5 rounded-full text-center text-xs sm:text-[13px] font-medium max-w-[740px] truncate backdrop-blur-md ${
              isLightPlate
                ? 'bg-[#FAF6EE]/90 text-[#1C1917] border border-[#C8B9A6]'
                : 'bg-black/45 text-white/95 border border-white/15 shadow-lg'
            }`}
          >
            <span className="font-bold text-amber-300 mr-1.5">{currentStage.timeCourse}:</span>
            <span>{currentStage.pathophysiologyNarrative}</span>
          </div>

          {/* Sleek Translucent Scrubber Bar */}
          <div className="pointer-events-auto w-full rounded-2xl bg-black/55 backdrop-blur-xl border border-white/15 px-3.5 py-2 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Play/Pause + Continuous Stage Slider + S0..S3 */}
              <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="flex items-center justify-center gap-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1 text-xs font-bold transition-colors shrink-0 cursor-pointer"
                  aria-label={isPlaying ? 'Pause Progression' : 'Play Disease Progression'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Play Reel'}</span>
                </button>

                <div className="flex-1 flex flex-col gap-1 min-w-[120px]">
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/85">
                    <label htmlFor="pathology-stage-slider" className="font-semibold">
                      Stage {scrubberValue.toFixed(1)} / 3.0
                    </label>
                    <span className="text-amber-200/85 hidden sm:inline">
                      Stenosis {Math.round(interpolatedParams.stenosisRatio * 100)}% · Fibrosis{' '}
                      {Math.round(interpolatedParams.fibrosisIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    id="pathology-stage-slider"
                    type="range"
                    min={0}
                    max={3}
                    step={0.05}
                    value={scrubberValue}
                    onChange={(e) => {
                      setIsPlaying(false);
                      onScrubberChange(parseFloat(e.target.value));
                    }}
                    aria-label="Disease Progression Stage Scrubber"
                    className="stage-scrubber w-full bg-white/20 rounded-lg h-1.5"
                  />
                </div>

                <div className="hidden md:flex items-center gap-1">
                  {stages.map((st) => {
                    const isCurrent = activeStageIndex === st.stageIndex;
                    return (
                      <button
                        key={st.stageIndex}
                        type="button"
                        onClick={() => {
                          setIsPlaying(false);
                          onScrubberChange(st.stageIndex);
                        }}
                        title={`Stage ${st.stageIndex}: ${st.stageName}`}
                        className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-400 border-amber-300 text-slate-950'
                            : 'bg-white/10 border-white/15 text-white/75 hover:text-white'
                        }`}
                      >
                        S{st.stageIndex}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scale Mode (Macro / Cellular) + Cutaway + Reset + Stages */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-0.5 p-0.5 bg-white/10 rounded-full border border-white/15">
                  <button
                    type="button"
                    onClick={() => onToggleScaleMode('macro')}
                    className={`flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                      scaleMode === 'macro'
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'text-white/75 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>Macro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleScaleMode('micro')}
                    className={`flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                      scaleMode === 'micro'
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'text-white/75 hover:text-white'
                    }`}
                  >
                    <Microscope className="w-3 h-3" />
                    <span>Cellular</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onToggleCutaway}
                  aria-pressed={cutawayEnabled}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap cursor-pointer ${
                    cutawayEnabled
                      ? 'bg-amber-400/25 border-amber-300 text-amber-200'
                      : 'bg-white/10 border-white/15 text-white/80 hover:text-white'
                  }`}
                >
                  <Scissors className="w-3 h-3" />
                  <span>Peel Shell</span>
                </button>

                <button
                  type="button"
                  onClick={() => resetCameraTriggerRef.current?.()}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-white/10 border border-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                  aria-label="Reset 3D Camera View"
                  title="Reset 3D Camera View"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => setStagesExpanded((prev) => !prev)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-white/10 border border-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <span>Stages</span>
                  {stagesExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronUp className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {stagesExpanded && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2.5 pt-2.5 border-t border-white/15">
                {stages.map((st) => {
                  const isCurrent = activeStageIndex === st.stageIndex;
                  return (
                    <button
                      key={st.stageIndex}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        onScrubberChange(st.stageIndex);
                      }}
                      className={`text-left rounded-xl px-2.5 py-1.5 border transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-400/20 border-amber-300 text-white'
                          : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-semibold text-amber-300">
                        Stage {st.stageIndex}
                      </div>
                      <div className="text-xs font-medium truncate">{st.stageName}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
