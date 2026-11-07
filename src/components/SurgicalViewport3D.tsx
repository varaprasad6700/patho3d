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
import { buildAnatomyRig, BuiltAnatomyRig, updateAnatomyRig } from '../three/anatomyBuilders';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Layers,
  MapPin,
  Maximize2,
  Microscope,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  RotateCcw,
  Scissors,
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

export type PinDisplayMode = 'leader' | 'compact' | 'labels' | 'hidden';

interface ProjectedHotspotPos {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

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
  isInspectorOpen = true,
  onToggleInspector,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>({ w: 960, h: 640 });
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [stagesExpanded, setStagesExpanded] = useState(false);
  const [hudHeaderVisible, setHudHeaderVisible] = useState(true);
  const [pinDisplayMode, setPinDisplayMode] = useState<PinDisplayMode>('leader');
  const [netterPlateMode, setNetterPlateMode] = useState(true);
  const [nihSubMeshCount, setNihSubMeshCount] = useState<number>(0);
  const [zenMode, setZenMode] = useState(false);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [projectedPins, setProjectedPins] = useState<ProjectedHotspotPos[]>([]);

  // Mutable refs for animation loop access without re-mounting WebGL
  const paramsRef = useRef<StageSceneParams>(interpolatedParams);
  paramsRef.current = interpolatedParams;

  const scaleModeRef = useRef<'macro' | 'micro'>(scaleMode);
  scaleModeRef.current = scaleMode;

  const cutawayRef = useRef<boolean>(cutawayEnabled);
  cutawayRef.current = cutawayEnabled;

  const hotspotsRef = useRef<AnatomicalHotspot[]>(hotspots);
  hotspotsRef.current = hotspots;

  const selectedHotspotIdRef = useRef<string>(selectedHotspotId);
  selectedHotspotIdRef.current = selectedHotspotId;

  const pinDisplayModeRef = useRef<PinDisplayMode>(pinDisplayMode);
  pinDisplayModeRef.current = pinDisplayMode;

  const netterPlateModeRef = useRef<boolean>(netterPlateMode);
  netterPlateModeRef.current = netterPlateMode;

  const zenModeRef = useRef<boolean>(zenMode);
  zenModeRef.current = zenMode;

  const onSelectHotspotRef = useRef(onSelectHotspot);
  onSelectHotspotRef.current = onSelectHotspot;

  const archetypeRef = useRef<Archetype3D>(archetype);

