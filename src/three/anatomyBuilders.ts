import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Archetype3D, StageSceneParams } from '../types/pathology';
import {
  computeAnatomicalClipPlane,
  computePathologyVisualState,
  SliceState,
} from '../utils/slicingAndProgression';

export type AnatomicalLayerFilter = 'all' | 'bone' | 'muscle' | 'nerve' | 'vessel';

export interface PathologyShaderUniforms {
  uFibrosis: { value: number };
  uHypoxia: { value: number };
  uInflammation: { value: number };
  uLesionIntensity: { value: number };
  uTime: { value: number };
  uLesionCenter: { value: THREE.Vector3 };
  uClipPlane: { value: THREE.Vector4 };
  uClipActive: { value: number };
}

export interface BuiltAnatomyRig {
  rootGroup: THREE.Group;
  macroGroup: THREE.Group;
  microGroup: THREE.Group;
  proceduralBaseGroup: THREE.Group;
  nihGlbGroup: THREE.Group;
  nerveGroup: THREE.Group;
  vesselBranchGroup: THREE.Group;
  pathologyOverlayGroup: THREE.Group;
  sliceIndicatorGroup: THREE.Group;
  clipPlane: THREE.Plane;
  organBounds: { min: [number, number, number]; max: [number, number, number] };
  pathologyUniforms: PathologyShaderUniforms;
  bokehPoints: THREE.Points;
  parenchymaMaterials: THREE.MeshPhysicalMaterial[];
  arterialMaterials: THREE.MeshPhysicalMaterial[];
  venousMaterials: THREE.MeshPhysicalMaterial[];
  nerveCoreMaterials: THREE.MeshStandardMaterial[];
  nerveHaloMaterials: THREE.MeshBasicMaterial[];
  boneStructuralMeshes: THREE.Object3D[];
  muscleParenchymaMeshes: THREE.Object3D[];
  lesionMeshes: THREE.Mesh[];
  hypertrophyMeshes: THREE.Object3D[];
  stenosisMeshes: THREE.Object3D[];
  edemaMeshes: THREE.Mesh[];
  cutawayShellMeshes: THREE.Mesh[];
  snappedArteryCurve: THREE.CatmullRomCurve3 | null;
  macroFlowInstanced: THREE.InstancedMesh;
  rbcInstanced: THREE.InstancedMesh;
  leukocyteInstanced: THREE.InstancedMesh;
  rbcPaths: THREE.CatmullRomCurve3[];
  dispose: () => void;
}

const _glbSceneCache = new Map<Archetype3D, THREE.Group>();

const _dummy = new THREE.Object3D();
const _pos = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _color = new THREE.Color();
const _healthyColor = new THREE.Color();
const _hypoxicColor = new THREE.Color(0x334155);
const _fibroticColor = new THREE.Color(0xb48a64);
const _inflamedEmissive = new THREE.Color(0xdc2626);

/**
 * Generates a zero-404 procedural Netter-style gouache & collagen striation bump/roughness texture in memory.
 */
