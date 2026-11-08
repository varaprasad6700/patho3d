import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Archetype3D, StageSceneParams } from '../types/pathology';

export interface BuiltAnatomyRig {
  rootGroup: THREE.Group;
  macroGroup: THREE.Group;
  microGroup: THREE.Group;
  proceduralBaseGroup: THREE.Group;
  nihGlbGroup: THREE.Group;
  parenchymaMaterials: THREE.MeshPhysicalMaterial[];
  arterialMaterials: THREE.MeshPhysicalMaterial[];
  venousMaterials: THREE.MeshPhysicalMaterial[];
  lesionMeshes: THREE.Mesh[];
  hypertrophyMeshes: THREE.Object3D[];
  stenosisMeshes: THREE.Object3D[];
  edemaMeshes: THREE.Mesh[];
  cutawayShellMeshes: THREE.Mesh[];
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
  macroGroup.add(proceduralBaseGroup);
  macroGroup.add(nihGlbGroup);
  rootGroup.add(macroGroup);
  rootGroup.add(microGroup);
  microGroup.visible = false;

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

  const parenchymaMaterials: THREE.MeshPhysicalMaterial[] = [];
  const arterialMaterials: THREE.MeshPhysicalMaterial[] = [];
  const venousMaterials: THREE.MeshPhysicalMaterial[] = [];
  const lesionMeshes: THREE.Mesh[] = [];
  const hypertrophyMeshes: THREE.Object3D[] = [];
  const stenosisMeshes: THREE.Object3D[] = [];
  const edemaMeshes: THREE.Mesh[] = [];
  const cutawayShellMeshes: THREE.Mesh[] = [];
  const rbcPaths: THREE.CatmullRomCurve3[] = [];

