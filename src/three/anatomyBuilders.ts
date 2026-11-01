import * as THREE from 'three';
import { Archetype3D, StageSceneParams } from '../types/pathology';

export interface BuiltAnatomyRig {
  rootGroup: THREE.Group;
  macroGroup: THREE.Group;
  microGroup: THREE.Group;
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
 * Generates a zero-404 procedural organic tissue cellular bump/roughness texture in memory.
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
      grad.addColorStop(0, 'rgba(215, 215, 215, 0.35)');
      grad.addColorStop(0.6, 'rgba(130, 130, 130, 0.2)');
      grad.addColorStop(1, 'rgba(65, 65, 65, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fine collagenous striation lines
    ctx.strokeStyle = 'rgba(240, 240, 240, 0.14)';
    ctx.lineWidth = 1.2;
    for (let j = 0; j < 48; j++) {
      ctx.beginPath();
      const sy = (j * 29) % 256;
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
  isSoftwareGl: boolean
): BuiltAnatomyRig {
  const rootGroup = new THREE.Group();
  const macroGroup = new THREE.Group();
  const microGroup = new THREE.Group();
  rootGroup.add(macroGroup);
  rootGroup.add(microGroup);
  microGroup.visible = false;

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

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

  // Shared PBR material factories
  const makeParenchymaMat = (hexColor: number, roughness = 0.42, clearcoat = 0.65) => {
    const mat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: hexColor,
        roughness,
        metalness: 0.06,
        clearcoat: isSoftwareGl ? 0.25 : clearcoat,
        clearcoatRoughness: 0.22,
        bumpMap: tissueBumpMap,
        bumpScale: 0.035,
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

    // 1. Left Ventricle Primary Chamber (Lathe profile)
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
    macroGroup.add(lvMesh);
    hypertrophyMeshes.push(lvMesh);

    // Cutaway outer anterior wall shell
    const shellGeo = trackGeo(new THREE.SphereGeometry(0.98, 28, 24, 0, Math.PI * 0.9, 0.2, Math.PI * 0.75));
    const shellMesh = new THREE.Mesh(shellGeo, myocardiumMat.clone());
    shellMesh.position.set(0.18, -0.1, 0.06);
    shellMesh.scale.set(0.95, 1.15, 0.92);
    macroGroup.add(shellMesh);
    cutawayShellMeshes.push(shellMesh);

    // 2. Right Ventricle Crescent Chamber
    const rvGeo = trackGeo(new THREE.SphereGeometry(0.78, 28, 24));
    const rvMesh = new THREE.Mesh(rvGeo, rvMat);
    rvMesh.scale.set(0.85, 1.12, 0.78);
    rvMesh.position.set(-0.42, -0.18, 0.18);
    rvMesh.rotation.z = 0.15;
    macroGroup.add(rvMesh);

    // 3. Left & Right Atria
    const laGeo = trackGeo(new THREE.SphereGeometry(0.48, 24, 20));
    const laMesh = new THREE.Mesh(laGeo, atriumMat);
    laMesh.position.set(0.48, 0.78, -0.18);
    macroGroup.add(laMesh);

    const raMesh = new THREE.Mesh(laGeo, atriumMat);
    raMesh.position.set(-0.55, 0.72, -0.05);
    macroGroup.add(raMesh);

    // 4. Ascending Aorta & Arch (TubeGeometry)
    const aortaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.05, 0.75, 0.1),
      new THREE.Vector3(0.08, 1.38, 0.15),
      new THREE.Vector3(-0.18, 1.72, 0.02),
      new THREE.Vector3(-0.55, 1.52, -0.25),
    ]);
    const aortaGeo = trackGeo(new THREE.TubeGeometry(aortaCurve, 32, 0.24, 16, false));
    const aortaMesh = new THREE.Mesh(aortaGeo, aortaMat);
    macroGroup.add(aortaMesh);
    rbcPaths.push(aortaCurve);