export function createOrganicTissueTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle lobular / fascicular organic pattern
    for (let i = 0; i < 240; i++) {
      const x = (i * 73) % 256;
      const y = (i * 137) % 256;
      const r = 6 + (i % 14);
      const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
      grad.addColorStop(0, 'rgba(220, 220, 220, 0.38)');
      grad.addColorStop(0.6, 'rgba(130, 130, 130, 0.22)');
      grad.addColorStop(1, 'rgba(60, 60, 60, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fine Netter-style brush & myocardial/collagenous fiber striations
    ctx.strokeStyle = 'rgba(245, 245, 245, 0.18)';
    ctx.lineWidth = 1.25;
    for (let j = 0; j < 64; j++) {
      ctx.beginPath();
      const sy = (j * 23) % 256;
      ctx.moveTo(0, sy);
      ctx.bezierCurveTo(85, (sy + 18) % 256, 170, (sy - 18 + 256) % 256, 256, sy);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export function buildAnatomyRig(
  archetype: Archetype3D,
  maxAnisotropy: number,
  isSoftwareGl: boolean,
  onNihGlbLoaded?: (subMeshCount: number) => void
): BuiltAnatomyRig {
  const rootGroup = new THREE.Group();
  const macroGroup = new THREE.Group();
  const microGroup = new THREE.Group();
  const proceduralBaseGroup = new THREE.Group();
  const nihGlbGroup = new THREE.Group();
  const nerveGroup = new THREE.Group();
  const vesselBranchGroup = new THREE.Group();
  const pathologyOverlayGroup = new THREE.Group();
  const sliceIndicatorGroup = new THREE.Group();
  sliceIndicatorGroup.visible = false;

  macroGroup.add(proceduralBaseGroup);
  macroGroup.add(nihGlbGroup);
  macroGroup.add(vesselBranchGroup);
  macroGroup.add(nerveGroup);
  macroGroup.add(pathologyOverlayGroup);
  rootGroup.add(macroGroup);
  rootGroup.add(sliceIndicatorGroup);
  rootGroup.add(microGroup);
  microGroup.visible = false;

  // Shared hardware WebGL clipping plane for real 3D Axial / Sagittal / Coronal cross-sections
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 100);
  const activeClippingPlanes = [clipPlane];
  const organBounds: { min: [number, number, number]; max: [number, number, number] } = {
    min: [-1.05, -1.2, -0.85],
    max: [1.05, 0.95, 0.85],
  };

  // Organ-specific focal lesion epicenter in world-normalized coordinates for GLSL pathology spreading
  const lesionEpicenters: Record<Archetype3D, [number, number, number]> = {
    heart_coronary: [0.16, -0.18, 0.42],
    kidney_nephron: [0.18, 0.24, 0.36],
    liver_portal: [-0.28, 0.08, 0.38],
    gi_mucosa_ulcer: [0.06, -0.05, 0.42],
    lung_alveoli: [0.22, -0.16, 0.38],
    brain_vascular: [-0.24, 0.14, 0.38],
    microvascular_inflammation: [0.08, 0.04, 0.38],
  };
  const epic = lesionEpicenters[archetype] ?? [0.12, -0.12, 0.4];

  const pathologyUniforms: PathologyShaderUniforms = {
    uFibrosis: { value: 0.25 },
    uHypoxia: { value: 0.2 },
    uInflammation: { value: 0.35 },
    uLesionIntensity: { value: 0.35 },
    uTime: { value: 0 },
    uLesionCenter: { value: new THREE.Vector3(epic[0], epic[1], epic[2]) },
    uClipPlane: { value: new THREE.Vector4(0, 0, -1, 100) },
    uClipActive: { value: 0 },
  };

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  let isDisposed = false;

  const tissueBumpMap = createOrganicTissueTexture(maxAnisotropy);
  textures.push(tissueBumpMap);

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Visual Surgical Cross-Section Reticle Frame (ultra-thin glass tint + golden perimeter border, never clipped)
  const slicePlaneGeo = trackGeo(new THREE.PlaneGeometry(1, 1));
  const sliceGlassMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.055,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const sliceGlassMesh = new THREE.Mesh(slicePlaneGeo, sliceGlassMat);
  sliceIndicatorGroup.add(sliceGlassMesh);

  const sliceBorderGeo = trackGeo(new THREE.EdgesGeometry(slicePlaneGeo));
  const sliceBorderMat = trackMat(
    new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    })
  );
  sliceIndicatorGroup.add(new THREE.LineSegments(sliceBorderGeo, sliceBorderMat));

  // Macro Arterial Blood-Flow Bolus Particles (InstancedMesh gliding along snapped surface artery)
  const macroFlowGeo = trackGeo(new THREE.SphereGeometry(0.017, 10, 8));
  const macroFlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xff4d4d,
      emissive: new THREE.Color(0xef4444),
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.05,
      clippingPlanes: activeClippingPlanes,
    })
  );
  const macroFlowInstanced = new THREE.InstancedMesh(macroFlowGeo, macroFlowMat, 22);
  macroFlowInstanced.frustumCulled = false;
  macroFlowInstanced.visible = false;
  vesselBranchGroup.add(macroFlowInstanced);

  let snappedArteryCurve: THREE.CatmullRomCurve3 | null = null;

  const parenchymaMaterials: THREE.MeshPhysicalMaterial[] = [];
  const arterialMaterials: THREE.MeshPhysicalMaterial[] = [];
  const venousMaterials: THREE.MeshPhysicalMaterial[] = [];
  const nerveCoreMaterials: THREE.MeshStandardMaterial[] = [];
  const nerveHaloMaterials: THREE.MeshBasicMaterial[] = [];
  const boneStructuralMeshes: THREE.Object3D[] = [];
  const muscleParenchymaMeshes: THREE.Object3D[] = [];
  const lesionMeshes: THREE.Mesh[] = [];
  const hypertrophyMeshes: THREE.Object3D[] = [];
  const stenosisMeshes: THREE.Object3D[] = [];
  const edemaMeshes: THREE.Mesh[] = [];
  const cutawayShellMeshes: THREE.Mesh[] = [];
  const rbcPaths: THREE.CatmullRomCurve3[] = [];

  // Shared PBR + Netter Gouache material factories (all clipped by clipPlane)
  const makeParenchymaMat = (hexColor: number, roughness = 0.42, clearcoat = 0.65) => {
    const mat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: hexColor,
        roughness,
        metalness: 0.05,
        clearcoat: isSoftwareGl ? 0.25 : clearcoat,
        clearcoatRoughness: 0.22,
        sheen: 0.35,
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color(0xfda4af),
        bumpMap: tissueBumpMap,
        bumpScale: 0.038,
        side: THREE.DoubleSide,
        clippingPlanes: activeClippingPlanes,
      })
    );
    mat.userData.baseColorHex = hexColor;
    parenchymaMaterials.push(mat);
    return mat;
  };

  const makeArterialMat = () => {
    const mat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xdc2626,
        roughness: 0.28,
        metalness: 0.1,
        clearcoat: isSoftwareGl ? 0.2 : 0.8,
        clearcoatRoughness: 0.15,
        bumpMap: tissueBumpMap,
        bumpScale: 0.015,
        side: THREE.DoubleSide,
        clippingPlanes: activeClippingPlanes,
      })
    );
    arterialMaterials.push(mat);
    return mat;
  };

  const makeVenousMat = () => {
    const mat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x2563eb,
        roughness: 0.35,
        metalness: 0.12,
        clearcoat: isSoftwareGl ? 0.2 : 0.6,
        clearcoatRoughness: 0.2,
        side: THREE.DoubleSide,
        clippingPlanes: activeClippingPlanes,
      })
    );
    venousMaterials.push(mat);
    return mat;
  };

  const makeLesionMat = (hexColor = 0xf59e0b) =>
    trackMat(
      new THREE.MeshPhysicalMaterial({
        color: hexColor,
        roughness: 0.48,
        metalness: 0.05,
        emissive: new THREE.Color(0xd97706),
        emissiveIntensity: 0.38,
        bumpMap: tissueBumpMap,
        bumpScale: 0.05,
        side: THREE.DoubleSide,
        clippingPlanes: activeClippingPlanes,
      })
    );

  const makeEdemaMat = () =>
    trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        roughness: 0.15,
        metalness: 0.0,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        clippingPlanes: activeClippingPlanes,
      })
    );

  // -------------------------------------------------------------------------
  // ARCHETYPE 1: HEART & CORONARY ARTERIAL TREE ('heart_coronary')
  // -------------------------------------------------------------------------
  if (archetype === 'heart_coronary') {
    const myocardiumMat = makeParenchymaMat(0xb91c1c, 0.38, 0.75);
    const rvMat = makeParenchymaMat(0x991b1b, 0.48, 0.55);
    const atriumMat = makeParenchymaMat(0x7f1d1d, 0.55, 0.45);
    const aortaMat = makeArterialMat();
    const venaCavaMat = makeVenousMat();
    const plaqueMat = makeLesionMat(0xfacc15);

    const lvPoints = [
      new THREE.Vector2(0.0, -1.25),
      new THREE.Vector2(0.45, -1.05),
      new THREE.Vector2(0.88, -0.45),
      new THREE.Vector2(0.95, 0.25),
      new THREE.Vector2(0.75, 0.85),
      new THREE.Vector2(0.0, 1.05),
    ];
    const lvGeo = trackGeo(new THREE.LatheGeometry(lvPoints, 32));
    const lvMesh = new THREE.Mesh(lvGeo, myocardiumMat);
    lvMesh.position.set(0.18, -0.1, 0);
    lvMesh.rotation.z = -0.22;
    lvMesh.castShadow = !isSoftwareGl;
    proceduralBaseGroup.add(lvMesh);
    hypertrophyMeshes.push(lvMesh);

    const shellGeo = trackGeo(new THREE.SphereGeometry(0.98, 28, 24, 0, Math.PI * 0.9, 0.2, Math.PI * 0.75));
    const shellMesh = new THREE.Mesh(shellGeo, myocardiumMat.clone());
    shellMesh.position.set(0.18, -0.1, 0.06);
    shellMesh.scale.set(0.95, 1.15, 0.92);
    proceduralBaseGroup.add(shellMesh);
    cutawayShellMeshes.push(shellMesh);

    const rvGeo = trackGeo(new THREE.SphereGeometry(0.78, 28, 24));
    const rvMesh = new THREE.Mesh(rvGeo, rvMat);
    rvMesh.scale.set(0.85, 1.12, 0.78);
    rvMesh.position.set(-0.42, -0.18, 0.18);
    rvMesh.rotation.z = 0.15;
    proceduralBaseGroup.add(rvMesh);

    const laGeo = trackGeo(new THREE.SphereGeometry(0.48, 24, 20));
    const laMesh = new THREE.Mesh(laGeo, atriumMat);
    laMesh.position.set(0.48, 0.78, -0.18);
    proceduralBaseGroup.add(laMesh);

    const raMesh = new THREE.Mesh(laGeo, atriumMat);
    raMesh.position.set(-0.55, 0.72, -0.05);
    proceduralBaseGroup.add(raMesh);

    const aortaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.05, 0.75, 0.1),
      new THREE.Vector3(0.08, 1.38, 0.15),
      new THREE.Vector3(-0.18, 1.72, 0.02),
      new THREE.Vector3(-0.55, 1.52, -0.25),
    ]);
    const aortaGeo = trackGeo(new THREE.TubeGeometry(aortaCurve, 32, 0.24, 16, false));
    const aortaMesh = new THREE.Mesh(aortaGeo, aortaMat);
    proceduralBaseGroup.add(aortaMesh);
    rbcPaths.push(aortaCurve);

    const svcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.62, 0.65, -0.1),
      new THREE.Vector3(-0.68, 1.48, -0.12),
    ]);
    const svcMesh = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(svcCurve, 20, 0.18, 14, false)), venaCavaMat);
    proceduralBaseGroup.add(svcMesh);

    // Fine Netter epicardial LAD coronary vessel + focal atheroma (kept slender)
    const ladCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, 0.62, 0.42),
      new THREE.Vector3(0.16, 0.28, 0.62),
      new THREE.Vector3(0.22, -0.12, 0.68),
      new THREE.Vector3(0.26, -0.52, 0.58),
      new THREE.Vector3(0.28, -0.82, 0.38),
    ]);
    const ladGeo = trackGeo(new THREE.TubeGeometry(ladCurve, 36, 0.032, 12, false));
    const ladMesh = new THREE.Mesh(ladGeo, aortaMat);
    proceduralBaseGroup.add(ladMesh);
    stenosisMeshes.push(ladMesh);
    rbcPaths.push(ladCurve);

    const plaqueGeo = trackGeo(new THREE.SphereGeometry(0.08, 20, 16));
    const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaqueMesh.position.set(0.18, 0.22, 0.64);
    plaqueMesh.scale.set(1.1, 0.75, 0.85);
    proceduralBaseGroup.add(plaqueMesh);
    lesionMeshes.push(plaqueMesh);

    const infarctGeo = trackGeo(new THREE.SphereGeometry(0.18, 24, 20));
    const infarctMesh = new THREE.Mesh(infarctGeo, makeLesionMat(0x64748b));
    infarctMesh.position.set(0.26, -0.58, 0.52);
    infarctMesh.scale.set(1.1, 0.9, 0.65);
    proceduralBaseGroup.add(infarctMesh);
    lesionMeshes.push(infarctMesh);

    const edemaMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.32, 24, 20)), makeEdemaMat());
    edemaMesh.scale.set(1.0, 1.15, 0.9);
    proceduralBaseGroup.add(edemaMesh);
    edemaMeshes.push(edemaMesh);
  }

  // -------------------------------------------------------------------------
  // ARCHETYPE 2: HEPATIC LOBES, PORTAL VEIN & VARICES ('liver_portal')
  // -------------------------------------------------------------------------
  else if (archetype === 'liver_portal') {
    const liverMat = makeParenchymaMat(0x88292f, 0.45, 0.6);
    const leftLobeMat = makeParenchymaMat(0x7c2d12, 0.52, 0.5);
    const portalMat = makeVenousMat();
    const hepaticArtMat = makeArterialMat();
    const bileMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: 0x15803d, roughness: 0.3, metalness: 0.1, clearcoat: 0.7 })
    );
    const noduleMat = makeLesionMat(0xd97706);

    const rLobeGeo = trackGeo(new THREE.SphereGeometry(1.05, 32, 26));
    const rLobe = new THREE.Mesh(rLobeGeo, liverMat);
    rLobe.scale.set(1.15, 0.88, 0.82);
    rLobe.position.set(0.42, 0.32, 0);
    proceduralBaseGroup.add(rLobe);
    hypertrophyMeshes.push(rLobe);

    const lLobeGeo = trackGeo(new THREE.ConeGeometry(0.82, 1.55, 28));
    const lLobe = new THREE.Mesh(lLobeGeo, leftLobeMat);
    lLobe.rotation.z = -Math.PI * 0.42;
    lLobe.scale.set(1.0, 1.0, 0.68);
    lLobe.position.set(-0.62, 0.45, 0.08);
    proceduralBaseGroup.add(lLobe);
    cutawayShellMeshes.push(lLobe);

    const nodulePositions: [number, number, number, number][] = [
      [0.55, 0.52, 0.72, 0.12],
      [0.85, 0.25, 0.62, 0.14],
      [0.22, 0.68, 0.68, 0.11],
      [0.68, -0.08, 0.65, 0.13],
      [-0.35, 0.52, 0.48, 0.11],
      [0.12, 0.18, 0.75, 0.12],
    ];
    const nodGeo = trackGeo(new THREE.SphereGeometry(1, 18, 16));
    nodulePositions.forEach(([nx, ny, nz, nr]) => {
      const m = new THREE.Mesh(nodGeo, noduleMat);
      m.position.set(nx, ny, nz);
      m.scale.setScalar(nr);
      proceduralBaseGroup.add(m);
      lesionMeshes.push(m);
    });

    const portalCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, -1.25, 0.25),
      new THREE.Vector3(-0.18, -0.55, 0.35),
      new THREE.Vector3(0.08, -0.05, 0.28),
      new THREE.Vector3(0.58, 0.28, 0.18),
    ]);
    const portalMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(portalCurve, 32, 0.12, 16, false)),
      portalMat
    );
    proceduralBaseGroup.add(portalMesh);
    stenosisMeshes.push(portalMesh);
    rbcPaths.push(portalCurve);

    const varixCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.22, -0.65, 0.38),
      new THREE.Vector3(-0.75, -0.25, 0.52),
      new THREE.Vector3(-0.98, 0.28, 0.45),
      new THREE.Vector3(-0.85, 0.85, 0.38),
      new THREE.Vector3(-0.95, 1.32, 0.25),
    ]);
    const varixMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(varixCurve, 36, 0.065, 12, false)),
      portalMat
    );
    proceduralBaseGroup.add(varixMesh);
    lesionMeshes.push(varixMesh);
    rbcPaths.push(varixCurve);

    const haCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.05, -1.15, 0.42),
      new THREE.Vector3(0.02, -0.45, 0.45),
      new THREE.Vector3(0.32, 0.08, 0.38),
    ]);
    proceduralBaseGroup.add(
      new THREE.Mesh(trackGeo(new THREE.TubeGeometry(haCurve, 24, 0.055, 12, false)), hepaticArtMat)
    );
    rbcPaths.push(haCurve);

    const gbGeo = trackGeo(new THREE.CapsuleGeometry(0.14, 0.35, 12, 16));
    const gbMesh = new THREE.Mesh(gbGeo, bileMat);
    gbMesh.position.set(0.38, -0.35, 0.52);
    gbMesh.rotation.z = 0.45;
    proceduralBaseGroup.add(gbMesh);

    const ascitesMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.45, 24, 20)), makeEdemaMat());
    ascitesMesh.scale.set(1.2, 0.95, 0.85);
    proceduralBaseGroup.add(ascitesMesh);
    edemaMeshes.push(ascitesMesh);
  }

  // -------------------------------------------------------------------------
  // ARCHETYPE 3: KIDNEY, GLOMERULAR TUFT & NEPHRON ('kidney_nephron')
  // -------------------------------------------------------------------------
  else if (archetype === 'kidney_nephron') {
    const cortexMat = makeParenchymaMat(0x9f1239, 0.4, 0.65);
    const medullaMat = makeParenchymaMat(0x881337, 0.55, 0.4);
    const tubuleMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: 0xfbbf24, roughness: 0.35, metalness: 0.08, clearcoat: 0.6 })
    );
    const artMat = makeArterialMat();
    const veinMat = makeVenousMat();
    const sclerosisMat = makeLesionMat(0xf59e0b);

    const kidneyBeanCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.15, 1.05, 0),
      new THREE.Vector3(0.68, 0.55, 0),
      new THREE.Vector3(0.75, -0.45, 0),
      new THREE.Vector3(-0.15, -1.05, 0),
    ]);
    const beanGeo = trackGeo(new THREE.TubeGeometry(kidneyBeanCurve, 36, 0.68, 24, false));
    const beanMesh = new THREE.Mesh(beanGeo, cortexMat);
    beanMesh.scale.set(1.0, 1.0, 0.75);
    proceduralBaseGroup.add(beanMesh);
    hypertrophyMeshes.push(beanMesh);
    cutawayShellMeshes.push(beanMesh);

    const pyramidGeo = trackGeo(new THREE.ConeGeometry(0.26, 0.52, 16));
    const angles = [0.85, 0.42, 0.0, -0.42, -0.85];
    angles.forEach((ang) => {
      const pyr = new THREE.Mesh(pyramidGeo, medullaMat);
      pyr.position.set(0.35 + Math.cos(ang) * 0.25, Math.sin(ang) * 0.72, 0.28);
      pyr.rotation.z = ang + Math.PI / 2;
      proceduralBaseGroup.add(pyr);
    });

    const bowmanGeo = trackGeo(new THREE.SphereGeometry(0.22, 24, 20, 0, Math.PI * 1.35));
    const bowmanMesh = new THREE.Mesh(bowmanGeo, tubuleMat);
    bowmanMesh.position.set(0.32, 0.58, 0.52);
    bowmanMesh.rotation.y = -0.5;
    proceduralBaseGroup.add(bowmanMesh);

    const tuftCurve = new THREE.TorusKnotGeometry(0.11, 0.032, 48, 12, 2, 3);
    geometries.push(tuftCurve);
    const tuftMesh = new THREE.Mesh(tuftCurve, artMat);
    tuftMesh.position.set(0.32, 0.58, 0.55);
    proceduralBaseGroup.add(tuftMesh);

    const kwGeo = trackGeo(new THREE.SphereGeometry(0.09, 16, 14));
    const kw1 = new THREE.Mesh(kwGeo, sclerosisMat);
    kw1.position.set(0.35, 0.68, 0.65);
    proceduralBaseGroup.add(kw1);
    lesionMeshes.push(kw1);

    const kw2 = new THREE.Mesh(kwGeo, sclerosisMat);
    kw2.position.set(0.18, 0.52, 0.62);
    proceduralBaseGroup.add(kw2);
    lesionMeshes.push(kw2);

    const renalArtCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.25, 0.18, 0.15),
      new THREE.Vector3(-0.35, 0.12, 0.2),
      new THREE.Vector3(0.25, 0.55, 0.55),
    ]);
    const renalArtMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(renalArtCurve, 28, 0.09, 14, false)),
      artMat
    );
    proceduralBaseGroup.add(renalArtMesh);
    stenosisMeshes.push(renalArtMesh);
    rbcPaths.push(renalArtCurve);

    const renalVeinCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.22, -0.25, 0.35),
      new THREE.Vector3(-0.38, -0.12, 0.28),
      new THREE.Vector3(-1.25, -0.15, 0.25),
    ]);
    proceduralBaseGroup.add(
      new THREE.Mesh(trackGeo(new THREE.TubeGeometry(renalVeinCurve, 24, 0.11, 14, false)), veinMat)
    );
    rbcPaths.push(renalVeinCurve);

    const ureterCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.05, 0.0, 0.1),
      new THREE.Vector3(-0.35, -0.45, 0.12),
      new THREE.Vector3(-0.48, -1.35, 0.08),
    ]);
    proceduralBaseGroup.add(
      new THREE.Mesh(trackGeo(new THREE.TubeGeometry(ureterCurve, 24, 0.08, 12, false)), tubuleMat)
    );

    const edemaMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.35, 24, 20)), makeEdemaMat());
    proceduralBaseGroup.add(edemaMesh);
    edemaMeshes.push(edemaMesh);
  }

  // -------------------------------------------------------------------------
  // ARCHETYPE 4: GASTRODUODENAL WALL & PEPTIC ULCER ('gi_mucosa_ulcer')
  // -------------------------------------------------------------------------
  else if (archetype === 'gi_mucosa_ulcer') {
    const mucosaMat = makeParenchymaMat(0xe11d48, 0.35, 0.75);
    const submucosaMat = makeParenchymaMat(0xfda4af, 0.5, 0.35);
    const muscularisMat = makeParenchymaMat(0x9f1239, 0.45, 0.5);
    const craterMat = makeLesionMat(0xfacc15);
    const artMat = makeArterialMat();

    const stomachCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.45, 1.25, 0),
      new THREE.Vector3(-0.78, 0.35, 0),
      new THREE.Vector3(-0.35, -0.68, 0),
      new THREE.Vector3(0.55, -0.78, 0),
      new THREE.Vector3(0.98, -0.25, 0),
    ]);
    const outerSerosaMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(stomachCurve, 36, 0.65, 24, false)),
      muscularisMat
    );
    outerSerosaMesh.scale.set(1.0, 1.0, 0.72);
    proceduralBaseGroup.add(outerSerosaMesh);
    hypertrophyMeshes.push(outerSerosaMesh);

    const rugaeMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(stomachCurve, 32, 0.52, 20, false)),
      mucosaMat
    );
    rugaeMesh.position.set(0, 0, 0.12);
    proceduralBaseGroup.add(rugaeMesh);
    cutawayShellMeshes.push(rugaeMesh);

    const slabGeo = trackGeo(new THREE.CylinderGeometry(0.68, 0.68, 0.32, 28));
    const slabMesh = new THREE.Mesh(slabGeo, submucosaMat);
    slabMesh.rotation.x = Math.PI / 2;
    slabMesh.position.set(0.0, 0.15, 0.42);
    proceduralBaseGroup.add(slabMesh);

    const craterGeo = trackGeo(new THREE.CylinderGeometry(0.22, 0.14, 0.28, 24));
    const craterMesh = new THREE.Mesh(craterGeo, craterMat);
    craterMesh.rotation.x = Math.PI / 2;
    craterMesh.position.set(0.0, 0.18, 0.52);
    proceduralBaseGroup.add(craterMesh);
    lesionMeshes.push(craterMesh);

    const gdaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.85, 0.65, 0.55),
      new THREE.Vector3(0.0, 0.15, 0.68),
      new THREE.Vector3(0.85, -0.45, 0.55),
    ]);
    const gdaMesh = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(gdaCurve, 28, 0.06, 12, false)), artMat);
    proceduralBaseGroup.add(gdaMesh);
    stenosisMeshes.push(gdaMesh);
    rbcPaths.push(gdaCurve);

    const edemaMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.38, 24, 20)), makeEdemaMat());
    proceduralBaseGroup.add(edemaMesh);
    edemaMeshes.push(edemaMesh);
  }

  // -------------------------------------------------------------------------
  // ARCHETYPE 5: BRONCHIAL TREE & ALVEOLAR SAC CLUSTER ('lung_alveoli')
  // -------------------------------------------------------------------------
  else if (archetype === 'lung_alveoli') {
    const alveolusMat = makeParenchymaMat(0xf43f5e, 0.38, 0.65);
    const cartilageMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.05, clearcoat: 0.5 })
    );
    const artMat = makeArterialMat();
    const veinMat = makeVenousMat();
    const hyalineMat = makeLesionMat(0xfbbf24);

    const bronchusCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.45, 0),
      new THREE.Vector3(0, 0.55, 0),
      new THREE.Vector3(0.45, 0.05, 0.15),
    ]);
    const bronchusMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(bronchusCurve, 24, 0.18, 16, false)),
      cartilageMat
    );
    proceduralBaseGroup.add(bronchusMesh);
    stenosisMeshes.push(bronchusMesh);

    const leftBranch = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.55, 0),
      new THREE.Vector3(-0.48, 0.02, 0.12),
    ]);
    proceduralBaseGroup.add(
      new THREE.Mesh(trackGeo(new THREE.TubeGeometry(leftBranch, 16, 0.15, 14, false)), cartilageMat)
    );

    const sacCoords: [number, number, number, number][] = [
      [0.52, -0.15, 0.35, 0.48],
      [0.85, 0.15, 0.12, 0.42],
      [0.32, -0.58, 0.18, 0.44],
      [-0.55, -0.18, 0.32, 0.48],
      [-0.85, 0.15, 0.08, 0.42],
      [-0.35, -0.62, 0.15, 0.45],
      [0.0, -0.35, 0.45, 0.52],
    ];
    const sacGeo = trackGeo(new THREE.SphereGeometry(1, 24, 20));
    sacCoords.forEach(([sx, sy, sz, sr], idx) => {
      const m = new THREE.Mesh(sacGeo, alveolusMat);
      m.position.set(sx, sy, sz);
      m.scale.setScalar(sr);
      proceduralBaseGroup.add(m);
      hypertrophyMeshes.push(m);
      if (idx === 6) cutawayShellMeshes.push(m);
    });

    const hyGeo = trackGeo(new THREE.SphereGeometry(0.24, 20, 16));
    const hyMesh1 = new THREE.Mesh(hyGeo, hyalineMat);
    hyMesh1.position.set(0.42, 0.15, 0.58);
    proceduralBaseGroup.add(hyMesh1);
    lesionMeshes.push(hyMesh1);

    const capCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.05, 0.45, 0.45),
      new THREE.Vector3(-0.45, -0.25, 0.72),
      new THREE.Vector3(0.0, -0.45, 0.85),
      new THREE.Vector3(0.55, -0.22, 0.72),
      new THREE.Vector3(1.05, 0.45, 0.45),
    ]);
    proceduralBaseGroup.add(new THREE.Mesh(trackGeo(new THREE.TubeGeometry(capCurve, 36, 0.05, 12, false)), artMat));
    proceduralBaseGroup.add(
      new THREE.Mesh(
        trackGeo(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(-0.95, -0.65, 0.35),
              new THREE.Vector3(0.0, 0.25, 0.65),
              new THREE.Vector3(0.95, -0.65, 0.35),
            ]),
            28,
            0.05,
            12,
            false
          )
        ),
        veinMat
      )
    );
    rbcPaths.push(capCurve);

    const edemaMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.38, 24, 20)), makeEdemaMat());
    proceduralBaseGroup.add(edemaMesh);
    edemaMeshes.push(edemaMesh);
  }

  // -------------------------------------------------------------------------
  // ARCHETYPE 6: CEREBRAL HEMISPHERES & MCA VASCULATURE ('brain_vascular')
  // -------------------------------------------------------------------------
  else if (archetype === 'brain_vascular') {
    const cortexMat = makeParenchymaMat(0xfda4af, 0.48, 0.55);
    const leftHemMat = makeParenchymaMat(0xfb7185, 0.52, 0.45);
    const artMat = makeArterialMat();
    const thrombusMat = makeLesionMat(0xef4444);

    const hemGeo = trackGeo(new THREE.SphereGeometry(0.88, 32, 26));
    const rightHem = new THREE.Mesh(hemGeo, cortexMat);
    rightHem.scale.set(0.78, 0.95, 1.22);
    rightHem.position.set(0.52, 0.18, 0);
    proceduralBaseGroup.add(rightHem);
    hypertrophyMeshes.push(rightHem);
    cutawayShellMeshes.push(rightHem);

    const leftHem = new THREE.Mesh(hemGeo, leftHemMat);
    leftHem.scale.set(0.78, 0.95, 1.22);
    leftHem.position.set(-0.52, 0.18, 0);
    proceduralBaseGroup.add(leftHem);

    const stemMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.24, 0.18, 0.85, 20)),
      leftHemMat
    );
    stemMesh.position.set(0, -0.75, -0.15);
    proceduralBaseGroup.add(stemMesh);

    const mcaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, -0.65, 0.35),
      new THREE.Vector3(0.18, -0.32, 0.65),
      new THREE.Vector3(0.68, -0.05, 0.78),
      new THREE.Vector3(0.95, 0.38, 0.52),
      new THREE.Vector3(0.78, 0.78, 0.15),
    ]);
    const mcaMesh = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(mcaCurve, 36, 0.06, 14, false)), artMat);
    proceduralBaseGroup.add(mcaMesh);
    stenosisMeshes.push(mcaMesh);
    rbcPaths.push(mcaCurve);

    const penumbraMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.32, 24, 20)), thrombusMat);
    penumbraMesh.position.set(0.78, 0.12, 0.55);
    penumbraMesh.scale.set(0.85, 0.95, 0.9);
    proceduralBaseGroup.add(penumbraMesh);
    lesionMeshes.push(penumbraMesh);

    const edemaMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.42, 24, 20)), makeEdemaMat());
    proceduralBaseGroup.add(edemaMesh);
    edemaMeshes.push(edemaMesh);
  }

  // -------------------------------------------------------------------------
  // ARCHETYPE 7: MICROVASCULAR & ENDOTHELIAL REACTION ('microvascular_inflammation')
  // -------------------------------------------------------------------------
  else {
    const vesselWallMat = makeParenchymaMat(0xbe123c, 0.38, 0.7);
    const glycocalyxMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x14b8a6,
        roughness: 0.25,
        metalness: 0.05,
        transparent: true,
        opacity: 0.55,
      })
    );
    const thrombusMat = makeLesionMat(0xf59e0b);

    const microVesselCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.55, 0.0, 0.0),
      new THREE.Vector3(-0.55, 0.15, 0.12),
      new THREE.Vector3(0.55, -0.12, 0.08),
      new THREE.Vector3(1.55, 0.0, 0.0),
    ]);
    const outerWall = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(microVesselCurve, 36, 0.68, 24, false)),
      vesselWallMat
    );
    proceduralBaseGroup.add(outerWall);
    hypertrophyMeshes.push(outerWall);
    cutawayShellMeshes.push(outerWall);

    const glycocalyxLayer = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(microVesselCurve, 32, 0.56, 20, false)),
      glycocalyxMat
    );
    proceduralBaseGroup.add(glycocalyxLayer);
    stenosisMeshes.push(glycocalyxLayer);

    const netThrombus = new THREE.Mesh(trackGeo(new THREE.TorusKnotGeometry(0.28, 0.08, 36, 12)), thrombusMat);
    netThrombus.position.set(0.35, -0.08, 0.25);
    proceduralBaseGroup.add(netThrombus);
    lesionMeshes.push(netThrombus);

    rbcPaths.push(microVesselCurve);

    const edemaMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.48, 24, 20)), makeEdemaMat());
    proceduralBaseGroup.add(edemaMesh);
    edemaMeshes.push(edemaMesh);
  }

  // -------------------------------------------------------------------------
  // SHARED MICRO / HISTOLOGICAL CROSS-SECTION STAGE (microGroup)
  // -------------------------------------------------------------------------
  const microEndotheliumMat = makeParenchymaMat(0xbe123c, 0.4, 0.65);
  const microBasementMat = trackMat(
    new THREE.MeshPhysicalMaterial({ color: 0xd97706, roughness: 0.55, metalness: 0.05 })
  );
  const microLesionMat = makeLesionMat(0xfacc15);

  const troughGeo = trackGeo(new THREE.CylinderGeometry(0.75, 0.75, 2.8, 28, 1, true, 0, Math.PI * 1.25));
  const troughMesh = new THREE.Mesh(troughGeo, microEndotheliumMat);
  troughMesh.rotation.z = Math.PI / 2;
  troughMesh.rotation.x = Math.PI * 0.65;
  microGroup.add(troughMesh);

  const bmGeo = trackGeo(new THREE.CylinderGeometry(0.84, 0.84, 2.8, 24, 1, true, 0, Math.PI * 1.15));
  const bmMesh = new THREE.Mesh(bmGeo, microBasementMat);
  bmMesh.rotation.z = Math.PI / 2;
  bmMesh.rotation.x = Math.PI * 0.65;
  microGroup.add(bmMesh);
  hypertrophyMeshes.push(bmMesh);

  const microLesionGeo = trackGeo(new THREE.SphereGeometry(0.45, 24, 20));
  const microLesion = new THREE.Mesh(microLesionGeo, microLesionMat);
  microLesion.position.set(0.15, -0.25, 0.25);
  microLesion.scale.set(1.3, 0.85, 0.9);
  microGroup.add(microLesion);
  lesionMeshes.push(microLesion);

  const microFlowCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.35, 0.05, 0.15),
    new THREE.Vector3(-0.45, 0.12, 0.25),
    new THREE.Vector3(0.45, 0.15, 0.25),
    new THREE.Vector3(1.35, 0.05, 0.15),
  ]);
  rbcPaths.push(microFlowCurve);

  // -------------------------------------------------------------------------
  // INSTANCED MESH 1 & 2: Flowing Red Blood Cells & Leukocytes (placed in microGroup / proceduralBaseGroup so they don't clutter the Netter macro illustration!)
  // -------------------------------------------------------------------------
  const rbcCount = 90;
  const rbcGeo = trackGeo(new THREE.SphereGeometry(0.042, 12, 10));
  rbcGeo.scale(1.2, 0.55, 1.2);
  const rbcMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      roughness: 0.3,
      metalness: 0.05,
      clearcoat: 0.6,
    })
  );
  const rbcInstanced = new THREE.InstancedMesh(rbcGeo, rbcMat, rbcCount);
  rbcInstanced.frustumCulled = false;
  microGroup.add(rbcInstanced);

  const maxLeukocytes = 160;
  const leukoGeo = trackGeo(new THREE.IcosahedronGeometry(0.038, 1));
  const leukoMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.05,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.35,
    })
  );
  const leukocyteInstanced = new THREE.InstancedMesh(leukoGeo, leukoMat, maxLeukocytes);
  leukocyteInstanced.frustumCulled = false;
  for (let i = 0; i < maxLeukocytes; i++) {
    const tint = i % 3 === 0 ? new THREE.Color(0xfbbf24) : new THREE.Color(0xe0f2fe);
    leukocyteInstanced.setColorAt(i, tint);
  }
  if (leukocyteInstanced.instanceColor) {
    leukocyteInstanced.instanceColor.needsUpdate = true;
  }
  microGroup.add(leukocyteInstanced);

  const finalizeTrackedScales = () => {
    lesionMeshes.forEach((m) => {
      if (!m.userData.baseScale) m.userData.baseScale = m.scale.clone();
    });
    hypertrophyMeshes.forEach((m) => {
      if (!m.userData.baseScale) m.userData.baseScale = m.scale.clone();
    });
    stenosisMeshes.forEach((m) => {
      if (!m.userData.baseScale) m.userData.baseScale = m.scale.clone();
    });
  };
  finalizeTrackedScales();

  // -------------------------------------------------------------------------
  // CINEMATIC DEPTH-OF-FIELD BOKEH PARTICLES & BIOLUMINESCENT NERVE ARBORIZATION
  // -------------------------------------------------------------------------
  const bokehCanvas = document.createElement('canvas');
  bokehCanvas.width = 64;
  bokehCanvas.height = 64;
  const bCtx = bokehCanvas.getContext('2d');
  if (bCtx) {
    const grad = bCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 248, 235, 0.95)');
    grad.addColorStop(0.45, 'rgba(253, 224, 171, 0.55)');
    grad.addColorStop(0.8, 'rgba(245, 180, 145, 0.15)');
    grad.addColorStop(1, 'rgba(245, 180, 145, 0)');
    bCtx.fillStyle = grad;
    bCtx.fillRect(0, 0, 64, 64);
  }
  const bokehTex = new THREE.CanvasTexture(bokehCanvas);
  textures.push(bokehTex);

  const bokehCount = isSoftwareGl ? 56 : 90;
  const bokehPositions = new Float32Array(bokehCount * 3);
  for (let i = 0; i < bokehCount; i++) {
    const angle = i * 2.39996;
    const dist = 1.45 + ((i * 37) % 100) * 0.024;
    bokehPositions[i * 3] = Math.cos(angle) * dist * 1.35;
    bokehPositions[i * 3 + 1] = (((i * 53) % 100) / 50 - 1) * 2.2;
    bokehPositions[i * 3 + 2] = -0.85 - ((i * 29) % 100) * 0.025;
  }
  const bokehGeo = trackGeo(new THREE.BufferGeometry());
  bokehGeo.setAttribute('position', new THREE.BufferAttribute(bokehPositions, 3));
  const bokehMat = trackMat(
    new THREE.PointsMaterial({
      map: bokehTex,
      size: 0.24,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const bokehPoints = new THREE.Points(bokehGeo, bokehMat);
  rootGroup.add(bokehPoints);

  // Helper to create a delicate bioluminescent golden nerve filament + subtle aura
  const addNerveBranch = (pts: THREE.Vector3[], radius: number, phaseOffset: number) => {
    if (pts.length < 2) return;
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    const segs = Math.max(18, pts.length * 7);
    const coreGeo = trackGeo(new THREE.TubeGeometry(curve, segs, radius, 7, false));
    const coreMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: new THREE.Color(0xeab308),
        emissiveIntensity: 0.72,
        roughness: 0.28,
        metalness: 0.05,
        clippingPlanes: activeClippingPlanes,
      })
    );
    coreMat.userData.phaseOffset = phaseOffset;
    nerveCoreMaterials.push(coreMat);
    nerveGroup.add(new THREE.Mesh(coreGeo, coreMat));

    const haloGeo = trackGeo(new THREE.TubeGeometry(curve, Math.max(14, pts.length * 5), radius * 2.1, 7, false));
    const haloMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        clippingPlanes: activeClippingPlanes,
      })
    );
    haloMat.userData.phaseOffset = phaseOffset;
    nerveHaloMaterials.push(haloMat);
    nerveGroup.add(new THREE.Mesh(haloGeo, haloMat));
  };

  // Surface-snaps organ-specific nerve arborizations and vascular trunks directly onto the real NIH .glb meshes
  const buildSurfaceSnappedNervesAndVessels = (
    targetMeshes: THREE.Mesh[],
    normBox: THREE.Box3
  ) => {
    const normCenter = new THREE.Vector3();
    const normSize = new THREE.Vector3();
    normBox.getCenter(normCenter);
    normBox.getSize(normSize);
    const halfX = Math.max(0.2, normSize.x * 0.5);
    const halfY = Math.max(0.2, normSize.y * 0.5);
    const halfZ = Math.max(0.2, normSize.z * 0.5);

    const surfaceRaycaster = new THREE.Raycaster();
    const rayOrigin = new THREE.Vector3();
    const rayTarget = new THREE.Vector3();
    const rayDir = new THREE.Vector3();

    const snapToSurface = (
      fx: number,
      fy: number,
      fz: number,
      normalOffset: number
    ): THREE.Vector3 | null => {
      const tx = normCenter.x + fx * halfX;
      const ty = normCenter.y + fy * halfY;
      const tz = normCenter.z + fz * halfZ;
      rayTarget.set(tx * 0.35 + normCenter.x * 0.65, ty, normCenter.z - halfZ * 0.15);
      // Cast from outside the anterior/lateral silhouette inward toward the organ core
      rayOrigin.set(
        tx + fx * 0.55,
        ty + fy * 0.18,
        normCenter.z + Math.max(halfZ * 2.1, 1.8) * (fz >= 0 ? 1 : -1)
      );
      rayDir.subVectors(rayTarget, rayOrigin).normalize();
      surfaceRaycaster.set(rayOrigin, rayDir);

      const hits = surfaceRaycaster.intersectObjects(targetMeshes, false);
      if (hits.length === 0) return null;

      const hit = hits[0];
      const outDir = rayDir.clone().negate();
      return hit.point.clone().addScaledVector(outDir, normalOffset);
    };

    const snapCurve = (
      fracPts: [number, number, number][],
      offset: number
    ): THREE.Vector3[] => {
      const snapped: THREE.Vector3[] = [];
      for (const [fx, fy, fz] of fracPts) {
        const pt = snapToSurface(fx, fy, fz, offset);
        if (pt) {
          // Avoid duplicate points too close together
          if (snapped.length === 0 || snapped[snapped.length - 1].distanceTo(pt) > 0.03) {
            snapped.push(pt);
          }
        }
      }
      return snapped;
    };

    // Organ-specific normalized surface coordinates ([fx, fy, fz] in [-1..1] of organ bounding box)
    const organTrunkSpecs: Record<Archetype3D, [number, number, number][][]> = {
      heart_coronary: [
        // Anterior Interventricular (LAD) Autonomic Plexus
        [
          [-0.08, 0.56, 0.8],
          [-0.02, 0.32, 0.9],
          [0.06, 0.06, 0.9],
          [0.14, -0.22, 0.85],
          [0.20, -0.48, 0.75],
          [0.24, -0.68, 0.6],
        ],
        // Left Circumflex / Lateral Vagal Plexus
        [
          [0.24, 0.46, 0.7],
          [0.42, 0.24, 0.8],
          [0.52, -0.02, 0.75],
          [0.48, -0.30, 0.7],
          [0.36, -0.54, 0.65],
        ],
        // Right Marginal / Sympathetic Plexus
        [
          [-0.28, 0.44, 0.75],
          [-0.44, 0.16, 0.8],
          [-0.44, -0.14, 0.8],
          [-0.32, -0.42, 0.75],
          [-0.14, -0.62, 0.7],
        ],
      ],
      kidney_nephron: [
        // Renal Hilum -> Upper & Lower Polar Autonomic Plexus
        [
          [-0.18, 0.06, 0.85],
          [-0.04, 0.28, 0.9],
          [0.10, 0.50, 0.85],
          [0.16, 0.68, 0.75],
        ],
        [
          [-0.18, 0.02, 0.85],
          [0.08, 0.08, 0.9],
          [0.28, 0.14, 0.85],
          [0.42, 0.22, 0.75],
        ],
        [
          [-0.18, -0.06, 0.85],
          [-0.02, -0.28, 0.9],
          [0.12, -0.50, 0.85],
          [0.18, -0.68, 0.75],
        ],
      ],
      liver_portal: [
        // Porta Hepatis -> Right Lobe Hepatic Plexus
        [
          [0.0, -0.12, 0.85],
          [-0.22, 0.04, 0.9],
          [-0.46, 0.18, 0.85],
          [-0.66, 0.28, 0.75],
        ],
        // Porta Hepatis -> Dome / Phrenic Surface
        [
          [0.02, -0.10, 0.85],
          [-0.08, 0.16, 0.9],
          [-0.20, 0.42, 0.85],
          [-0.32, 0.60, 0.75],
        ],
        // Porta Hepatis -> Left Lobe Plexus
        [
          [0.04, -0.08, 0.85],
          [0.26, 0.06, 0.9],
          [0.48, 0.16, 0.85],
          [0.64, 0.22, 0.75],
        ],
      ],
      lung_alveoli: [
        // Right Pulmonary Hilum -> Superior/Inferior Bronchial Plexus
        [
          [-0.14, 0.12, 0.85],
          [-0.34, 0.34, 0.85],
          [-0.50, 0.52, 0.75],
        ],
        [
          [-0.14, 0.02, 0.85],
          [-0.38, -0.18, 0.85],
          [-0.54, -0.44, 0.75],
        ],
        // Left Pulmonary Hilum -> Bronchial Plexus
        [
          [0.14, 0.08, 0.85],
          [0.36, 0.26, 0.85],
          [0.52, -0.16, 0.8],
          [0.48, -0.48, 0.75],
        ],
      ],
      gi_mucosa_ulcer: [
        [
          [-0.42, 0.42, 0.85],
          [-0.12, 0.28, 0.9],
          [0.18, 0.14, 0.9],
          [0.44, 0.02, 0.85],
        ],
        [
          [-0.38, -0.12, 0.85],
          [-0.08, -0.22, 0.9],
          [0.22, -0.32, 0.9],
          [0.44, -0.44, 0.85],
        ],
      ],
      brain_vascular: [
        [
          [-0.16, 0.54, 0.85],
          [-0.04, 0.26, 0.9],
          [0.10, -0.02, 0.9],
          [0.22, -0.34, 0.85],
        ],
        [
          [0.18, 0.50, 0.85],
          [0.36, 0.22, 0.9],
          [0.44, -0.10, 0.85],
          [0.32, -0.40, 0.8],
        ],
        [
          [-0.36, 0.36, 0.85],
          [-0.46, 0.06, 0.9],
          [-0.38, -0.26, 0.85],
        ],
      ],
      microvascular_inflammation: [
        [
          [-0.18, 0.46, 0.85],
          [0.02, 0.18, 0.9],
          [0.16, -0.12, 0.9],
          [0.10, -0.46, 0.85],
        ],
        [
          [-0.32, 0.16, 0.85],
          [-0.12, -0.04, 0.9],
          [0.24, -0.18, 0.85],
        ],
      ],
    };

    const trunks = organTrunkSpecs[archetype] ?? organTrunkSpecs.heart_coronary;

    trunks.forEach((fracPts, tIdx) => {
      const snappedTrunk = snapCurve(fracPts, 0.014);
      if (snappedTrunk.length < 2) return;
      addNerveBranch(snappedTrunk, 0.0046, tIdx * 1.1);

      // Sprout short secondary filaments that are ALSO surface-snapped so zero branches float in air!
      for (let i = 1; i < fracPts.length - 1; i++) {
        const [bx, by, bz] = fracPts[i];
        const side = (i + tIdx) % 2 === 0 ? 1 : -1;
        const branchFracs: [number, number, number][] = [
          [bx, by, bz],
          [bx + side * 0.14, by - 0.08, bz],
          [bx + side * 0.24, by - 0.16, bz],
        ];
        const snappedBranch = snapCurve(branchFracs, 0.013);
        if (snappedBranch.length >= 2) {
          addNerveBranch(snappedBranch, 0.0024, tIdx + i * 0.55);
        }
      }
    });

    // Surface-snapped arterial (crimson) and venous (sapphire) vessels tracing the organ's primary sulcus
    const arterialFracs = trunks[0];
    const venousFracs = trunks[trunks.length - 1];

    const arterialPts = snapCurve(
      arterialFracs.map(([x, y, z]) => [x + 0.04, y, z] as [number, number, number]),
      0.018
    );
    if (arterialPts.length >= 2) {
      const artCurve = new THREE.CatmullRomCurve3(arterialPts, false, 'centripetal', 0.5);
      snappedArteryCurve = artCurve;
      macroFlowInstanced.visible = true;
      const artGeo = trackGeo(new THREE.TubeGeometry(artCurve, 32, 0.0105, 10, false));
      const artMesh = new THREE.Mesh(artGeo, makeArterialMat());
      artMesh.userData.baseScale = artMesh.scale.clone();
      stenosisMeshes.push(artMesh);
      vesselBranchGroup.add(artMesh);

      // Surface-snapped focal pathology lesions (atheroma / fibrin thrombus / cortical nodules / fibrotic plaques)
      const plaqueHex =
        archetype === 'heart_coronary'
          ? 0xfacc15
          : archetype === 'kidney_nephron'
          ? 0xe7d3b0
          : archetype === 'liver_portal'
          ? 0xd6b078
          : archetype === 'gi_mucosa_ulcer'
          ? 0x991b1b
          : 0xe5a95c;
      const plaqueMat = makeLesionMat(plaqueHex);
      const thrombusMat = makeLesionMat(0x7f1d1d);

      // Anchor primary focal lesion right along the proximal/mid arterial territory
      const lesionSamples = [0.28, 0.36, 0.44, 0.55];
      lesionSamples.forEach((u, idx) => {
        const pt = artCurve.getPointAt(u);
        const radius = idx === 1 ? 0.052 : 0.036;
        const geo = trackGeo(new THREE.IcosahedronGeometry(radius, 2));
        const mat = idx === 2 ? thrombusMat : plaqueMat;
        const deposit = new THREE.Mesh(geo, mat);
        deposit.position.copy(pt);
        deposit.scale.set(1.15, 0.72, 0.95);
        deposit.userData.baseScale = deposit.scale.clone();
        deposit.userData.isSurfacePathology = true;
        pathologyOverlayGroup.add(deposit);
        lesionMeshes.push(deposit);
      });

      // Set shader epicenter directly to the real snapped focal lesion point so ischemic/fibrotic halo radiates from it!
      const epicPt = artCurve.getPointAt(0.42);
      pathologyUniforms.uLesionCenter.value.copy(epicPt);
    }

    const venousPts = snapCurve(
      venousFracs.map(([x, y, z]) => [x - 0.04, y, z] as [number, number, number]),
      0.017
    );
    if (venousPts.length >= 2) {
      const venCurve = new THREE.CatmullRomCurve3(venousPts, false, 'centripetal', 0.5);
      const venGeo = trackGeo(new THREE.TubeGeometry(venCurve, 32, 0.0085, 10, false));
      vesselBranchGroup.add(new THREE.Mesh(venGeo, makeVenousMat()));
    }
  };

  // -------------------------------------------------------------------------
  // CUSTOM GLSL SUBSURFACE MUSCLE-FIBER + LIVE PATHOLOGY + CROSS-SECTION SHADER
  // -------------------------------------------------------------------------
  const attachNetterPenAndGouacheShader = (
    mat: THREE.MeshPhysicalMaterial,
    fiberFreq = 64.0,
    isSulcusOrFibrous = false
  ) => {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uFibrosis = pathologyUniforms.uFibrosis;
      shader.uniforms.uHypoxia = pathologyUniforms.uHypoxia;
      shader.uniforms.uInflammation = pathologyUniforms.uInflammation;
      shader.uniforms.uLesionIntensity = pathologyUniforms.uLesionIntensity;
      shader.uniforms.uTime = pathologyUniforms.uTime;
      shader.uniforms.uLesionCenter = pathologyUniforms.uLesionCenter;
      shader.uniforms.uClipPlane = pathologyUniforms.uClipPlane;
      shader.uniforms.uClipActive = pathologyUniforms.uClipActive;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vNetterObjPos;
         varying vec3 vNetterWorldPos;
         varying vec3 vNetterWorldNormal;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vNetterObjPos = position;
         vNetterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
         vNetterWorldNormal = normalize(normalMatrix * normal);`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uFibrosis;
         uniform float uHypoxia;
         uniform float uInflammation;
         uniform float uLesionIntensity;
         uniform float uTime;
         uniform vec3 uLesionCenter;
         uniform vec4 uClipPlane;
         uniform float uClipActive;
         varying vec3 vNetterObjPos;
         varying vec3 vNetterWorldPos;
         varying vec3 vNetterWorldNormal;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         // 1. High-Contrast Parallel Anatomical Muscle-Fiber & Fascia Striations
         vec3 p = vNetterObjPos * ${fiberFreq.toFixed(1)};
         float fiberWave = sin(p.x * 1.85 + p.y * 1.35 + sin(p.z * 1.45) * 1.6);
         float fineFascia = cos(p.y * 3.8 - p.z * 2.1);
         float striation = smoothstep(-0.55, 0.65, fiberWave * 0.62 + fineFascia * 0.38);

         vec3 fasciaHighlight = ${
           isSulcusOrFibrous ? 'vec3(0.96, 0.90, 0.76)' : 'vec3(0.93, 0.58, 0.49)'
         };
         vec3 deepFascicle = ${
           isSulcusOrFibrous ? 'vec3(0.45, 0.34, 0.24)' : 'vec3(0.22, 0.04, 0.04)'
         };
         gl_FragColor.rgb = mix(
           mix(gl_FragColor.rgb, deepFascicle, 0.40),
           mix(gl_FragColor.rgb, fasciaHighlight, 0.30),
           striation
         );

         // 2. Live Stage-Driven Pathophysiology Surface Transformation (Stage 0 -> Stage 3)
         ${
           isSulcusOrFibrous
             ? ''
             : `
         float distToLesion = length(vNetterWorldPos - uLesionCenter);
         float organicWarp = sin(vNetterWorldPos.x * 9.5 + vNetterWorldPos.y * 7.2) * 0.09
                           + cos(vNetterWorldPos.z * 8.4 - vNetterWorldPos.y * 5.8) * 0.07;
         float warpedDist = distToLesion + organicWarp;

         // Expanding focal ischemic / necrotic / fibrotic territory
         float lesionRadius = 0.18 + uLesionIntensity * 0.62;
         float coreMask = smoothstep(lesionRadius, lesionRadius * 0.22, warpedDist) * uLesionIntensity;
         // Hyperemic inflammatory border halo right around the expanding lesion
         float borderRing = smoothstep(lesionRadius + 0.16, lesionRadius * 0.75, warpedDist)
                          * smoothstep(lesionRadius * 0.28, lesionRadius * 0.72, warpedDist)
                          * uInflammation;

         // Diffuse interstitial fibrotic collagen streaks across parenchyma
         float scarVein = smoothstep(0.62, 0.92, sin(vNetterWorldPos.x * 16.0 + sin(vNetterWorldPos.y * 12.0) * 2.1));
         vec3 fibroticScarColor = vec3(0.84, 0.76, 0.62);
         vec3 ischemicNecrosisColor = vec3(0.32, 0.24, 0.28);
         vec3 hyperemicBorderColor = vec3(0.92, 0.16, 0.12);

         // Shift tissue toward fibrotic pale collagen + dusky hypoxic core as Stage climbs
         vec3 lesionBlend = mix(ischemicNecrosisColor, fibroticScarColor, uFibrosis * 0.72);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, lesionBlend, coreMask * 0.72);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, fibroticScarColor, scarVein * uFibrosis * 0.38);

         // Pulsing acute inflammatory hyperemia around the active border zone
         float inflamPulse = 0.75 + 0.25 * sin(uTime * 3.4);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, hyperemicBorderColor, borderRing * 0.58 * inflamPulse);

         // Global hypoxic cyanotic desaturation tint at severe decompensation
         vec3 cyanoticTone = vec3(0.24, 0.26, 0.38);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, cyanoticTone, uHypoxia * 0.32);
         `
         }

         // 3. Interior Cross-Section Backface & Surgical Cut-Edge Rim Shading (when sliced!)
         if (!gl_FrontFacing) {
           // Distinct deep muscular cross-section interior tone so sliced chambers read clearly
           vec3 innerCutTone = ${
             isSulcusOrFibrous ? 'vec3(0.58, 0.49, 0.38)' : 'vec3(0.42, 0.12, 0.12)'
           };
           float lamellae = 0.88 + 0.12 * sin(vNetterWorldPos.y * 24.0 + vNetterWorldPos.x * 18.0);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, innerCutTone * lamellae, 0.62);
         }

         if (uClipActive > 0.5) {
           float clipDist = abs(dot(vNetterWorldPos, uClipPlane.xyz) + uClipPlane.w);
           float cutRim = smoothstep(0.036, 0.004, clipDist);
           vec3 surgicalEdgeColor = vec3(0.99, 0.84, 0.52);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, surgicalEdgeColor, cutRim * 0.78);
         }

         // 4. Smooth Anatomical Cavity Shading + Warm Subsurface Fresnel Rim
         vec3 viewDir = normalize(vViewPosition);
         vec3 nrm = normalize(vNormal);
         float ndotv = abs(dot(nrm, viewDir));
         float cavityShade = smoothstep(0.08, 0.65, ndotv);
         gl_FragColor.rgb *= mix(0.76, 1.04, cavityShade);

         float sssRim = pow(1.0 - ndotv, 2.6);
         vec3 warmSubsurface = ${
           isSulcusOrFibrous ? 'vec3(0.98, 0.92, 0.80)' : 'vec3(0.98, 0.70, 0.56)'
         };
         gl_FragColor.rgb = mix(gl_FragColor.rgb, warmSubsurface, sssRim * 0.34);`
      );
    };
    mat.needsUpdate = true;
  };

  // -------------------------------------------------------------------------
  // NIH HuBMAP Reference Organ .GLB Loader & Subsurface Layer Classification
  // -------------------------------------------------------------------------
  const applyNetterShaderToNihScene = (rawScene: THREE.Group) => {
    if (isDisposed) return;
    const glbClone = rawScene.clone(true);

    glbClone.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(glbClone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const targetSpan = archetype === 'gi_mucosa_ulcer' ? 2.25 : 2.12;
    const normScale = targetSpan / maxDim;

    const wrapper = new THREE.Group();
    glbClone.position.set(
      -center.x * normScale,
      -center.y * normScale - 0.14,
      -center.z * normScale
    );
    glbClone.scale.setScalar(normScale);
    wrapper.add(glbClone);
    wrapper.updateMatrixWorld(true);

    // Ghosted Translucent Soft Peach-Flesh Subsurface Outer Envelope (opacity 0.13 so deep muscles & valves are vivid!)
    const outerCapsuleMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf2bba6,
        emissive: new THREE.Color(0x4a1d15),
        emissiveIntensity: 0.12,
        roughness: 0.32,
        metalness: 0.0,
        clearcoat: 0.35,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
        side: THREE.DoubleSide,
        clippingPlanes: activeClippingPlanes,
      })
    );
    outerCapsuleMat.userData.baseColorHex = 0xf2bba6;
    outerCapsuleMat.userData.isOuterEnvelope = true;
    parenchymaMaterials.push(outerCapsuleMat);

    // Sculpted Bone / Cartilage / Valve Warm Ivory Material (matches skull/mandible/hyoid in video)
    const fibrousValveMat = makeParenchymaMat(0xe5cfa8, 0.38, 0.25);
    fibrousValveMat.userData.isBoneOrValve = true;
    attachNetterPenAndGouacheShader(fibrousValveMat, 54.0, true);

    let meshIndex = 0;
    const allMeshes: THREE.Mesh[] = [];
    const innerSolidMeshes: THREE.Mesh[] = [];
    glbClone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        allMeshes.push(child as THREE.Mesh);
      }
    });

    allMeshes.forEach((mesh) => {
      meshIndex++;
      if (!mesh.geometry.attributes.normal) {
        mesh.geometry.computeVertexNormals();
      }
      const rawName = `${mesh.name || ''} ${mesh.parent?.name || ''}`.toLowerCase();

      const isOuterShell =
        allMeshes.length > 1 &&
        (rawName.includes('heart_right_ventricle') ||
          rawName.includes('right_cardiac_atrium') ||
          rawName.includes('kidney_capsule') ||
          rawName.includes('outer_cortex_of_kidney') ||
          rawName.includes('liver_capsule') ||
          rawName.includes('diaphragmatic_surface') ||
          rawName.includes('bare_area') ||
          rawName.includes('bronchopulmonary_segment'));

      const isFibrousOrValve =
        rawName.includes('valve') ||
        rawName.includes('ligament') ||
        rawName.includes('hilum') ||
        rawName.includes('papilla') ||
        rawName.includes('ampulla') ||
        rawName.includes('sphincter') ||
        rawName.includes('cartilage') ||
        rawName.includes('porta_hepatis') ||
        rawName.includes('optic_chiasm');

      const isPapillaryOrColumnOrBronchus =
        rawName.includes('papillary_muscle') ||
        rawName.includes('renal_column') ||
        rawName.includes('septum') ||
        rawName.includes('caudate') ||
        rawName.includes('bronchus');

      if (isOuterShell) {
        mesh.material = outerCapsuleMat;
        cutawayShellMeshes.push(mesh);
      } else if (isFibrousOrValve) {
        mesh.material = fibrousValveMat;
        boneStructuralMeshes.push(mesh);
        innerSolidMeshes.push(mesh);
      } else if (isPapillaryOrColumnOrBronchus) {
        const subMat = makeParenchymaMat(0xb83b34, 0.40, 0.35);
        attachNetterPenAndGouacheShader(subMat, 76.0, false);
        mesh.material = subMat;
        mesh.userData.baseScale = mesh.scale.clone();
        hypertrophyMeshes.push(mesh);
        muscleParenchymaMeshes.push(mesh);
        innerSolidMeshes.push(mesh);
      } else {
        // Rich, Deep Striated Anatomical Muscle & Parenchyma Palette
        const palette =
          archetype === 'liver_portal'
            ? [0x942b24, 0x80221c, 0xa6362e, 0x701c17, 0xb24138]
            : archetype === 'kidney_nephron'
            ? [0x9e2d2b, 0xb03a37, 0x87211f, 0xbd4642]
            : archetype === 'gi_mucosa_ulcer'
            ? [0xc44b47, 0xb03c38, 0xd15c58, 0x9c302c]
            : archetype === 'lung_alveoli'
            ? [0xc45458, 0xb04145, 0xd1666a]
            : archetype === 'brain_vascular'
            ? [0xd98f80, 0xc77b6b, 0xe39f91, 0xb56959]
            : [0xa32926, 0x8c1f1c, 0xb53632, 0x7a1816];
        const hex = palette[meshIndex % palette.length];
        const subMat = makeParenchymaMat(hex, 0.42, 0.32);
        attachNetterPenAndGouacheShader(subMat, 64.0 + (meshIndex % 5) * 7.0, false);
        mesh.material = subMat;
        mesh.userData.baseScale = mesh.scale.clone();
        hypertrophyMeshes.push(mesh);
        muscleParenchymaMeshes.push(mesh);
        innerSolidMeshes.push(mesh);
      }
    });

    nihGlbGroup.add(wrapper);
    // Record real normalized organ bounds for tight Axial / Sagittal / Coronal cross-section slicing
    const normBox = new THREE.Box3().setFromObject(wrapper);
    organBounds.min = [normBox.min.x, normBox.min.y, normBox.min.z];
    organBounds.max = [normBox.max.x, normBox.max.y, normBox.max.z];

    // Snap organ-specific nerves, vessels, arterial flow, and focal lesions onto the actual normalized NIH meshes
    const snapTargets = innerSolidMeshes.length > 0 ? innerSolidMeshes : allMeshes;
    buildSurfaceSnappedNervesAndVessels(snapTargets, normBox);

    proceduralBaseGroup.visible = false;
    onNihGlbLoaded?.(allMeshes.length);
  };

  if (typeof window !== 'undefined') {
    const cachedScene = _glbSceneCache.get(archetype);
    if (cachedScene) {
      applyNetterShaderToNihScene(cachedScene);
    } else {
      const loader = new GLTFLoader();
      loader.load(
        `/api/anatomy/glb/${archetype}`,
        (gltf) => {
          if (gltf?.scene) {
            _glbSceneCache.set(archetype, gltf.scene);
            applyNetterShaderToNihScene(gltf.scene);
          }
        },
        undefined,
        () => {
          // Fallback: keep proceduralBaseGroup visible if offline
        }
      );
    }
  }

  const dispose = () => {
    isDisposed = true;
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    rootGroup,
    macroGroup,
    microGroup,
    proceduralBaseGroup,
    nihGlbGroup,
    nerveGroup,
    vesselBranchGroup,
    pathologyOverlayGroup,
    sliceIndicatorGroup,
    clipPlane,
    organBounds,
    pathologyUniforms,
    bokehPoints,
    parenchymaMaterials,
    arterialMaterials,
    venousMaterials,
    nerveCoreMaterials,
    nerveHaloMaterials,
    boneStructuralMeshes,
    muscleParenchymaMeshes,
    lesionMeshes,
    hypertrophyMeshes,
    stenosisMeshes,
    edemaMeshes,
    cutawayShellMeshes,
    get snappedArteryCurve() {
      return snappedArteryCurve;
    },
    macroFlowInstanced,
    rbcInstanced,
    leukocyteInstanced,
    rbcPaths,
    dispose,
  };
}