  // Shared PBR + Netter Gouache material factories
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
      })
    );
    venousMaterials.push(mat);
    return mat;
  };

  const makeLesionMat = (hexColor = 0xf59e0b) =>
    trackMat(
      new THREE.MeshPhysicalMaterial({
        color: hexColor,
        roughness: 0.55,
        metalness: 0.05,
        emissive: new THREE.Color(0xd97706),
        emissiveIntensity: 0.35,
        bumpMap: tissueBumpMap,
        bumpScale: 0.05,
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
  // CUSTOM GLSL NETTER GOUACHE + PEN-AND-INK CROSS-HATCHING SHADER HOOK
  // -------------------------------------------------------------------------
  const attachNetterPenAndGouacheShader = (
    mat: THREE.MeshPhysicalMaterial,
    fiberFreq = 48.0,
    isSulcusOrFibrous = false
  ) => {
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vNetterObjPos;
         varying vec3 vNetterWorldNormal;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vNetterObjPos = position;
         vNetterWorldNormal = normalize(normalMatrix * normal);`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vNetterObjPos;
         varying vec3 vNetterWorldNormal;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         // 1. Directional Netter Gouache Muscle Fiber / Lobular Striations
         vec3 p = vNetterObjPos * ${fiberFreq.toFixed(1)};
         float fiberWave = sin(p.x * 1.3 + p.y * 0.9 + sin(p.z * 1.4) * 1.8);
         float secondaryWave = cos(p.y * 2.1 - p.z * 1.2);
         float gouacheStroke = smoothstep(-0.6, 0.7, fiberWave * 0.65 + secondaryWave * 0.35);

         // Warm gouache pigment variation (carmine shadow <-> warm cadmium/ochre highlight)
         vec3 warmHighlight = ${
           isSulcusOrFibrous ? 'vec3(0.98, 0.91, 0.76)' : 'vec3(0.95, 0.58, 0.45)'
         };
         vec3 deepShadow = vec3(0.18, 0.04, 0.05);
         gl_FragColor.rgb = mix(gl_FragColor.rgb * 0.86, mix(gl_FragColor.rgb, warmHighlight, 0.28), gouacheStroke);

         // 2. Pen-and-Ink Silhouette Rim & Cross-Hatching in Shadowed Contours
         vec3 viewDir = normalize(vViewPosition);
         float ndotv = abs(dot(normalize(vNormal), viewDir));
         float inkRim = smoothstep(0.36, 0.10, ndotv);

         // Fine medical pen cross-hatching in grazing/shadow zones
         float hatch1 = step(0.65, sin((p.x + p.y) * 3.4));
         float hatch2 = step(0.72, sin((p.x - p.z) * 3.4));
         float shadowZone = smoothstep(0.55, 0.22, ndotv);
         float crossHatch = clamp((hatch1 * 0.55 + hatch2 * 0.45) * shadowZone, 0.0, 1.0);

         vec3 sepiaInk = vec3(0.10, 0.03, 0.04);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, deepShadow, crossHatch * 0.48);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, sepiaInk, inkRim * 0.82);`
      );
    };
    mat.needsUpdate = true;
  };

  // -------------------------------------------------------------------------
  // OPTION 2 + OPTION 1: NIH HuBMAP Reference Organ .GLB Loader & Netter Gouache Shader
  // -------------------------------------------------------------------------
  const applyNetterShaderToNihScene = (rawScene: THREE.Group) => {
    if (isDisposed) return;
    const glbClone = rawScene.clone(true);

    // Normalize bounding box to fit [-1.18, 1.18] surgical stage and center at (0, 0, 0)
    glbClone.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(glbClone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const targetSpan = archetype === 'gi_mucosa_ulcer' ? 2.45 : 2.32;
    const normScale = targetSpan / maxDim;

    const wrapper = new THREE.Group();
    glbClone.position.set(-center.x * normScale, -center.y * normScale, -center.z * normScale);
    glbClone.scale.setScalar(normScale);
    wrapper.add(glbClone);

    // Crisp Netter pen-and-ink anatomical contour line material
    const inkContourMat = trackMat(
      new THREE.LineBasicMaterial({
        color: 0x1a0608,
        transparent: true,
        opacity: 0.46,
      })
    );

    // Translucent outer capsule / anterior chamber shell so internal valves, papillary muscles,
    // renal pyramids, Couinaud segments, and bronchial cartilage rings are visibly exposed!
    const outerCapsuleMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color:
          archetype === 'liver_portal'
            ? 0x8f2d26
            : archetype === 'kidney_nephron'
            ? 0x9f2a2a
            : archetype === 'brain_vascular'
            ? 0xe8998d
            : 0xb82828,
        roughness: 0.42,
        metalness: 0.02,
        clearcoat: 0.25,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        bumpMap: tissueBumpMap,
        bumpScale: 0.025,
        side: THREE.DoubleSide,
      })
    );
    outerCapsuleMat.userData.baseColorHex = outerCapsuleMat.color.getHex();
    parenchymaMaterials.push(outerCapsuleMat);

    // Warm Netter fibrous/valvular/ligamentous/cartilage ivory-ochre material
    const fibrousValveMat = makeParenchymaMat(0xf3e5ab, 0.48, 0.25);
    attachNetterPenAndGouacheShader(fibrousValveMat, 52.0, true);

    let meshIndex = 0;
    const allMeshes: THREE.Mesh[] = [];
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

      // Match actual NIH HuBMAP outer shell nodes so internal valves, papillary muscles,
      // renal pyramids, and hepatic segments are visible inside!
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
      } else if (isPapillaryOrColumnOrBronchus) {
        const subMat = makeParenchymaMat(0xd9534f, 0.45, 0.35);
        attachNetterPenAndGouacheShader(subMat, 64.0, false);
        mesh.material = subMat;
        mesh.userData.baseScale = mesh.scale.clone();
        hypertrophyMeshes.push(mesh);
      } else {
        // Authentic Netter Atlas Gouache Palette per Organ System
        const palette =
          archetype === 'liver_portal'
            ? [0x8b261d, 0x7a1f18, 0x9c3328, 0x6e1a14, 0xa83b2f]
            : archetype === 'kidney_nephron'
            ? [0x8c1d24, 0xa6262e, 0x73141b, 0xb8333a]
            : archetype === 'gi_mucosa_ulcer'
            ? [0xd95f5b, 0xc94a46, 0xe37672, 0xb83b37]
            : archetype === 'lung_alveoli'
            ? [0xd96b70, 0xc75459, 0xe38186]
            : archetype === 'brain_vascular'
            ? [0xe6a89a, 0xd99282, 0xedb8ac, 0xc97d6d]
            : [0xa61c1c, 0x8c1616, 0xb82828, 0x781212];
        const hex = palette[meshIndex % palette.length];
        const subMat = makeParenchymaMat(hex, 0.46, 0.32);
        attachNetterPenAndGouacheShader(subMat, 46.0 + (meshIndex % 5) * 6.0, false);
        mesh.material = subMat;
        mesh.userData.baseScale = mesh.scale.clone();
        hypertrophyMeshes.push(mesh);
      }

      // Add Netter pen-and-ink crease contour lines on internal structures
      const posAttr = mesh.geometry.attributes.position;
      if (posAttr && posAttr.count < 26000) {
        try {
          const edgesGeo = trackGeo(new THREE.EdgesGeometry(mesh.geometry, 26));
          const contourLines = new THREE.LineSegments(edgesGeo, inkContourMat);
          mesh.add(contourLines);
        } catch {
          // Ignore edge generation on non-manifold sub-meshes
        }
      }
    });

    nihGlbGroup.add(wrapper);
    // Hide ALL procedural primitives so ONLY the real sculpted NIH 3D organ is shown!
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
    parenchymaMaterials,
    arterialMaterials,
    venousMaterials,
    lesionMeshes,
    hypertrophyMeshes,
    stenosisMeshes,
    edemaMeshes,
    cutawayShellMeshes,
    rbcInstanced,
    leukocyteInstanced,
    rbcPaths,
    dispose,
  };
}