    // 5. Superior Vena Cava & Pulmonary Artery Trunk
    const svcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.62, 0.65, -0.1),
      new THREE.Vector3(-0.68, 1.48, -0.12),
    ]);
    const svcMesh = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(svcCurve, 20, 0.18, 14, false)), venaCavaMat);
    macroGroup.add(svcMesh);

    // 6. Left Anterior Descending (LAD) & Circumflex Coronary Tree
    const ladCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.12, 0.92, 0.35),
      new THREE.Vector3(0.22, 0.55, 0.88),
      new THREE.Vector3(0.28, 0.05, 1.02),
      new THREE.Vector3(0.34, -0.55, 0.92),
      new THREE.Vector3(0.38, -1.02, 0.55),
    ]);
    const ladGeo = trackGeo(new THREE.TubeGeometry(ladCurve, 36, 0.068, 12, false));
    const ladMesh = new THREE.Mesh(ladGeo, aortaMat);
    macroGroup.add(ladMesh);
    stenosisMeshes.push(ladMesh);
    rbcPaths.push(ladCurve);

    // 7. Focal Atherosclerotic Plaque & Thrombus Collar on Proximal LAD
    const plaqueGeo = trackGeo(new THREE.SphereGeometry(0.22, 20, 16));
    const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaqueMesh.position.set(0.24, 0.42, 0.94);
    plaqueMesh.scale.set(1.1, 0.75, 0.85);
    macroGroup.add(plaqueMesh);
    lesionMeshes.push(plaqueMesh);

    // 8. Apical Ischemic / Fibrotic Infarct Patch
    const infarctGeo = trackGeo(new THREE.SphereGeometry(0.46, 24, 20));
    const infarctMesh = new THREE.Mesh(infarctGeo, makeLesionMat(0x64748b));
    infarctMesh.position.set(0.32, -0.68, 0.72);
    infarctMesh.scale.set(1.1, 0.9, 0.65);
    macroGroup.add(infarctMesh);
    lesionMeshes.push(infarctMesh);

    // 9. Pericardial Edema / Wall Stress Halo
    const edemaMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.32, 24, 20)), makeEdemaMat());
    edemaMesh.scale.set(1.0, 1.15, 0.9);
    macroGroup.add(edemaMesh);
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

    // 1. Right Hepatic Lobe Dome
    const rLobeGeo = trackGeo(new THREE.SphereGeometry(1.05, 32, 26));
    const rLobe = new THREE.Mesh(rLobeGeo, liverMat);
    rLobe.scale.set(1.15, 0.88, 0.82);
    rLobe.position.set(0.42, 0.32, 0);
    macroGroup.add(rLobe);
    hypertrophyMeshes.push(rLobe);

    // 2. Left Hepatic Lobe Wedge
    const lLobeGeo = trackGeo(new THREE.ConeGeometry(0.82, 1.55, 28));
    const lLobe = new THREE.Mesh(lLobeGeo, leftLobeMat);
    lLobe.rotation.z = -Math.PI * 0.42;
    lLobe.scale.set(1.0, 1.0, 0.68);
    lLobe.position.set(-0.62, 0.45, 0.08);
    macroGroup.add(lLobe);
    cutawayShellMeshes.push(lLobe);

    // 3. Regenerative Cirrhotic Nodules Cluster (10 composite nodules on liver surface)
    const nodulePositions: [number, number, number, number][] = [
      [0.55, 0.52, 0.72, 0.22],
      [0.85, 0.25, 0.62, 0.25],
      [0.22, 0.68, 0.68, 0.19],
      [0.68, -0.08, 0.65, 0.24],
      [-0.35, 0.52, 0.48, 0.18],
      [0.12, 0.18, 0.75, 0.21],
    ];
    const nodGeo = trackGeo(new THREE.SphereGeometry(1, 18, 16));
    nodulePositions.forEach(([nx, ny, nz, nr]) => {
      const m = new THREE.Mesh(nodGeo, noduleMat);
      m.position.set(nx, ny, nz);
      m.scale.setScalar(nr);
      macroGroup.add(m);
      lesionMeshes.push(m);
    });

    // 4. Main Portal Vein & Intrahepatic Bifurcation
    const portalCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, -1.25, 0.25),
      new THREE.Vector3(-0.18, -0.55, 0.35),
      new THREE.Vector3(0.08, -0.05, 0.28),
      new THREE.Vector3(0.58, 0.28, 0.18),
    ]);
    const portalMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(portalCurve, 32, 0.16, 16, false)),
      portalMat
    );
    macroGroup.add(portalMesh);
    stenosisMeshes.push(portalMesh);
    rbcPaths.push(portalCurve);

    // 5. Tortuous Gastroesophageal Variceal Collateral Shunt
    const varixCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.22, -0.65, 0.38),
      new THREE.Vector3(-0.75, -0.25, 0.52),
      new THREE.Vector3(-0.98, 0.28, 0.45),
      new THREE.Vector3(-0.85, 0.85, 0.38),
      new THREE.Vector3(-0.95, 1.32, 0.25),
    ]);
    const varixMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(varixCurve, 36, 0.085, 12, false)),
      portalMat
    );
    macroGroup.add(varixMesh);
    lesionMeshes.push(varixMesh);
    rbcPaths.push(varixCurve);

    // 6. Proper Hepatic Artery & Common Bile Duct + Gallbladder
    const haCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.05, -1.15, 0.42),
      new THREE.Vector3(0.02, -0.45, 0.45),
      new THREE.Vector3(0.32, 0.08, 0.38),
    ]);
    macroGroup.add(new THREE.Mesh(trackGeo(new THREE.TubeGeometry(haCurve, 24, 0.075, 12, false)), hepaticArtMat));
    rbcPaths.push(haCurve);

    const gbGeo = trackGeo(new THREE.CapsuleGeometry(0.18, 0.42, 12, 16));
    const gbMesh = new THREE.Mesh(gbGeo, bileMat);
    gbMesh.position.set(0.38, -0.35, 0.52);
    gbMesh.rotation.z = 0.45;
    macroGroup.add(gbMesh);

    // 7. Peritoneal Ascites Fluid Envelope
    const ascitesMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.45, 24, 20)), makeEdemaMat());
    ascitesMesh.scale.set(1.2, 0.95, 0.85);
    macroGroup.add(ascitesMesh);
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

    // 1. Bean-shaped Renal Cortex (Curved TubeGeometry hull)
    const kidneyBeanCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.15, 1.05, 0),
      new THREE.Vector3(0.68, 0.55, 0),
      new THREE.Vector3(0.75, -0.45, 0),
      new THREE.Vector3(-0.15, -1.05, 0),
    ]);
    const beanGeo = trackGeo(new THREE.TubeGeometry(kidneyBeanCurve, 36, 0.68, 24, false));
    const beanMesh = new THREE.Mesh(beanGeo, cortexMat);
    beanMesh.scale.set(1.0, 1.0, 0.75);
    macroGroup.add(beanMesh);
    hypertrophyMeshes.push(beanMesh);
    cutawayShellMeshes.push(beanMesh);

    // 2. Renal Medullary Pyramids (5 radial cones)
    const pyramidGeo = trackGeo(new THREE.ConeGeometry(0.26, 0.52, 16));
    const angles = [0.85, 0.42, 0.0, -0.42, -0.85];
    angles.forEach((ang) => {
      const pyr = new THREE.Mesh(pyramidGeo, medullaMat);
      pyr.position.set(0.35 + Math.cos(ang) * 0.25, Math.sin(ang) * 0.72, 0.28);
      pyr.rotation.z = ang + Math.PI / 2;
      macroGroup.add(pyr);
    });

    // 3. Magnified Glomerular Capillary Tuft & Bowman Capsule Inset
    const bowmanGeo = trackGeo(new THREE.SphereGeometry(0.45, 24, 20, 0, Math.PI * 1.4));
    const bowmanMesh = new THREE.Mesh(bowmanGeo, tubuleMat);
    bowmanMesh.position.set(0.28, 0.62, 0.68);
    bowmanMesh.rotation.y = -0.5;
    macroGroup.add(bowmanMesh);

    const tuftCurve = new THREE.TorusKnotGeometry(0.2, 0.055, 48, 12, 2, 3);
    geometries.push(tuftCurve);
    const tuftMesh = new THREE.Mesh(tuftCurve, artMat);
    tuftMesh.position.set(0.28, 0.62, 0.72);
    macroGroup.add(tuftMesh);

    // 4. Kimmelstiel-Wilson Nodular Glomerulosclerosis Spheres
    const kwGeo = trackGeo(new THREE.SphereGeometry(0.14, 16, 14));
    const kw1 = new THREE.Mesh(kwGeo, sclerosisMat);
    kw1.position.set(0.35, 0.68, 0.85);
    macroGroup.add(kw1);
    lesionMeshes.push(kw1);

    const kw2 = new THREE.Mesh(kwGeo, sclerosisMat);
    kw2.position.set(0.18, 0.52, 0.82);
    macroGroup.add(kw2);
    lesionMeshes.push(kw2);

    // 5. Renal Artery & Vein at Hilum
    const renalArtCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.25, 0.18, 0.15),
      new THREE.Vector3(-0.35, 0.12, 0.2),
      new THREE.Vector3(0.25, 0.55, 0.55),
    ]);
    const renalArtMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(renalArtCurve, 28, 0.13, 14, false)),
      artMat
    );
    macroGroup.add(renalArtMesh);
    stenosisMeshes.push(renalArtMesh);
    rbcPaths.push(renalArtCurve);

    const renalVeinCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.22, -0.25, 0.35),
      new THREE.Vector3(-0.38, -0.12, 0.28),
      new THREE.Vector3(-1.25, -0.15, 0.25),
    ]);
    macroGroup.add(
      new THREE.Mesh(trackGeo(new THREE.TubeGeometry(renalVeinCurve, 24, 0.15, 14, false)), veinMat)
    );
    rbcPaths.push(renalVeinCurve);

    // 6. Nephron Loop of Henle & Ureter Outflow
    const ureterCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.05, 0.0, 0.1),
      new THREE.Vector3(-0.35, -0.45, 0.12),
      new THREE.Vector3(-0.48, -1.35, 0.08),
    ]);
    macroGroup.add(
      new THREE.Mesh(trackGeo(new THREE.TubeGeometry(ureterCurve, 24, 0.11, 12, false)), tubuleMat)
    );

    const edemaMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.35, 24, 20)), makeEdemaMat());
    macroGroup.add(edemaMesh);
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

    // 1. Curved Stomach J-Shape Organ Silhouette + Cross-Sectional Layered Wall
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
    macroGroup.add(outerSerosaMesh);
    hypertrophyMeshes.push(outerSerosaMesh);

    // 2. Anterior Cutaway Mucosal Rugae Shell
    const rugaeMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(stomachCurve, 32, 0.52, 20, false)),
      mucosaMat
    );
    rugaeMesh.position.set(0, 0, 0.12);
    macroGroup.add(rugaeMesh);
    cutawayShellMeshes.push(rugaeMesh);

    // 3. Layered Histological Wall Slab at Antrum/Duodenum (Mucosa + Submucosa + Muscularis)
    const slabGeo = trackGeo(new THREE.CylinderGeometry(0.68, 0.68, 0.32, 28));
    const slabMesh = new THREE.Mesh(slabGeo, submucosaMat);
    slabMesh.rotation.x = Math.PI / 2;
    slabMesh.position.set(0.0, 0.15, 0.42);
    macroGroup.add(slabMesh);

    // 4. Punched-Out Peptic Ulcer Crater & Fibrinoid Base
    const craterGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.18, 0.38, 24));
    const craterMesh = new THREE.Mesh(craterGeo, craterMat);
    craterMesh.rotation.x = Math.PI / 2;
    craterMesh.position.set(0.0, 0.18, 0.62);
    macroGroup.add(craterMesh);
    lesionMeshes.push(craterMesh);

    // 5. Gastroduodenal / Left Gastric Submucosal Artery at Ulcer Floor
    const gdaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.85, 0.65, 0.55),
      new THREE.Vector3(0.0, 0.15, 0.68),
      new THREE.Vector3(0.85, -0.45, 0.55),
    ]);
    const gdaMesh = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(gdaCurve, 28, 0.08, 12, false)), artMat);
    macroGroup.add(gdaMesh);
    stenosisMeshes.push(gdaMesh);
    rbcPaths.push(gdaCurve);

    const edemaMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.38, 24, 20)), makeEdemaMat());
    macroGroup.add(edemaMesh);
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

    // 1. Terminal Bronchiole & Cartilage Rings
    const bronchusCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.45, 0),
      new THREE.Vector3(0, 0.55, 0),
      new THREE.Vector3(0.45, 0.05, 0.15),
    ]);
    const bronchusMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(bronchusCurve, 24, 0.18, 16, false)),
      cartilageMat
    );
    macroGroup.add(bronchusMesh);
    stenosisMeshes.push(bronchusMesh);

    const leftBranch = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.55, 0),
      new THREE.Vector3(-0.48, 0.02, 0.12),
    ]);
    macroGroup.add(new THREE.Mesh(trackGeo(new THREE.TubeGeometry(leftBranch, 16, 0.15, 14, false)), cartilageMat));

    // 2. Grape-like Alveolar Sac Cluster (8 composite spheres)
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
      macroGroup.add(m);
      hypertrophyMeshes.push(m);
      if (idx === 6) cutawayShellMeshes.push(m);
    });

    // 3. Intra-alveolar Hyaline Membrane & Exudate Cores
    const hyGeo = trackGeo(new THREE.SphereGeometry(0.36, 20, 16));
    const hyMesh1 = new THREE.Mesh(hyGeo, hyalineMat);
    hyMesh1.position.set(0.42, 0.15, 0.58);
    macroGroup.add(hyMesh1);
    lesionMeshes.push(hyMesh1);

    // 4. Perialveolar Capillary Net
    const capCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.05, 0.45, 0.45),
      new THREE.Vector3(-0.45, -0.25, 0.72),
      new THREE.Vector3(0.0, -0.45, 0.85),
      new THREE.Vector3(0.55, -0.22, 0.72),
      new THREE.Vector3(1.05, 0.45, 0.45),
    ]);
    macroGroup.add(new THREE.Mesh(trackGeo(new THREE.TubeGeometry(capCurve, 36, 0.065, 12, false)), artMat));
    macroGroup.add(
      new THREE.Mesh(
        trackGeo(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(-0.95, -0.65, 0.35),
              new THREE.Vector3(0.0, 0.25, 0.65),
              new THREE.Vector3(0.95, -0.65, 0.35),
            ]),
            28,
            0.06,
            12,
            false
          )
        ),
        veinMat
      )
    );
    rbcPaths.push(capCurve);

    const edemaMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.38, 24, 20)), makeEdemaMat());
    macroGroup.add(edemaMesh);
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

    // 1. Right & Left Cerebral Hemispheres
    const hemGeo = trackGeo(new THREE.SphereGeometry(0.88, 32, 26));
    const rightHem = new THREE.Mesh(hemGeo, cortexMat);
    rightHem.scale.set(0.78, 0.95, 1.22);
    rightHem.position.set(0.52, 0.18, 0);
    macroGroup.add(rightHem);
    hypertrophyMeshes.push(rightHem);
    cutawayShellMeshes.push(rightHem);

    const leftHem = new THREE.Mesh(hemGeo, leftHemMat);
    leftHem.scale.set(0.78, 0.95, 1.22);
    leftHem.position.set(-0.52, 0.18, 0);
    macroGroup.add(leftHem);

    // 2. Brainstem & Cerebellum
    const stemMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.24, 0.18, 0.85, 20)),
      leftHemMat
    );
    stemMesh.position.set(0, -0.75, -0.15);
    macroGroup.add(stemMesh);

    // 3. Circle of Willis & Middle Cerebral Artery (MCA M1-M3) Tree
    const mcaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, -0.65, 0.35),
      new THREE.Vector3(0.18, -0.32, 0.65),
      new THREE.Vector3(0.68, -0.05, 0.78),
      new THREE.Vector3(0.95, 0.38, 0.52),
      new THREE.Vector3(0.78, 0.78, 0.15),
    ]);
    const mcaMesh = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(mcaCurve, 36, 0.075, 14, false)), artMat);
    macroGroup.add(mcaMesh);
    stenosisMeshes.push(mcaMesh);
    rbcPaths.push(mcaCurve);

    // 4. Ischemic Core & Penumbra Territory on Lateral Convexity
    const penumbraMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.45, 24, 20)), thrombusMat);
    penumbraMesh.position.set(0.78, 0.12, 0.55);
    penumbraMesh.scale.set(0.85, 0.95, 0.9);
    macroGroup.add(penumbraMesh);
    lesionMeshes.push(penumbraMesh);

    const edemaMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.42, 24, 20)), makeEdemaMat());
    macroGroup.add(edemaMesh);
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
    macroGroup.add(outerWall);
    hypertrophyMeshes.push(outerWall);
    cutawayShellMeshes.push(outerWall);

    const glycocalyxLayer = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(microVesselCurve, 32, 0.56, 20, false)),
      glycocalyxMat
    );
    macroGroup.add(glycocalyxLayer);
    stenosisMeshes.push(glycocalyxLayer);

    const netThrombus = new THREE.Mesh(trackGeo(new THREE.TorusKnotGeometry(0.28, 0.08, 36, 12)), thrombusMat);
    netThrombus.position.set(0.35, -0.08, 0.25);
    macroGroup.add(netThrombus);
    lesionMeshes.push(netThrombus);

    rbcPaths.push(microVesselCurve);

    const edemaMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.48, 24, 20)), makeEdemaMat());
    macroGroup.add(edemaMesh);
    edemaMeshes.push(edemaMesh);
  }

  // -------------------------------------------------------------------------
  // SHARED MICRO / HISTOLOGICAL CROSS-SECTION STAGE (microGroup)
  // -------------------------------------------------------------------------
  // Renders a high-magnification 3D microvascular & tissue interstitium bed
  // for ANY pathology when the doctor toggles "Micro / Cellular View"
  const microEndotheliumMat = makeParenchymaMat(0xbe123c, 0.4, 0.65);
  const microBasementMat = trackMat(
    new THREE.MeshPhysicalMaterial({ color: 0xd97706, roughness: 0.55, metalness: 0.05 })
  );
  const microLesionMat = makeLesionMat(0xfacc15);

  // Half-cylinder microvessel cutaway trough
  const troughGeo = trackGeo(new THREE.CylinderGeometry(0.75, 0.75, 2.8, 28, 1, true, 0, Math.PI * 1.25));
  const troughMesh = new THREE.Mesh(troughGeo, microEndotheliumMat);
  troughMesh.rotation.z = Math.PI / 2;
  troughMesh.rotation.x = Math.PI * 0.65;
  microGroup.add(troughMesh);

  // Basement Membrane & Interstitial Collagen Strands
  const bmGeo = trackGeo(new THREE.CylinderGeometry(0.84, 0.84, 2.8, 24, 1, true, 0, Math.PI * 1.15));
  const bmMesh = new THREE.Mesh(bmGeo, microBasementMat);
  bmMesh.rotation.z = Math.PI / 2;
  bmMesh.rotation.x = Math.PI * 0.65;
  microGroup.add(bmMesh);
  hypertrophyMeshes.push(bmMesh);

  // Micro-luminal thrombus / plaque / inflammatory exudate mound
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
  // INSTANCED MESH 1: Flowing Red Blood Cells (Biconcave-style discs, 90 instances)
  // -------------------------------------------------------------------------
  const rbcCount = 90;
  const rbcGeo = trackGeo(new THREE.SphereGeometry(0.052, 12, 10));
  rbcGeo.scale(1.2, 0.55, 1.2);
  const rbcMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      roughness: 0.25,
      metalness: 0.05,
      clearcoat: 0.8,
    })
  );
  const rbcInstanced = new THREE.InstancedMesh(rbcGeo, rbcMat, rbcCount);
  rbcInstanced.frustumCulled = false;
  rootGroup.add(rbcInstanced);

  // -------------------------------------------------------------------------
  // INSTANCED MESH 2: Immune Leukocytes / Cytokines (160 instances)
  // -------------------------------------------------------------------------
  const maxLeukocytes = 160;
  const leukoGeo = trackGeo(new THREE.IcosahedronGeometry(0.048, 1));
  const leukoMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.05,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.45,
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
  rootGroup.add(leukocyteInstanced);

  const finalizeTrackedScales = () => {
    lesionMeshes.forEach((m) => {
      m.userData.baseScale = m.scale.clone();
    });
    hypertrophyMeshes.forEach((m) => {
      m.userData.baseScale = m.scale.clone();
    });
    stenosisMeshes.forEach((m) => {
      m.userData.baseScale = m.scale.clone();
    });
  };
  finalizeTrackedScales();

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    rootGroup,
    macroGroup,
    microGroup,
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