const DEFAULT_SLICE_STATE: SliceState = { axis: 'off', depth: 0.08, flip: false };

/**
 * Updates the 3D rig per-frame based on interpolated stage parameters, elapsed time,
 * anatomical layer filtering, and interactive 3D cross-section slicing.
 */
export function updateAnatomyRig(
  rig: BuiltAnatomyRig,
  params: StageSceneParams,
  elapsedTime: number,
  scaleMode: 'macro' | 'micro',
  cutawayEnabled: boolean,
  activeLayerFilter: AnatomicalLayerFilter = 'all',
  sliceState: SliceState = DEFAULT_SLICE_STATE
): void {
  rig.macroGroup.visible = scaleMode === 'macro';
  rig.microGroup.visible = scaleMode === 'micro';

  const visual = computePathologyVisualState(params);

  // 0. Real-Time 3D Cross-Section Clipping Plane (Axial / Sagittal / Coronal)
  const effectiveSlice: SliceState =
    scaleMode === 'macro' ? sliceState : DEFAULT_SLICE_STATE;
  const computedPlane = computeAnatomicalClipPlane(
    effectiveSlice,
    rig.organBounds.min,
    rig.organBounds.max
  );

  rig.clipPlane.setComponents(
    computedPlane.normal[0],
    computedPlane.normal[1],
    computedPlane.normal[2],
    computedPlane.constant
  );
  rig.pathologyUniforms.uClipPlane.value.set(
    computedPlane.normal[0],
    computedPlane.normal[1],
    computedPlane.normal[2],
    computedPlane.constant
  );
  rig.pathologyUniforms.uClipActive.value = computedPlane.active ? 1.0 : 0.0;

  rig.sliceIndicatorGroup.visible = computedPlane.active;
  if (computedPlane.active) {
    rig.sliceIndicatorGroup.position.set(
      computedPlane.indicatorPos[0],
      computedPlane.indicatorPos[1],
      computedPlane.indicatorPos[2]
    );
    rig.sliceIndicatorGroup.rotation.set(
      computedPlane.indicatorEuler[0],
      computedPlane.indicatorEuler[1],
      computedPlane.indicatorEuler[2]
    );
    rig.sliceIndicatorGroup.scale.set(
      computedPlane.indicatorSize[0],
      computedPlane.indicatorSize[1],
      1
    );
  }

  // Push live disease progression uniforms into all NIH organ shaders
  rig.pathologyUniforms.uFibrosis.value = visual.fibrosisShader;
  rig.pathologyUniforms.uHypoxia.value = visual.hypoxiaShader;
  rig.pathologyUniforms.uInflammation.value = visual.inflammationShader;
  rig.pathologyUniforms.uLesionIntensity.value = visual.lesionIntensity;
  rig.pathologyUniforms.uTime.value = elapsedTime;

  // 1. Physiological organ pulsation (elastic at Stage 0 -> stiff & rapid tachycardia at Stage 3)
  const pulseScale =
    1 + Math.sin(elapsedTime * visual.pulseFrequency * Math.PI * 2) * visual.pulseAmplitude;
  rig.macroGroup.scale.setScalar(pulseScale);

  // 2. Floating Depth-of-Field Bokeh Gentle Drift
  rig.bokehPoints.rotation.y = Math.sin(elapsedTime * 0.14) * 0.08;
  rig.bokehPoints.position.y = Math.cos(elapsedTime * 0.18) * 0.06;

  // 3. Interactive Documentary Layer Filtering (BONE • MUSCLE • NERVE • VESSEL)
  rig.cutawayShellMeshes.forEach((mesh) => {
    mesh.visible = !cutawayEnabled;
    if (mesh.material instanceof THREE.MeshPhysicalMaterial && mesh.material.userData.isOuterEnvelope) {
      mesh.material.opacity =
        activeLayerFilter === 'all' || activeLayerFilter === 'muscle' ? 0.13 : 0.16;
    }
  });

  rig.boneStructuralMeshes.forEach((obj) => {
    obj.visible = activeLayerFilter === 'all' || activeLayerFilter === 'bone';
  });

  rig.muscleParenchymaMeshes.forEach((obj) => {
    obj.visible = activeLayerFilter === 'all' || activeLayerFilter === 'muscle';
  });

  rig.vesselBranchGroup.visible = activeLayerFilter === 'all' || activeLayerFilter === 'vessel';
  rig.nerveGroup.visible = activeLayerFilter === 'all' || activeLayerFilter === 'nerve';
  rig.pathologyOverlayGroup.visible =
    activeLayerFilter === 'all' || activeLayerFilter === 'muscle' || activeLayerFilter === 'vessel';

  // 4. Bioluminescent Golden Nerve Signaling Pulse
  const nerveBoost =
    activeLayerFilter === 'nerve'
      ? 1.75
      : 0.55 + params.inflammationLevel * 0.55 + params.stenosisRatio * 0.30;
  rig.nerveCoreMaterials.forEach((mat) => {
    const phase = mat.userData.phaseOffset ?? 0;
    const wave = 0.5 + 0.5 * Math.sin(elapsedTime * 3.2 - phase);
    mat.emissiveIntensity = (0.45 + wave * 0.75) * nerveBoost;
  });
  rig.nerveHaloMaterials.forEach((mat) => {
    const phase = mat.userData.phaseOffset ?? 0;
    const wave = 0.5 + 0.5 * Math.sin(elapsedTime * 3.2 - phase);
    mat.opacity = Math.min(0.45, (0.08 + wave * 0.16) * nerveBoost);
  });

  // 5. Parenchyma tissue color, fibrosis roughness & inflammatory emissive shift
  rig.parenchymaMaterials.forEach((mat) => {
    if (mat.userData.isOuterEnvelope || mat.userData.isBoneOrValve) return;
    _healthyColor.setHex(mat.userData.baseColorHex ?? 0xbd4b47);
    _color.copy(_healthyColor);
    _color.lerp(_fibroticColor, visual.fibrosisShader * 0.45);
    _color.lerp(_hypoxicColor, visual.hypoxiaShader * 0.48);
    mat.color.copy(_color);

    mat.roughness = 0.34 + visual.fibrosisShader * 0.42;
    mat.bumpScale = 0.024 + visual.fibrosisShader * 0.075;
    mat.emissive.copy(_inflamedEmissive);
    mat.emissiveIntensity = visual.inflammationShader * 0.22;
  });

  // 6. Focal Lesion / Atheroma / Nodule / Thrombus growth (invisible at Stage 0, vivid by Stage 3)
  const lesionFactor = Math.max(0.15, 0.25 + visual.lesionIntensity * 1.15);
  rig.lesionMeshes.forEach((mesh, idx) => {
    const base: THREE.Vector3 = mesh.userData.baseScale ?? new THREE.Vector3(1, 1, 1);
    const jitter = 1 + Math.sin(elapsedTime * 2.6 + idx) * 0.035 * visual.inflammationShader;
    mesh.scale.copy(base).multiplyScalar(lesionFactor * jitter);
    mesh.visible = visual.lesionIntensity > 0.08;
  });

  // 7. Wall hypertrophy scaling relative to baseScale
  const hyperFactor = 1 + params.wallHypertrophy * 0.08;
  rig.hypertrophyMeshes.forEach((obj) => {
    const base: THREE.Vector3 = obj.userData.baseScale ?? new THREE.Vector3(1, 1, 1);
    obj.scale.copy(base).multiplyScalar(hyperFactor);
  });

  // 8. Arterial vessel stenosis narrowing relative to baseScale
  rig.stenosisMeshes.forEach((obj) => {
    const base: THREE.Vector3 = obj.userData.baseScale ?? new THREE.Vector3(1, 1, 1);
    obj.scale.set(
      base.x * (0.65 + visual.stenosisRadiusFactor * 0.35),
      base.y,
      base.z * (0.65 + visual.stenosisRadiusFactor * 0.35)
    );
  });

  // 8b. Animated Macro Arterial Blood-Flow Boluses along snapped surface artery (slows & bottlenecks with stenosis!)
  if (scaleMode === 'macro' && rig.snappedArteryCurve && rig.vesselBranchGroup.visible) {
    const flowCount = rig.macroFlowInstanced.count;
    const stenosis = params.stenosisRatio;
    for (let i = 0; i < flowCount; i++) {
      let u = ((i / flowCount) + elapsedTime * 0.24 * visual.flowSpeed) % 1;
      // Visually simulate proximal blood-flow congestion & post-stenotic trickle when stenosis is severe
      if (stenosis > 0.35 && u > 0.25 && u < 0.52) {
        u = 0.25 + (u - 0.25) * (1 - stenosis * 0.45);
      }
      rig.snappedArteryCurve.getPointAt(Math.max(0.01, Math.min(0.99, u)), _pos);
      const bolusScale = (u > 0.48 && stenosis > 0.5 ? 0.55 : 0.95) * (0.75 + 0.25 * Math.sin(elapsedTime * 5 + i));
      _dummy.position.copy(_pos);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.setScalar(bolusScale);
      _dummy.updateMatrix();
      rig.macroFlowInstanced.setMatrixAt(i, _dummy.matrix);
    }
    rig.macroFlowInstanced.instanceMatrix.needsUpdate = true;
    rig.macroFlowInstanced.computeBoundingSphere();
  }

  // 9. Edema / Ascites halo envelope
  rig.edemaMeshes.forEach((mesh) => {
    mesh.visible = params.edemaScale > 0.12;
    const edScale = 0.92 + params.edemaScale * 0.16;
    mesh.scale.setScalar(edScale);
    const mat = mesh.material as THREE.MeshPhysicalMaterial;
    mat.opacity = params.edemaScale * 0.16;
  });

  // 10. Flowing Red Blood Cells along vascular curves (in Cellular micro view)
  const rbcCount = rig.rbcInstanced.count;
  const paths = rig.rbcPaths;
  if (paths.length > 0 && scaleMode === 'micro') {
    for (let i = 0; i < rbcCount; i++) {
      const path = paths[i % paths.length];
      const u = ((i / rbcCount) + elapsedTime * 0.22 * params.perfusionSpeed) % 1;
      path.getPointAt(u, _pos);
      path.getTangentAt(u, _tangent);

      const radialAngle = i * 2.39996;
      const radialDist = 0.035 * (1 - params.stenosisRatio * 0.55);
      _pos.x += Math.cos(radialAngle) * radialDist;
      _pos.y += Math.sin(radialAngle) * radialDist;

      _quat.setFromUnitVectors(_up, _tangent.normalize());
      _dummy.position.copy(_pos);
      _dummy.quaternion.copy(_quat);
      _dummy.scale.setScalar(1.0);
      _dummy.updateMatrix();
      rig.rbcInstanced.setMatrixAt(i, _dummy.matrix);
    }
    rig.rbcInstanced.instanceMatrix.needsUpdate = true;
    rig.rbcInstanced.computeBoundingSphere();
  }

  // 11. Immune Leukocyte / Cytokine infiltrate cloud (in Cellular micro view)
  if (scaleMode === 'micro') {
    const activeLeukocytes = Math.min(rig.leukocyteInstanced.count, params.cellularInfiltrateCount);
    for (let i = 0; i < rig.leukocyteInstanced.count; i++) {
      if (i >= activeLeukocytes) {
        _dummy.position.set(0, -999, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        rig.leukocyteInstanced.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      const seed = i * 1.6180339;
      const theta = seed * Math.PI * 2 + elapsedTime * (0.25 + params.inflammationLevel * 0.45);
      const phi = Math.acos(2 * ((seed * 0.73) % 1) - 1);
      const radius = 0.35 + ((i % 17) / 17) * 0.65;

      _dummy.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta) * 0.85,
        radius * Math.cos(phi)
      );
      _dummy.rotation.set(elapsedTime + i, elapsedTime * 0.7, i);
      const cellScale = 0.75 + (i % 5) * 0.14 + params.inflammationLevel * 0.25;
      _dummy.scale.setScalar(cellScale);
      _dummy.updateMatrix();
      rig.leukocyteInstanced.setMatrixAt(i, _dummy.matrix);
    }
    rig.leukocyteInstanced.instanceMatrix.needsUpdate = true;
    rig.leukocyteInstanced.computeBoundingSphere();
  }
}