  // Camera transition refs
  const cameraGoalTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, -0.1, 0));
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
          prev === 'leader'
            ? 'compact'
            : prev === 'compact'
            ? 'labels'
            : prev === 'labels'
            ? 'hidden'
            : 'leader'
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
      prev === 'leader'
        ? 'compact'
        : prev === 'compact'
        ? 'labels'
        : prev === 'labels'
        ? 'hidden'
        : 'leader'
    );
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
    const plateBg = new THREE.Color(0x110d10);
    const surgicalBg = new THREE.Color(0x070b12);
    scene.background = netterPlateModeRef.current ? plateBg : surgicalBg;
    scene.fog = new THREE.FogExp2(netterPlateModeRef.current ? 0x110d10 : 0x070b12, 0.055);

    // Camera & Target framed cleanly in the center of the viewport
    cameraGoalTargetRef.current.set(0, -0.1, 0);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 60);
    camera.position.set(0.35, 0.45, 5.1);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
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

    // Balanced 3-Point Netter Gouache / Surgical Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfde68a, 0x1e1b4b, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.55);
    keyLight.position.set(3.2, 4.5, 3.8);
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

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    fillLight.position.set(-3.5, 1.2, 2.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfda4af, 1.35);
    rimLight.position.set(0.0, 2.5, -3.6);
    scene.add(rimLight);

    // Grounded Surgical Reference Grid & Contact Shadow Disc
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const contactShadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadowGeo = new THREE.CircleGeometry(1.85, 32);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const contactShadowMesh = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadowMesh.rotation.x = -Math.PI / 2;
    contactShadowMesh.position.y = -1.52;
    scene.add(contactShadowMesh);

    const ringGeo = new THREE.RingGeometry(1.55, 1.58, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = -1.5;
    scene.add(ringMesh);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -0.1, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.4;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI * 0.85;

    controls.addEventListener('start', () => {
      cameraGoalPosRef.current = null;
    });

    resetCameraTriggerRef.current = () => {
      cameraGoalTargetRef.current.set(0, -0.1, 0);
      cameraGoalPosRef.current = new THREE.Vector3(0.35, 0.45, 5.1);
    };

    // 3D Hotspot Markers Group (Layer 1 for fast raycasting)
    const hotspotGroup = new THREE.Group();
    scene.add(hotspotGroup);
    const hotspotSphereGeo = new THREE.SphereGeometry(0.052, 16, 16);
    const hotspotHaloGeo = new THREE.RingGeometry(0.072, 0.105, 24);
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
          color: isSelected ? 0x14b8a6 : hs.severity === 'critical' ? 0xef4444 : 0xf59e0b,
        });
        const pinMesh = new THREE.Mesh(hotspotSphereGeo, mat);
        pinMesh.position.set(hs.position3D[0], hs.position3D[1], hs.position3D[2]);
        pinMesh.layers.enable(1);
        pinMesh.userData.hotspotId = hs.id;

        const haloMat = new THREE.MeshBasicMaterial({
          color: isSelected ? 0x2dd4bf : 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isSelected ? 0.85 : 0.4,
        });
        const haloMesh = new THREE.Mesh(hotspotHaloGeo, haloMat);
        pinMesh.add(haloMesh);

        hotspotGroup.add(pinMesh);
        hotspotMeshes.push(pinMesh);
      });
    };

    const computeProjectedPins = () => {
      if (!container) return;
      const cw = container.clientWidth || 960;
      const ch = container.clientHeight || 640;
      camera.updateMatrixWorld();
      const maxPinY = Math.max(180, ch - 140);
      const nextProjected: ProjectedHotspotPos[] = hotspotsRef.current.map((hs, idx) => {
        _projVec.set(hs.position3D[0], hs.position3D[1], hs.position3D[2]);
        _projVec.project(camera);
        const rawX = (_projVec.x * 0.5 + 0.5) * cw + (idx % 2 === 0 ? -8 : 8);
        const rawY = (-(_projVec.y * 0.5) + 0.5) * ch;
        const x = Math.max(80, Math.min(cw - 80, rawX));
        const y = Math.max(105, Math.min(maxPinY, rawY));
        const visible = _projVec.z < 1;
        return { id: hs.id, x, y, visible };
      });

      // Prevent vertical badge overlap when two pins project close together in compact/labels mode
      if (pinDisplayModeRef.current !== 'leader') {
        for (let i = 0; i < nextProjected.length; i++) {
          for (let j = i + 1; j < nextProjected.length; j++) {
            const a = nextProjected[i];
            const b = nextProjected[j];
            if (Math.abs(a.x - b.x) < 120 && Math.abs(a.y - b.y) < 34) {
              if (a.y <= b.y) {
                a.y = Math.max(105, a.y - 17);
                b.y = Math.min(maxPinY, b.y + 17);
              } else {
                b.y = Math.max(105, b.y - 17);
                a.y = Math.min(maxPinY, a.y + 17);
              }
            }
          }
        }
      }

      setProjectedPins(nextProjected);
    };

    // Build initial anatomy rig (loads NIH HuBMAP .glb asynchronously and applies Netter shader)
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
          cutawayRef.current
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
          cutawayRef.current
        );
        renderer.render(scene, camera);
      });
      scene.add(activeRig.rootGroup);
      syncHotspotMeshes();
      cameraGoalTargetRef.current.set(0, -0.1, 0);
      cameraGoalPosRef.current = new THREE.Vector3(0.35, 0.45, 5.1);
      updateAnatomyRig(
        activeRig,
        paramsRef.current,
        0,
        scaleModeRef.current,
        cutawayRef.current
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

    // Resize handling (both window resize and container ResizeObserver when Inspector collapses/expands)
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

    // Paced Animation Loop (uses performance.now() — zero THREE.Clock deprecation warning)
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

      // Sync Netter Plate vs Surgical Dark backdrop dynamically
      const targetBgHex = netterPlateModeRef.current ? 0x110d10 : 0x070b12;
      if ((scene.background as THREE.Color).getHex() !== targetBgHex) {
        (scene.background as THREE.Color).setHex(targetBgHex);
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.setHex(targetBgHex);
        }
      }

      // Smooth camera target & position damping
      const dampFactor = 1 - Math.exp(-5.5 * dt);
      _targetFocus.copy(cameraGoalTargetRef.current);
      controls.target.lerp(_targetFocus, dampFactor);

      if (cameraGoalPosRef.current) {
        _desiredCamPos.copy(cameraGoalPosRef.current);
        camera.position.lerp(_desiredCamPos, dampFactor);
        if (camera.position.distanceTo(_desiredCamPos) < 0.04) {
          cameraGoalPosRef.current = null;
        }
      }

      controls.update();

      // Update parametric 3D organ & cellular rig
      updateAnatomyRig(
        activeRig,
        paramsRef.current,
        elapsed,
        scaleModeRef.current,
        cutawayRef.current
      );

      // Billboard hotspot halos toward camera (hide when zenMode or pinDisplayMode === 'hidden')
      hotspotGroup.visible =
        scaleModeRef.current === 'macro' &&
        !zenModeRef.current &&
        pinDisplayModeRef.current !== 'hidden';

      hotspotMeshes.forEach((pin) => {
        const isSel = pin.userData.hotspotId === selectedHotspotIdRef.current;
        const mat = pin.material as THREE.MeshBasicMaterial;
        if (isSel) {
          mat.color.setHex(0x14b8a6);
          pin.scale.setScalar(1.25);
        } else {
          pin.scale.setScalar(1.0);
        }
        if (pin.children[0]) {
          pin.children[0].lookAt(camera.position);
        }
      });

      renderer.render(scene, camera);

      // Throttle 2D projected DOM pin coordinate updates to ~8Hz
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
      hotspotHaloGeo.dispose();
      contactShadowGeo.dispose();
      contactShadowMat.dispose();
      contactShadowTex.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
    };
  }, []);

  const activeStageIndex = Math.min(3, Math.max(0, Math.round(scrubberValue)));
  const currentStage = stages[activeStageIndex];

  // Compute Netter-style left & right margin callout slots so callout cards NEVER cover the central 3D organ
  const leaderCallouts = hotspots.map((hs, idx) => {
    const proj = projectedPins.find((p) => p.id === hs.id);
    const side: 'left' | 'right' = idx % 2 === 0 ? 'left' : 'right';
    const slotRow = Math.floor(idx / 2);
    const cardWidth = Math.min(215, Math.max(165, Math.floor(viewportSize.w * 0.22)));
    const cardX = side === 'left' ? 14 : Math.max(200, viewportSize.w - cardWidth - 14);
    const cardY = 128 + slotRow * 92;
    const anchorEndX = side === 'left' ? cardX + cardWidth : cardX;
    const anchorEndY = cardY + 26;
    const targetX = proj ? proj.x : viewportSize.w * 0.5 + (side === 'left' ? -55 : 55);
    const targetY = proj ? proj.y : viewportSize.h * 0.45 + (slotRow === 0 ? -35 : 35);
    const elbowX =
      side === 'left'
        ? Math.min(targetX - 18, anchorEndX + 26)
        : Math.max(targetX + 18, anchorEndX - 26);

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

  return (
    <section
      aria-label="3D Anatomical and Pathophysiological Viewport"
      className={`relative flex-1 min-h-[460px] lg:min-h-0 h-full w-full overflow-hidden select-none ${
        netterPlateMode ? 'bg-[#110D10]' : 'bg-[#070B12]'
      }`}
      data-testid="surgical-viewport-3d"
      data-archetype={archetype}
      data-stage={activeStageIndex}
      data-scale-mode={scaleMode}
      data-nih-meshes={nihSubMeshCount}
    >
      {/* Dedicated Empty WebGL Mount Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Top Overlay Bar: Compact Collapsible Case Title (Left) + View/Declutter Controls (Right) */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 z-20">
        {/* Left: Compact Collapsible Case Title Card */}
        {!zenMode && (
          <div className="pointer-events-auto flex items-center gap-2 bg-[#0B111E]/90 border border-slate-800/90 rounded-xl px-3 py-2 max-w-md shadow-md">
            {hudHeaderVisible ? (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-teal-400 font-semibold">{icdCode}</span>
                    <span aria-hidden="true">·</span>
                    <span>Stage {activeStageIndex}/3</span>
                    {nihSubMeshCount > 0 && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px]">
                        NIH 3D ({nihSubMeshCount})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setHudHeaderVisible(false)}
                    className="text-slate-400 hover:text-white text-[11px] px-1 rounded cursor-pointer"
                    title="Minimize title overlay"
                    aria-label="Minimize title overlay"
                  >
                    Hide
                  </button>
                </div>
                <h1 className="text-sm font-bold tracking-tight text-white truncate">
                  {caseTitle}
                </h1>
                <p className="text-[11px] text-slate-400 truncate">
                  {currentStage.stageName}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setHudHeaderVisible(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                aria-label="Show case title overlay"
              >
                <span className="font-mono text-teal-400">{icdCode}</span>
                <span>· Show Title</span>
              </button>
            )}
          </div>
        )}

        {/* Right: Quick View & Declutter Control Strip (Always accessible to hide/show overlays) */}
        <div className="pointer-events-auto ml-auto flex flex-wrap items-center gap-1.5 bg-[#0B111E]/95 border border-slate-800 rounded-xl p-1.5 shadow-lg">
          {/* 1. Hotspot Callout Mode Toggle: Netter Leader Lines / Numbers / Labels / Off */}
          {!zenMode && scaleMode === 'macro' && (
            <button
              type="button"
              onClick={cyclePinMode}
              data-testid="toggle-pins-btn"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                pinDisplayMode === 'hidden'
                  ? 'bg-slate-900 text-slate-400 hover:text-white'
                  : 'bg-teal-950/80 text-teal-300 border border-teal-500/40 hover:bg-teal-900/60'
              }`}
              title="Cycle Anatomical Callouts: Netter Margin Leader Lines, Compact Numbers, Full Labels, or Off (Shortcut: P)"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>
                Callouts:{' '}
                {pinDisplayMode === 'leader'
                  ? 'Netter Lines'
                  : pinDisplayMode === 'compact'
                  ? 'Numbers'
                  : pinDisplayMode === 'labels'
                  ? 'Pins'
                  : 'Off'}
              </span>
            </button>
          )}

          {/* 2. Netter Plate Lighting Toggle */}
          {!zenMode && (
            <button
              type="button"
              onClick={() => setNetterPlateMode((prev) => !prev)}
              data-testid="toggle-plate-btn"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                netterPlateMode
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 hover:bg-amber-900/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
              title="Toggle Netter Atlas Gouache Plate vs Dark Surgical Backdrop"
            >
              <span>{netterPlateMode ? 'Plate: Netter' : 'Plate: Dark'}</span>
            </button>
          )}

          {/* 3. Bottom Controls Toggle (H) */}
          {!zenMode && (
            <button
              type="button"
              onClick={() => setDockCollapsed((prev) => !prev)}
              data-testid="toggle-dock-btn"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                dockCollapsed
                  ? 'bg-slate-900 text-slate-400 hover:text-white'
                  : 'bg-slate-800 text-slate-200 hover:text-white'
              }`}
              title="Show or hide bottom timeline controls (Shortcut: H)"
            >
              {dockCollapsed ? (
                <ChevronUp className="w-3.5 h-3.5 text-teal-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-teal-400" />
              )}
              <span>{dockCollapsed ? 'Show Timeline' : 'Hide Timeline'}</span>
            </button>
          )}

          {/* 4. Zen / Clean 3D View Toggle (Z) */}
          <button
            type="button"
            onClick={() => setZenMode((prev) => !prev)}
            data-testid="toggle-zen-btn"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              zenMode
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
            title="Toggle Clean 3D View — hides all floating overlays (Shortcut: Z)"
          >
            {zenMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{zenMode ? 'Exit Clean 3D (Z)' : 'Clean 3D (Z)'}</span>
          </button>

          {/* 5. Right Clinical Inspector Panel Collapse/Expand Toggle (I) */}
          {onToggleInspector && (
            <button
              type="button"
              onClick={onToggleInspector}
              data-testid="toggle-inspector-btn"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                !isInspectorOpen
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-900 text-slate-300 hover:text-white'
              }`}
              title="Show or hide the right Clinical Inspector panel (Shortcut: I)"
            >
              {isInspectorOpen ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Full 3D</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="w-3.5 h-3.5" />
                  <span>Show Panel</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* OPTION 1: NETTER ATLAS MARGIN LEADER-LINE CALLOUTS ('leader' mode — zero occlusion over the 3D organ!) */}
      {!zenMode && scaleMode === 'macro' && pinDisplayMode === 'leader' && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {/* SVG Leader Lines from 3D tissue locus out to left/right margin callout plates */}
          <svg
            className="pointer-events-none absolute inset-0 w-full h-full"
            aria-hidden="true"
          >
            {leaderCallouts.map((item) => {
              if (!item.visible) return null;
              const isSelected = item.hs.id === selectedHotspotId;
              const isHovered = item.hs.id === hoveredPinId;
              const strokeColor =
                isSelected || isHovered
                  ? '#2dd4bf'
                  : item.hs.severity === 'critical'
                  ? '#f87171'
                  : '#fbbf24';
              const pathD = `M ${item.targetX} ${item.targetY} L ${item.elbowX} ${item.anchorEndY} L ${item.anchorEndX} ${item.anchorEndY}`;
              return (
                <g key={`leader-svg-${item.hs.id}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#000000"
                    strokeWidth={isSelected ? 3.5 : 2.5}
                    strokeOpacity={0.65}
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isSelected || isHovered ? 2 : 1.35}
                    strokeDasharray={isSelected ? 'none' : '3 2'}
                  />
                  <circle
                    cx={item.targetX}
                    cy={item.targetY}
                    r={isSelected ? 5 : 3.8}
                    fill={strokeColor}
                    stroke="#090D16"
                    strokeWidth={1.5}
                  />
                </g>
              );
            })}
          </svg>

          {/* Margin Callout Plates Docked on Left & Right Edges */}
          {leaderCallouts.map((item) => {
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
                className={`pointer-events-auto absolute text-left rounded-xl px-2.5 py-1.5 transition-all duration-150 shadow-lg border cursor-pointer ${
                  isSelected
                    ? 'bg-teal-950/95 text-white border-teal-400 ring-1 ring-teal-400/50 z-20'
                    : 'bg-[#0B111E]/90 text-slate-200 border-slate-800/90 hover:border-teal-400/70 hover:text-white'
                }`}
                aria-label={`Inspect Hotspot ${hs.indexNumber}: ${hs.label}`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                      isSelected
                        ? 'bg-teal-400 text-slate-950'
                        : hs.severity === 'critical'
                        ? 'bg-red-500/25 text-red-300'
                        : 'bg-amber-500/25 text-amber-300'
                    }`}
                  >
                    {hs.indexNumber}
                  </span>
                  <span className="text-xs font-semibold truncate">{hs.label}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate pl-5 mt-0.5">
                  {hs.anatomicalStructure}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Interactive 3D Projected Hotspot Markers ('compact' or 'labels' mode) */}
      {!zenMode &&
        scaleMode === 'macro' &&
        (pinDisplayMode === 'compact' || pinDisplayMode === 'labels') && (
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
            {hotspots.map((hs, idx) => {
              const proj = projectedPins.find((p) => p.id === hs.id);
              const isSelected = hs.id === selectedHotspotId;
              const isHovered = hs.id === hoveredPinId;
              const showFullText = pinDisplayMode === 'labels' || isSelected || isHovered;
              const leftStyle = proj ? `${proj.x}px` : `${32 + (idx % 2) * 34}%`;
              const topStyle = proj ? `${proj.y}px` : `${35 + idx * 11}%`;

              if (proj && !proj.visible) return null;

              return (
                <button
                  key={hs.id}
                  type="button"
                  onClick={() => handleHotspotButtonClick(hs.id)}
                  onMouseEnter={() => setHoveredPinId(hs.id)}
                  onMouseLeave={() => setHoveredPinId(null)}
                  style={{
                    left: leftStyle,
                    top: topStyle,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`pointer-events-auto absolute flex items-center gap-1.5 rounded-full transition-all duration-150 whitespace-nowrap shadow-md border cursor-pointer ${
                    showFullText ? 'px-2.5 py-1' : 'w-7 h-7 justify-center'
                  } ${
                    isSelected
                      ? 'bg-teal-600 text-white border-teal-300 scale-105 z-20'
                      : 'bg-[#0B111E]/90 text-slate-200 border-slate-700 hover:border-teal-400 hover:text-white'
                  }`}
                  aria-label={`Inspect Hotspot ${hs.indexNumber}: ${hs.label}`}
                  aria-pressed={isSelected}
                >
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[11px] font-mono font-bold ${
                      isSelected
                        ? 'bg-white text-teal-900'
                        : hs.severity === 'critical'
                        ? 'bg-red-500/25 text-red-300'
                        : 'bg-amber-500/25 text-amber-300'
                    }`}
                  >
                    {hs.indexNumber}
                  </span>
                  {showFullText && (
                    <span className="text-xs font-medium max-w-[165px] truncate">{hs.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

      {/* Sleek Collapsible Bottom Timeline & Scale Dock */}
      {!zenMode && !dockCollapsed && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(880px,94vw)] flex flex-col items-center">
          <div className="pointer-events-auto w-full rounded-2xl bg-[#0B111E]/95 border border-slate-800 px-3.5 py-2.5 shadow-2xl">
            {/* Compact Primary Control Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Play/Pause + Continuous Stage Slider + Quick Stage Pills */}
              <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white px-2.5 py-1.5 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                  aria-label={isPlaying ? 'Pause Progression' : 'Play Disease Progression'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Simulate'}</span>
                </button>

                <div className="flex-1 flex flex-col gap-1 min-w-[120px]">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <label htmlFor="pathology-stage-slider" className="text-slate-300 font-semibold">
                      Stage {scrubberValue.toFixed(1)} / 3.0
                    </label>
                    <span className="text-slate-400 hidden sm:inline">
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
                    className="stage-scrubber w-full bg-slate-800 rounded-lg h-1.5"
                  />
                </div>

                {/* Compact Stage 0..3 Buttons */}
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
                        className={`px-2 py-1 rounded-md text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-teal-600 border-teal-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        S{st.stageIndex}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scale Mode (Macro / Micro) + Cutaway + Reset + Expand Stages */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-0.5 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onToggleScaleMode('macro')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      scaleMode === 'macro'
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Macro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleScaleMode('micro')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      scaleMode === 'micro'
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Microscope className="w-3.5 h-3.5" />
                    <span>Cellular</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onToggleCutaway}
                  aria-pressed={cutawayEnabled}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                    cutawayEnabled
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Cutaway</span>
                </button>

                <button
                  type="button"
                  onClick={() => resetCameraTriggerRef.current?.()}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                  aria-label="Reset 3D Camera View"
                  title="Reset 3D Camera View"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setStagesExpanded((prev) => !prev)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Show or hide full stage descriptions"
                >
                  <span>Stages</span>
                  {stagesExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Optional Expandable 4-Stage Details Drawer */}
            {stagesExpanded && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2.5 pt-2.5 border-t border-slate-800/80">
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
                      className={`text-left rounded-lg px-2.5 py-1.5 border transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-teal-950/80 border-teal-500 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-semibold text-teal-400">
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