/**
 * Updates the 3D rig per-frame based on interpolated stage parameters, elapsed time, and view options.
 */
export function updateAnatomyRig(
  rig: BuiltAnatomyRig,
  params: StageSceneParams,
  elapsedTime: number,
  scaleMode: 'macro' | 'micro',
  cutawayEnabled: boolean
): void {
  rig.macroGroup.visible = scaleMode === 'macro';
  rig.microGroup.visible = scaleMode === 'micro';

  // 1. Subtle physiological organ pulsation (cardiac/respiratory rhythm)
  const pulseFreq = 1.15 * Math.max(0.45, params.perfusionSpeed);
  const pulseAmp = 0.016 * (1 - params.fibrosisIntensity * 0.65);
  const pulseScale = 1 + Math.sin(elapsedTime * pulseFreq * Math.PI * 2) * pulseAmp;
  rig.macroGroup.scale.setScalar(pulseScale);

  // 2. Cutaway shell visibility
  rig.cutawayShellMeshes.forEach((mesh) => {
    mesh.visible = !cutawayEnabled;
  });

  // 3. Parenchyma tissue color, fibrosis roughness & inflammatory emissive shift
  rig.parenchymaMaterials.forEach((mat) => {
    _healthyColor.setHex(mat.userData.baseColorHex ?? 0xb91c1c);
    _color.copy(_healthyColor);
    // Blend toward fibrotic collagen ochre and hypoxic slate
    _color.lerp(_fibroticColor, params.fibrosisIntensity * 0.5);
    _color.lerp(_hypoxicColor, params.hypoxiaTint * 0.55);
    mat.color.copy(_color);

    mat.roughness = 0.35 + params.fibrosisIntensity * 0.45;
    mat.bumpScale = 0.025 + params.fibrosisIntensity * 0.075;
    mat.emissive.copy(_inflamedEmissive);
    mat.emissiveIntensity = params.inflammationLevel * 0.22;
  });

  // 4. Focal Lesion / Plaque / Ulcer / Nodule growth relative to each mesh's baseScale
  const lesionFactor = Math.max(0.2, 0.45 + params.lesionScale * 0.75);
  rig.lesionMeshes.forEach((mesh, idx) => {
    const base: THREE.Vector3 = mesh.userData.baseScale ?? new THREE.Vector3(1, 1, 1);
    const jitter = 1 + Math.sin(elapsedTime * 2.2 + idx) * 0.025 * params.inflammationLevel;
    mesh.scale.copy(base).multiplyScalar(lesionFactor * jitter);
    mesh.visible = params.lesionScale > 0.06;
  });

  // 5. Wall hypertrophy scaling relative to baseScale
  const hyperFactor = 1 + params.wallHypertrophy * 0.12;
  rig.hypertrophyMeshes.forEach((obj) => {
    const base: THREE.Vector3 = obj.userData.baseScale ?? new THREE.Vector3(1, 1, 1);
    obj.scale.copy(base).multiplyScalar(hyperFactor);
  });

  // 6. Vessel stenosis narrowing relative to baseScale
  const stenosisFactor = 1 - params.stenosisRatio * 0.32;
  rig.stenosisMeshes.forEach((obj) => {
    const base: THREE.Vector3 = obj.userData.baseScale ?? new THREE.Vector3(1, 1, 1);
    obj.scale.set(base.x * stenosisFactor, base.y, base.z * stenosisFactor);
  });

  // 7. Edema / Ascites halo envelope
  rig.edemaMeshes.forEach((mesh) => {
    mesh.visible = params.edemaScale > 0.12;
    const edScale = 0.92 + params.edemaScale * 0.16;
    mesh.scale.setScalar(edScale);
    const mat = mesh.material as THREE.MeshPhysicalMaterial;
    mat.opacity = params.edemaScale * 0.16;
  });

  // 8. Flowing Red Blood Cells along vascular curves
  const rbcCount = rig.rbcInstanced.count;
  const paths = rig.rbcPaths;
  if (paths.length > 0) {
    for (let i = 0; i < rbcCount; i++) {
      const path = paths[i % paths.length];
      const u = ((i / rbcCount) + elapsedTime * 0.22 * params.perfusionSpeed) % 1;
      path.getPointAt(u, _pos);
      path.getTangentAt(u, _tangent);

      // Radial jitter inside lumen
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

  // 9. Immune Leukocyte / Cytokine infiltrate cloud
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
    const radius =
      scaleMode === 'micro'
        ? 0.35 + ((i % 17) / 17) * 0.65
        : 0.65 + ((i % 23) / 23) * (0.58 + params.edemaScale * 0.25);

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
