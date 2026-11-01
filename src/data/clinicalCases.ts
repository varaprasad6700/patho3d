import type { PathologyModelSpec } from '../types/pathology.ts';

export const CLINICAL_CASES: PathologyModelSpec[] = [
  {
    id: 'cardio-coronary-atherosclerosis',
    title: 'Coronary Atherosclerosis & Myocardial Ischemic Cascade',
    clinicalQuestion:
      'How does LAD coronary atherosclerotic plaque progression and rupture affect myocardial perfusion, and how does the heart react hemodynamically and structurally?',
    organSystem: 'cardiovascular',
    archetype3D: 'heart_coronary',
    icdCode: 'ICD-10: I25.10 / I21.09',
    summary:
      'Progressive subintimal LDL oxidation in the left anterior descending (LAD) artery drives fibrofatty plaque formation. Acute fibrous cap rupture exposes subendothelial tissue factor, triggering occlusive thrombosis, transmural anterior wall ischemia, sympathetic neurohormonal surge, and eccentric ventricular remodeling.',
    primaryInsultSummary:
      'Endothelial shear stress dysfunction, subintimal oxidized LDL retention, necrotic lipid core expansion, and acute occlusive platelet-fibrin thrombus in the proximal LAD.',
    hostReactionSummary:
      'Coronary autoregulatory vasodilation via adenosine/NO, baroreceptor-driven sympathetic & RAAS activation, neutrophil/macrophage phagocytic clearance of necrotic myocytes, and myofibroblast collagen scar deposition.',
    stages: [
      {
        stageIndex: 0,
        stageName: 'Healthy Coronary Perfusion & Homeostasis',
        timeCourse: 'Baseline Physiological State',
        pathophysiologyNarrative:
          'Unobstructed laminar blood flow through the epicardial left anterior descending (LAD) and circumflex arteries delivers oxygen-rich blood across the transmural myocardium, including vulnerable subendocardial fibers.',
        bodyReactionNarrative:
          'Intact coronary endothelium constitutively releases nitric oxide (NO) and prostacyclin (PGI2), maintaining antithrombotic tone and matching myocardial oxygen supply to metabolic demand.',
        histologicalHallmark:
          'Single-layer quiescent endothelial intima, uniform tunica media smooth muscle, and tightly coupled cardiomyocytes with abundant mitochondria.',
        sceneParams: {
          stenosisRatio: 0.05,
          wallHypertrophy: 0.05,
          fibrosisIntensity: 0.0,
          inflammationLevel: 0.05,
          edemaScale: 0.0,
          perfusionSpeed: 1.5,
          lesionScale: 0.05,
          hypoxiaTint: 0.0,
          cellularInfiltrateCount: 16,
        },
        biomarkers: [
          { label: 'LVEF', value: 64, unit: '%', referenceRange: '55–70%', status: 'nominal', decimals: 0 },
          { label: 'FFR (LAD)', value: 0.98, unit: 'ratio', referenceRange: '> 0.80', status: 'nominal', decimals: 2 },
          { label: 'hs-Troponin I', value: 0.01, unit: 'ng/mL', referenceRange: '< 0.04', status: 'nominal', decimals: 2 },
          { label: 'LVEDP', value: 9, unit: 'mmHg', referenceRange: '4–12 mmHg', status: 'nominal', decimals: 0 },
        ],
      },
      {
        stageIndex: 1,
        stageName: 'Fibrofatty Atheroma & Microvascular Autoregulation',
        timeCourse: 'Years 1–10 (Subclinical to Stable Angina)',
        pathophysiologyNarrative:
          'ApoB-containing lipoproteins infiltrate the LAD intima and undergo oxidative modification. Monocytes differentiate into foam cells, coalescing into a necrotic lipid core beneath a vascular smooth muscle fibrous cap (~55% luminal stenosis).',
        bodyReactionNarrative:
          'Distal arterioles undergo compensatory metabolic vasodilation mediated by local adenosine, K_ATP channel opening, and endothelial shear-stress signaling to preserve resting coronary flow reserve.',
        histologicalHallmark:
          'Subintimal foam cell aggregates, extracellular cholesterol clefts, neovascularization of vasa vasorum, and PDGF-driven smooth muscle fibrous cap.',
        sceneParams: {
          stenosisRatio: 0.52,
          wallHypertrophy: 0.35,
          fibrosisIntensity: 0.25,
          inflammationLevel: 0.42,
          edemaScale: 0.18,
          perfusionSpeed: 1.05,
          lesionScale: 0.48,
          hypoxiaTint: 0.25,
          cellularInfiltrateCount: 54,
        },
        biomarkers: [
          { label: 'LVEF', value: 58, unit: '%', referenceRange: '55–70%', status: 'nominal', decimals: 0 },
          { label: 'FFR (LAD)', value: 0.74, unit: 'ratio', referenceRange: '> 0.80', status: 'elevated', decimals: 2 },
          { label: 'hs-Troponin I', value: 0.03, unit: 'ng/mL', referenceRange: '< 0.04', status: 'nominal', decimals: 2 },
          { label: 'LVEDP', value: 14, unit: 'mmHg', referenceRange: '4–12 mmHg', status: 'elevated', decimals: 0 },
        ],
      },
      {
        stageIndex: 2,
        stageName: 'Plaque Rupture, Acute Thrombosis & Sympathetic Surge',
        timeCourse: 'Minutes to 24 Hours (Acute STEMI)',
        pathophysiologyNarrative:
          'Activated plaque macrophages secrete MMP-1/MMP-9 collagenases that degrade the thin fibrous cap. Plaque fissure exposes tissue factor and collagen, triggering GpIIb/IIIa platelet aggregation, occlusive red thrombus, and ATP depletion in the anterior LV wall.',
        bodyReactionNarrative:
          'Drop in stroke volume unloads carotid sinus baroreceptors, triggering an acute catecholamine surge (β1 tachycardia/inotropy in non-infarcted segments) and intense neutrophil chemotaxis (IL-1β, TNF-α, C5a) into the ischemic zone.',
        histologicalHallmark:
          'Occlusive luminal platelet-fibrin thrombus, wavy myocardial fibers, contraction band necrosis, interstitial edema, and dense polymorphonuclear neutrophil margination.',
        sceneParams: {
          stenosisRatio: 0.9,
          wallHypertrophy: 0.6,
          fibrosisIntensity: 0.45,
          inflammationLevel: 0.92,
          edemaScale: 0.75,
          perfusionSpeed: 0.25,
          lesionScale: 0.95,
          hypoxiaTint: 0.82,
          cellularInfiltrateCount: 140,
        },
        biomarkers: [
          { label: 'LVEF', value: 39, unit: '%', referenceRange: '55–70%', status: 'critical', decimals: 0 },
          { label: 'FFR (LAD)', value: 0.21, unit: 'ratio', referenceRange: '> 0.80', status: 'critical', decimals: 2 },
          { label: 'hs-Troponin I', value: 24.8, unit: 'ng/mL', referenceRange: '< 0.04', status: 'critical', decimals: 2 },
          { label: 'LVEDP', value: 24, unit: 'mmHg', referenceRange: '4–12 mmHg', status: 'critical', decimals: 0 },
        ],
      },
      {
        stageIndex: 3,
        stageName: 'Macrophage Clearance, Collagen Scar & LV Remodeling',
        timeCourse: 'Weeks 2–8+ (Post-Infarct Ventricular Remodeling)',
        pathophysiologyNarrative:
          'Necrotic anterior myocardium cannot regenerate and is replaced by dense Type I/III cross-linked collagen scar. Infarct expansion thins the anterior apex while non-infarcted myocardium undergoes compensatory eccentric and concentric hypertrophy.',
        bodyReactionNarrative:
          'Sustained RAAS activation (Angiotensin II, Aldosterone) and wall stress stimulate TGF-β1 myofibroblast collagen synthesis and ventricular dilation (Frank-Starling preload compensation), accompanied by ANP/BNP natriuretic peptide release.',
        histologicalHallmark:
          'Dense acellular collagenous scar replacing anterior myocardium, hemosiderin-laden macrophages, and hypertrophied viable border-zone myocytes with boxcar nuclei.',
        sceneParams: {
          stenosisRatio: 0.78,
          wallHypertrophy: 0.92,
          fibrosisIntensity: 0.95,
          inflammationLevel: 0.5,
          edemaScale: 0.55,
          perfusionSpeed: 0.55,
          lesionScale: 0.8,
          hypoxiaTint: 0.68,
          cellularInfiltrateCount: 82,
        },
        biomarkers: [
          { label: 'LVEF', value: 32, unit: '%', referenceRange: '55–70%', status: 'critical', decimals: 0 },
          { label: 'FFR (LAD)', value: 0.42, unit: 'ratio', referenceRange: '> 0.80', status: 'depressed', decimals: 2 },
          { label: 'hs-Troponin I', value: 0.45, unit: 'ng/mL', referenceRange: '< 0.04', status: 'elevated', decimals: 2 },
          { label: 'LVEDP', value: 28, unit: 'mmHg', referenceRange: '4–12 mmHg', status: 'critical', decimals: 0 },
        ],
      },
    ],
    hotspots: [
      {
        id: 'hs-lad-plaque',
        indexNumber: 1,
        label: 'Proximal LAD Atherothrombotic Locus',
        anatomicalStructure: 'Left Anterior Descending Coronary Artery (Proximal Segment)',
        position3D: [0.22, 0.78, 1.02],
        pathologyEffect:
          'Eccentric necrotic lipid core with MMP-degraded fibrous cap and superimposed platelet-fibrin thrombus obstructing >85% of the vessel lumen.',
        bodyReaction:
          'Endothelial activation upregulates ICAM-1/VCAM-1, recruiting monocytes while collateral arterioles from the RCA attempt retrograde perfusion.',
        histologicalFinding:
          'Cholesterol clefts, CD68+ foam cells, disrupted internal elastic lamina, and intraluminal fibrin meshwork.',
        clinicalPearl:
          'Produces ST-segment elevations in leads V1–V4; early PCI restoration prevents transmural extension of necrosis.',
        severity: 'critical',
      },
      {
        id: 'hs-anterior-apex',
        indexNumber: 2,
        label: 'Ischemic Anterior-Apical Myocardium',
        anatomicalStructure: 'Left Ventricular Anterior Wall & Apex',
        position3D: [0.35, -0.62, 1.05],
        pathologyEffect:
          'Cessation of aerobic glycolysis depletes ATP within 60 seconds, halting SERCA2a Ca2+ reuptake and causing akinesis/dyskinesis.',
        bodyReaction:
          'Necrotic myocytes release DAMPs that activate TLR4 on resident macrophages, initiating a biphasic M1 (pro-inflammatory) to M2 (reparative TGF-β) healing cascade.',
        histologicalFinding:
          'Coagulative necrosis, loss of cross-striations, pyknotic nuclei, and eventual dense Type I collagen replacement.',
        clinicalPearl:
          'Apical akinesis creates stasis predisposing to LV mural thrombus and systemic cardioembolic stroke.',
        severity: 'critical',
      },
      {
        id: 'hs-basal-myocardium',
        indexNumber: 3,
        label: 'Hyperkinetic Basal Compensatory Zone',
        anatomicalStructure: 'Posterobasal Left Ventricular Myocardium',
        position3D: [-0.72, 0.18, 0.65],
        pathologyEffect:
          'Experiences elevated Laplace wall stress (σ = P·r / 2h) due to acute LV cavity dilation and increased end-diastolic pressure.',
        bodyReaction:
          'Sympathetic β1-adrenergic stimulation increases contractility and heart rate, while mechanical stretch triggers sarcomere addition and BNP secretion.',
        histologicalFinding:
          'Compensatory cardiomyocyte hypertrophy with enlarged hyperchromatic "boxcar" nuclei and perivascular interstitial fibrosis.',
        clinicalPearl:
          'ACE inhibitors / ARNI and β-blockers attenuate maladaptive neurohormonal remodeling in this viable border zone.',
        severity: 'compensatory',
      },
      {
        id: 'hs-aortic-root',
        indexNumber: 4,
        label: 'Aortic Root & Baroreceptor Outflow Tract',
        anatomicalStructure: 'Ascending Aorta & Sinotubular Junction',
        position3D: [0.05, 1.55, 0.15],
        pathologyEffect:
          'Reduced forward stroke volume lowers mean arterial pulse pressure and coronary diastolic perfusion pressure.',
        bodyReaction:
          'Aortic arch baroreceptor unloading disinhibits the rostral ventrolateral medulla (RVLM), elevating systemic vascular resistance (SVR) to defend cerebral/coronary perfusion.',
        histologicalFinding:
          'Elastic lamellae recoil under heightened α1-mediated peripheral vasoconstriction.',
        clinicalPearl:
          'Excessive SVR compensation increases LV afterload, worsening myocardial oxygen demand (MVO2) unless carefully titrated.',
        severity: 'compensatory',
      },
    ],
    compensatoryPathway: [
      {
        stepNumber: 1,
        phaseTitle: 'Coronary Metabolic Vasodilation',
        mechanismType: 'Hemodynamic',
        trigger: 'Myocardial ATP breakdown releases interstitial adenosine and H+/lactate accumulation.',
        physiologicalReaction: 'A2A receptor activation on distal coronary arteriolar smooth muscle opens K_ATP channels, inducing maximal microvascular dilation.',
        clinicalConsequence: 'Maintains resting perfusion until stenosis exceeds ~70%, after which coronary flow reserve is exhausted.',
      },
      {
        stepNumber: 2,
        phaseTitle: 'Sympathoadrenal Catecholamine Surge',
        mechanismType: 'Neurohormonal',
        trigger: 'Drop in LV stroke volume unloads high-pressure carotid sinus and aortic arch baroreceptors.',
        physiologicalReaction: 'Norepinephrine and epinephrine surge activates myocardial β1 receptors (increasing HR & contractility) and peripheral α1 receptors.',
        clinicalConsequence: 'Preserves systemic blood pressure acutely, but increases myocardial oxygen consumption and arrhythmia risk.',
      },
      {
        stepNumber: 3,
        phaseTitle: 'Innate Leukocyte Recruitment & Phagocytosis',
        mechanismType: 'Immunological',
        trigger: 'Necrotic cardiomyocytes release HMGB1, mitochondrial DNA, and complement C5a.',
        physiologicalReaction: 'Neutrophils infiltrate within 24h followed by Ly6C-low M2 macrophages secreting IL-10, VEGF, and TGF-β1.',
        clinicalConsequence: 'Clears necrotic debris; days 3–7 represent maximum wall softness and risk of free-wall or papillary muscle rupture.',
      },
      {
        stepNumber: 4,
        phaseTitle: 'RAAS Activation & Ventricular Matrix Remodeling',
        mechanismType: 'Cellular Remodeling',
        trigger: 'Renal hypoperfusion and β1 stimulation of juxtaglomerular cells trigger Renin -> Ang II -> Aldosterone.',
        physiologicalReaction: 'Myofibroblasts deposit cross-linked Type I collagen scar while viable myocytes undergo eccentric hypertrophy.',
        clinicalConsequence: 'Stabilizes infarct wall integrity at the cost of progressive chamber sphericity and chronic HFrEF.',
      },
    ],
  },
  {
    id: 'gi-hepatic-cirrhosis-portal-htn',
    title: 'Hepatic Cirrhosis, Portal Hypertension & Splanchnic-Renal Cascade',
    clinicalQuestion:
      'How does chronic hepatic cirrhosis distort liver architecture, cause portal hypertension, and trigger systemic splanchnic vasodilation and hepatorenal reaction?',
    organSystem: 'hepatobiliary',
    archetype3D: 'liver_portal',
    icdCode: 'ICD-10: K74.60 / K76.6',
    summary:
      'Chronic hepatocyte injury activates perisinusoidal Hepatic Stellate Cells (Ito cells) into contractile myofibroblasts, depositing bridging fibrous septa in the Space of Disse. Sinusoidal resistance elevates hepatic venous pressure gradient (HVPG > 12 mmHg), driving splanchnic NO overproduction, portosystemic varices, ascites, and renal vasoconstriction.',
    primaryInsultSummary:
      'Defenestration of hepatic sinusoidal endothelium, stellate cell collagen I/III deposition in the Space of Disse, and regenerative parenchymal nodules compressing hepatic venules.',
    hostReactionSummary:
      'Portosystemic collateral recanalization (gastroesophageal varices), shear-induced splanchnic eNOS nitric oxide vasodilation, compensatory RAAS/ADH sodium-water retention, and renal afferent vasoconstriction.',
    stages: [
      {
        stageIndex: 0,
        stageName: 'Healthy Hepatic Lobule & Low-Pressure Sinusoids',
        timeCourse: 'Baseline Physiological State',
        pathophysiologyNarrative:
          'Nutrient-rich portal venous blood (75% of hepatic inflow) and oxygen-rich hepatic arterial blood mix effortlessly across fenestrated sinusoidal endothelial cells, bathing hepatocyte microvilli in the Space of Disse.',
        bodyReactionNarrative:
          'Quiescent hepatic stellate cells store vitamin A lipid droplets while Kupffer cells maintain immunological tolerance to gut-derived antigens without fibrogenic cytokine release.',
        histologicalHallmark:
          'Regular hexagonal hepatic lobules, fenestrated sinusoids lacking a basement membrane, and quiescent lipid-rich Ito cells.',
        sceneParams: {
          stenosisRatio: 0.05,
          wallHypertrophy: 0.05,
          fibrosisIntensity: 0.02,
          inflammationLevel: 0.05,
          edemaScale: 0.0,
          perfusionSpeed: 1.4,
          lesionScale: 0.05,
          hypoxiaTint: 0.0,
          cellularInfiltrateCount: 15,
        },
        biomarkers: [
          { label: 'HVPG', value: 3.5, unit: 'mmHg', referenceRange: '1–5 mmHg', status: 'nominal', decimals: 1 },
          { label: 'Serum Albumin', value: 4.3, unit: 'g/dL', referenceRange: '3.5–5.0 g/dL', status: 'nominal', decimals: 1 },
          { label: 'INR', value: 1.0, unit: 'ratio', referenceRange: '0.9–1.1', status: 'nominal', decimals: 1 },
          { label: 'Platelets', value: 245, unit: '×10³/µL', referenceRange: '150–400', status: 'nominal', decimals: 0 },
        ],
      },
      {
        stageIndex: 1,
        stageName: 'Steatohepatitis, Stellate Activation & Perisinusoidal Fibrosis',
        timeCourse: 'Months to Years (Compensated Fibrosis F2–F3)',
        pathophysiologyNarrative:
          'Chronic metabolic, viral, or toxic insult induces hepatocyte ballooning and reactive oxygen species (ROS). Sinusoidal endothelial cells lose their fenestrations ("capillarization of sinusoids").',
        bodyReactionNarrative:
          'Kupffer cells and platelets secrete TGF-β1 and PDGF, transforming Vitamin A-storing Ito cells into α-SMA+ contractile myofibroblasts that lay down collagen I/III across portal-central tracts.',
        histologicalHallmark:
          'Hepatocyte ballooning, Mallory-Denk bodies, perivenular "chicken-wire" collagen deposition, and early portal-to-central fibrous bridging.',
        sceneParams: {
          stenosisRatio: 0.38,
          wallHypertrophy: 0.35,
          fibrosisIntensity: 0.45,
          inflammationLevel: 0.55,
          edemaScale: 0.22,
          perfusionSpeed: 1.0,
          lesionScale: 0.42,
          hypoxiaTint: 0.22,
          cellularInfiltrateCount: 68,
        },
        biomarkers: [
          { label: 'HVPG', value: 8.5, unit: 'mmHg', referenceRange: '1–5 mmHg', status: 'elevated', decimals: 1 },
          { label: 'Serum Albumin', value: 3.6, unit: 'g/dL', referenceRange: '3.5–5.0 g/dL', status: 'nominal', decimals: 1 },
          { label: 'INR', value: 1.2, unit: 'ratio', referenceRange: '0.9–1.1', status: 'elevated', decimals: 1 },
          { label: 'Platelets', value: 138, unit: '×10³/µL', referenceRange: '150–400', status: 'depressed', decimals: 0 },
        ],
      },
      {
        stageIndex: 2,
        stageName: 'Nodular Cirrhosis, Clinically Significant Portal HTN & Varices',
        timeCourse: 'Compensated to Early Decompensated Cirrhosis (HVPG ≥ 10–12 mmHg)',
        pathophysiologyNarrative:
          'Broad fibrous septa encircle regenerating hepatocyte islands into micronodules and macronodules, mechanically compressing hepatic venules. Intrahepatic endothelin-1 (ET-1) surges while intrahepatic NO falls.',
        bodyReactionNarrative:
          'To decompress the hypertensive portal vein, the body dilates embryonic portosystemic collateral channels (left gastric -> esophageal varices) and increases splanchnic arterial eNOS nitric oxide synthesis.',
        histologicalHallmark:
          'Regenerative parenchymal nodules completely surrounded by dense collagenous bands, bile ductular proliferation, and dilated portal vein radicles.',
        sceneParams: {
          stenosisRatio: 0.72,
          wallHypertrophy: 0.68,
          fibrosisIntensity: 0.82,
          inflammationLevel: 0.65,
          edemaScale: 0.58,
          perfusionSpeed: 0.5,
          lesionScale: 0.78,
          hypoxiaTint: 0.55,
          cellularInfiltrateCount: 105,
        },
        biomarkers: [
          { label: 'HVPG', value: 15.2, unit: 'mmHg', referenceRange: '1–5 mmHg', status: 'critical', decimals: 1 },
          { label: 'Serum Albumin', value: 2.8, unit: 'g/dL', referenceRange: '3.5–5.0 g/dL', status: 'depressed', decimals: 1 },
          { label: 'INR', value: 1.6, unit: 'ratio', referenceRange: '0.9–1.1', status: 'elevated', decimals: 1 },
          { label: 'Platelets', value: 78, unit: '×10³/µL', referenceRange: '150–400', status: 'critical', decimals: 0 },
        ],
      },
      {
        stageIndex: 3,
        stageName: 'Decompensated Ascites, Splanchnic Pooling & Hepatorenal Reaction',
        timeCourse: 'End-Stage Decompensated Cirrhosis (Child-Pugh C)',
        pathophysiologyNarrative:
          'Massive sinusoidal hydrostatic pressure plus hypoalbuminemia (low oncotic pressure) overwhelms thoracic duct lymphatic drainage, weeping high-SAAG fluid into the peritoneal cavity (ascites) while ammonia bypasses hepatic urea cycle detox.',
        bodyReactionNarrative:
          'Profound splanchnic arterial vasodilation causes "effective arterial underfilling." Kidneys perceive hypovolemia and unleash extreme RAAS, sympathetic, and ADH vasoconstriction—clamping renal cortical perfusion (Hepatorenal Syndrome).',
        histologicalHallmark:
          'Shrunken fibrotic liver with coarse macronodules, dilated engorged splanchnic/variceal veins, and structurally intact but intensely vasoconstricted renal cortex.',
        sceneParams: {
          stenosisRatio: 0.88,
          wallHypertrophy: 0.9,
          fibrosisIntensity: 0.98,
          inflammationLevel: 0.82,
          edemaScale: 0.95,
          perfusionSpeed: 0.22,
          lesionScale: 0.96,
          hypoxiaTint: 0.82,
          cellularInfiltrateCount: 145,
        },
        biomarkers: [
          { label: 'HVPG', value: 21.4, unit: 'mmHg', referenceRange: '1–5 mmHg', status: 'critical', decimals: 1 },
          { label: 'Serum Albumin', value: 2.1, unit: 'g/dL', referenceRange: '3.5–5.0 g/dL', status: 'critical', decimals: 1 },
          { label: 'INR', value: 2.3, unit: 'ratio', referenceRange: '0.9–1.1', status: 'critical', decimals: 1 },
          { label: 'Platelets', value: 46, unit: '×10³/µL', referenceRange: '150–400', status: 'critical', decimals: 0 },
        ],
      },
    ],
    hotspots: [
      {
        id: 'hs-sinusoid-disse',
        indexNumber: 1,
        label: 'Fibrotic Space of Disse & Stellate Matrix',
        anatomicalStructure: 'Hepatic Parenchyma & Perisinusoidal Space',
        position3D: [0.45, 0.35, 0.85],
        pathologyEffect:
          'Activated Ito myofibroblasts deposit dense Type I/III collagen and contract around sinusoids in response to endothelin-1.',
        bodyReaction:
          'Kupffer cell TGF-β1 attempts tissue wound-healing, inadvertently sealing sinusoidal fenestrations and blocking hepatocyte-plasma exchange.',
        histologicalFinding:
          'Bridging trichrome-positive collagen septa encircling regenerative hepatocyte nodules.',
        clinicalPearl:
          'Non-selective β-blockers (carvedilol, propranolol) reduce portal inflow and intrahepatic resistance.',
        severity: 'critical',
      },
      {
        id: 'hs-portal-trunk',
        indexNumber: 2,
        label: 'Hypertensive Main Portal Vein & Splanchnic Inflow',
        anatomicalStructure: 'Extrahepatic Portal Vein Confluence',
        position3D: [-0.25, -0.78, 0.62],
        pathologyEffect:
          'Portal venous pressure rises above 12 mmHg due to both fixed architectural nodularity (70%) and dynamic stellate vasoconstriction (30%).',
        bodyReaction:
          'Splanchnic arterioles overproduce eNOS-derived nitric oxide and prostacyclin, inducing hyperdynamic splanchnic inflow that paradoxically worsens portal hypertension.',
        histologicalFinding:
          'Portal vein dilation, intimal thickening, and congested splenic/mesenteric tributaries.',
        clinicalPearl:
          'SAAG (Serum-Ascites Albumin Gradient) ≥ 1.1 g/dL confirms portal hypertension as the driver of ascites.',
        severity: 'critical',
      },
      {
        id: 'hs-variceal-collaterals',
        indexNumber: 3,
        label: 'Coronary-Gastroesophageal Variceal Collaterals',
        anatomicalStructure: 'Left Gastric Vein & Distal Esophageal Submucosal Plexus',
        position3D: [-0.95, 0.65, 0.45],
        pathologyEffect:
          'Retrograde hepatofugal flow engorges thin-walled submucosal esophageal veins lacking external tissue support.',
        bodyReaction:
          'VEGF-driven angiogenesis and collateral vasodilation attempt to shunt portal blood directly into the azygos/systemic venous system.',
        histologicalFinding:
          'Tortuous, thin-walled dilated submucosal venous channels with focal "red wale" tension thinning.',
        clinicalPearl:
          'Variceal rupture risk correlates directly with HVPG > 12 mmHg and vessel wall tension (Laplace law).',
        severity: 'compensatory',
      },
      {
        id: 'hs-hepatic-outflow',
        indexNumber: 4,
        label: 'Compressed Hepatic Venous Outflow',
        anatomicalStructure: 'Right & Middle Hepatic Veins / IVC Junction',
        position3D: [0.15, 1.12, -0.35],
        pathologyEffect:
          'Regenerative parenchymal nodules externally compress central and hepatic venules, creating post-sinusoidal outflow impedance.',
        bodyReaction:
          'Hepatic arterial buffer response (HABR) dilates the hepatic artery via adenosine washout changes to defend total hepatic oxygen delivery.',
        histologicalFinding:
          'Obliterative fibrous venopathy and distorted central vein architecture.',
        clinicalPearl:
          'TIPS (Transjugular Intrahepatic Portosystemic Shunt) creates a direct low-resistance channel from portal vein to hepatic vein.',
        severity: 'compensatory',
      },
    ],
    compensatoryPathway: [
      {
        stepNumber: 1,
        phaseTitle: 'Stellate Myofibroblast Wound-Healing Response',
        mechanismType: 'Cellular Remodeling',
        trigger: 'Hepatocyte necrosis and DAMPs activate resident Kupffer macrophages.',
        physiologicalReaction: 'Secretion of TGF-β1 and PDGF converts quiescent Ito cells into contractile collagen-producing myofibroblasts.',
        clinicalConsequence: 'Increases intrahepatic vascular resistance and elevates HVPG > 10 mmHg.',
      },
      {
        stepNumber: 2,
        phaseTitle: 'Splanchnic Arterial Vasodilation & Collateral Shunting',
        mechanismType: 'Hemodynamic',
        trigger: 'Portal venous congestion and bacterial translocation (endotoxemia) stimulate splanchnic eNOS and iNOS.',
        physiologicalReaction: 'Massive nitric oxide release dilates mesenteric arterioles and opens portosystemic collaterals (esophageal, umbilical, rectal).',
        clinicalConsequence: 'Pools blood in the splanchnic bed, lowering systemic vascular resistance (SVR) and causing effective arterial hypovolemia.',
      },
      {
        stepNumber: 3,
        phaseTitle: 'Neurohormonal Sodium & Water Retention',
        mechanismType: 'Neurohormonal',
        trigger: 'Carotid and renal baroreceptors sense splanchnic pooling as systemic arterial underfilling.',
        physiologicalReaction: 'Hyperactivation of RAAS (Aldosterone), sympathetic nervous system, and non-osmotic ADH (vasopressin) release.',
        clinicalConsequence: 'Renal retention of Na+ and free water spills into the high-pressure peritoneal cavity as refractory ascites and hyponatremia.',
      },
      {
        stepNumber: 4,
        phaseTitle: 'Renal Cortical Vasoconstriction (Hepatorenal Cascade)',
        mechanismType: 'Hemodynamic',
        trigger: 'Overwhelming angiotensin II, endothelin, and sympathetic tone outstrip renal vasodilatory prostaglandins (PGE2/PGI2).',
        physiologicalReaction: 'Severe constriction of renal afferent arterioles reduces glomerular filtration pressure without acute tubular necrosis.',
        clinicalConsequence: 'Functional oliguric renal failure (Hepatorenal Syndrome); treated with terlipressin/norepinephrine + albumin.',
      },
    ],
  },
  {
    id: 'renal-diabetic-nephropathy',
    title: 'Diabetic Nephropathy, Glomerular Hyperfiltration & Mesangial Sclerosis',
    clinicalQuestion:
      'How does chronic hyperglycemia damage the renal glomerulus and nephron, and how does the kidney react hemodynamically and structurally?',
    organSystem: 'renal',
    archetype3D: 'kidney_nephron',
    icdCode: 'ICD-10: E11.21 / N18.4',
    summary:
      'Chronic hyperglycemia drives proximal tubular SGLT2 hyper-reabsorption of glucose and Na+, reducing NaCl delivery to the macula densa. Tubuloglomerular feedback dilates the afferent arteriole while Angiotensin II constricts the efferent arteriole—creating intraglomerular hypertension, GBM thickening, podocyte foot-process effacement, and Kimmelstiel-Wilson nodular glomerulosclerosis.',
    primaryInsultSummary:
      'Non-enzymatic glycation (AGEs) of the glomerular basement membrane, loss of heparan sulfate negative charge barrier, and oxidative podocyte apoptosis.',
    hostReactionSummary:
      'Maladaptive tubuloglomerular feedback (afferent vasodilation + Ang II efferent vasoconstriction), mesangial matrix expansion via TGF-β1, and single-nephron hyperfiltration in surviving nephrons.',
    stages: [
      {
        stageIndex: 0,
        stageName: 'Healthy Glomerular Filtration Barrier & Autoregulation',
        timeCourse: 'Baseline Normoglycemic State',
        pathophysiologyNarrative:
          'Balanced afferent and efferent arteriolar tone maintains normal glomerular capillary hydrostatic pressure (~55 mmHg). Fenestrated endothelium, negatively charged GBM, and interlocking podocyte slit diaphragms selectively filter plasma while retaining albumin.',
        bodyReactionNarrative:
          'Macula densa cells sense physiological distal NaCl delivery and calibrate afferent arteriolar tone via adenosine/ATP tubuloglomerular feedback (TGF).',
        histologicalHallmark:
          'Delicate glomerular capillary loops, uniform GBM (~320 nm), intact nephrin/podocin slit diaphragms, and quiescent mesangium.',
        sceneParams: {
          stenosisRatio: 0.05,
          wallHypertrophy: 0.05,
          fibrosisIntensity: 0.0,
          inflammationLevel: 0.05,
          edemaScale: 0.0,
          perfusionSpeed: 1.45,
          lesionScale: 0.05,
          hypoxiaTint: 0.0,
          cellularInfiltrateCount: 14,
        },
        biomarkers: [
          { label: 'eGFR', value: 104, unit: 'mL/min/1.73m²', referenceRange: '> 90', status: 'nominal', decimals: 0 },
          { label: 'UACR', value: 8, unit: 'mg/g', referenceRange: '< 30 mg/g', status: 'nominal', decimals: 0 },
          { label: 'Serum Creatinine', value: 0.85, unit: 'mg/dL', referenceRange: '0.7–1.2 mg/dL', status: 'nominal', decimals: 2 },
          { label: 'Intraglom. Pressure', value: 54, unit: 'mmHg', referenceRange: '50–58 mmHg', status: 'nominal', decimals: 0 },
        ],
      },
      {
        stageIndex: 1,
        stageName: 'SGLT2 Hyper-Reabsorption & Glomerular Hyperfiltration',
        timeCourse: 'Years 1–5 (Hyperfiltration & GBM Thickening)',
        pathophysiologyNarrative:
          'Filtered glucose load upregulates proximal tubule SGLT2 cotransporters, avidly reabsorbing both glucose and Na+. Consequently, less NaCl reaches the distal macula densa.',
        bodyReactionNarrative:
          'The macula densa misinterprets low distal NaCl as renal hypoperfusion: it turns off adenosine afferent constriction (dilating the afferent arteriole) and stimulates renin/Angiotensin II (constricting the efferent arteriole), spiking GFR by 20–40%.',
        histologicalHallmark:
          'Glomerular hypertrophy, diffuse thickening of the glomerular basement membrane (GBM > 450 nm) via collagen IV α3/α4/α5 synthesis, and hyaline arteriolosclerosis.',
        sceneParams: {
          stenosisRatio: 0.32,
          wallHypertrophy: 0.42,
          fibrosisIntensity: 0.28,
          inflammationLevel: 0.38,
          edemaScale: 0.25,
          perfusionSpeed: 1.95,
          lesionScale: 0.35,
          hypoxiaTint: 0.15,
          cellularInfiltrateCount: 45,
        },
        biomarkers: [
          { label: 'eGFR', value: 136, unit: 'mL/min/1.73m²', referenceRange: '90–120', status: 'elevated', decimals: 0 },
          { label: 'UACR', value: 24, unit: 'mg/g', referenceRange: '< 30 mg/g', status: 'nominal', decimals: 0 },
          { label: 'Serum Creatinine', value: 0.68, unit: 'mg/dL', referenceRange: '0.7–1.2 mg/dL', status: 'depressed', decimals: 2 },
          { label: 'Intraglom. Pressure', value: 68, unit: 'mmHg', referenceRange: '50–58 mmHg', status: 'elevated', decimals: 0 },
        ],
      },
      {
        stageIndex: 2,
        stageName: 'Podocyte Effacement, Microalbuminuria & Mesangial Expansion',
        timeCourse: 'Years 5–12 (Moderately Increased Albuminuria)',
        pathophysiologyNarrative:
          'Advanced Glycation End-products (AGEs) cross-link matrix proteins and deplete negatively charged heparan sulfate proteoglycans. Intraglomerular shear stress detaches podocyte foot processes, allowing albumin to leak into Bowman space.',
        bodyReactionNarrative:
          'Mesangial cells respond to mechanical stretch and AGE-RAGE signaling by secreting TGF-β1 and VEGF, depositing excess mesangial matrix that encroaches on capillary surface area.',
        histologicalHallmark:
          'Diffuse mesangial matrix expansion, podocyte foot-process effacement on EM, and both afferent and efferent hyaline arteriolosclerosis.',
        sceneParams: {
          stenosisRatio: 0.62,
          wallHypertrophy: 0.68,
          fibrosisIntensity: 0.65,
          inflammationLevel: 0.68,
          edemaScale: 0.55,
          perfusionSpeed: 0.85,
          lesionScale: 0.72,
          hypoxiaTint: 0.48,
          cellularInfiltrateCount: 92,
        },
        biomarkers: [
          { label: 'eGFR', value: 62, unit: 'mL/min/1.73m²', referenceRange: '> 90', status: 'depressed', decimals: 0 },
          { label: 'UACR', value: 185, unit: 'mg/g', referenceRange: '< 30 mg/g', status: 'elevated', decimals: 0 },
          { label: 'Serum Creatinine', value: 1.42, unit: 'mg/dL', referenceRange: '0.7–1.2 mg/dL', status: 'elevated', decimals: 2 },
          { label: 'Intraglom. Pressure', value: 72, unit: 'mmHg', referenceRange: '50–58 mmHg', status: 'critical', decimals: 0 },
        ],
      },
      {
        stageIndex: 3,
        stageName: 'Kimmelstiel-Wilson Nodular Sclerosis & Tubulointerstitial Fibrosis',
        timeCourse: 'Years 12–20+ (Overt Nephropathy / CKD Stage 4–5)',
        pathophysiologyNarrative:
          'Acellular PAS-positive laminated mesangial nodules (Kimmelstiel-Wilson lesions) obliterate glomerular capillary tufts. Heavy filtered proteinuria is toxic to proximal tubular cells, driving peritubular capillary rarefaction.',
        bodyReactionNarrative:
          'Surviving nephrons undergo extreme compensatory hyperfiltration while tubular epithelial cells release MCP-1 and osteopontin, recruiting interstitial macrophages and driving irreversible tubulointerstitial fibrosis.',
        histologicalHallmark:
          'Pathognomonic Kimmelstiel-Wilson eosinophilic mesangial nodules, global glomerulosclerosis, tubular atrophy, and interstitial fibrosis.',
        sceneParams: {
          stenosisRatio: 0.86,
          wallHypertrophy: 0.88,
          fibrosisIntensity: 0.96,
          inflammationLevel: 0.78,
          edemaScale: 0.82,
          perfusionSpeed: 0.3,
          lesionScale: 0.95,
          hypoxiaTint: 0.78,
          cellularInfiltrateCount: 132,
        },
        biomarkers: [
          { label: 'eGFR', value: 24, unit: 'mL/min/1.73m²', referenceRange: '> 90', status: 'critical', decimals: 0 },
          { label: 'UACR', value: 1420, unit: 'mg/g', referenceRange: '< 30 mg/g', status: 'critical', decimals: 0 },
          { label: 'Serum Creatinine', value: 3.15, unit: 'mg/dL', referenceRange: '0.7–1.2 mg/dL', status: 'critical', decimals: 2 },
          { label: 'Intraglom. Pressure', value: 76, unit: 'mmHg', referenceRange: '50–58 mmHg', status: 'critical', decimals: 0 },
        ],
      },
    ],
    hotspots: [
      {
        id: 'hs-glomerular-tuft',
        indexNumber: 1,
        label: 'Glomerular Capillary Tuft & Kimmelstiel-Wilson Nodules',
        anatomicalStructure: 'Renal Corpuscle & Mesangial Core',
        position3D: [0.28, 0.65, 0.85],
        pathologyEffect:
          'Non-enzymatic glycation cross-links Type IV collagen and depletes heparan sulfate, while mesangial matrix expands into laminated acellular nodules.',
        bodyReaction:
          'Mesangial cells secrete TGF-β1 and fibronectin in response to high capillary wall tension, progressively obliterating filtration surface area.',
        histologicalFinding:
          'PAS-positive nodular glomerulosclerosis (Kimmelstiel-Wilson) and diffuse GBM thickening.',
        clinicalPearl:
          'Loss of negative charge barrier causes selective albuminuria long before large globulins appear in urine.',
        severity: 'critical',
      },
      {
        id: 'hs-efferent-arteriole',
        indexNumber: 2,
        label: 'Efferent Arteriole Hyaline Vasoconstriction',
        anatomicalStructure: 'Glomerular Efferent & Afferent Arteriolar Pole',
        position3D: [-0.55, 0.42, 0.72],
        pathologyEffect:
          'Plasma proteins insudate into the arteriolar wall, causing pink glassy hyaline arteriolosclerosis of both afferent and efferent vessels.',
        bodyReaction:
          'Local Angiotensin II preferentially constricts the efferent arteriole via AT1 receptors, elevating hydrostatic filtration pressure (P_GC).',
        histologicalFinding:
          'Amorphous eosinophilic hyaline thickening of afferent AND efferent arteriolar walls (distinctive for diabetic nephropathy).',
        clinicalPearl:
          'ACE inhibitors / ARBs dilate the efferent arteriole, lowering intraglomerular pressure and slowing nephron loss.',
        severity: 'compensatory',
      },
      {
        id: 'hs-proximal-tubule-macula',
        indexNumber: 3,
        label: 'Proximal Tubule SGLT2 & Macula Densa Feedback Loop',
        anatomicalStructure: 'Proximal Convoluted Tubule & Juxtaglomerular Apparatus',
        position3D: [0.42, -0.45, 0.78],
        pathologyEffect:
          'Excess filtered glucose drives SGLT2 hyper-reabsorption of Na+ and glucose, starving the distal macula densa of NaCl.',
        bodyReaction:
          'Macula densa decreases adenosine signaling (dilating the afferent arteriole) and triggers juxtaglomerular renin release.',
        histologicalFinding:
          'Proximal tubular hypertrophy, glycogen-laden Armanni-Ebstein cells, and downstream tubular atrophy.',
        clinicalPearl:
          'SGLT2 inhibitors (empagliflozin, dapagliflozin) restore distal Na+ delivery to the macula densa, restoring afferent tone and reducing hyperfiltration.',
        severity: 'compensatory',
      },
      {
        id: 'hs-renal-medulla-interstitium',
        indexNumber: 4,
        label: 'Peritubular Capillary Bed & Medullary Interstitium',
        anatomicalStructure: 'Renal Cortex-Medulla Junction & Interstitium',
        position3D: [-0.25, -0.85, 0.55],
        pathologyEffect:
          'Proteinuria-induced tubular NF-κB activation and efferent arteriolar narrowing cause peritubular capillary hypoxia.',
        bodyReaction:
          'Interstitial fibroblasts and macrophages deposit collagen while peritubular interstitial cells reduce erythropoietin (EPO) synthesis.',
        histologicalFinding:
          'Tubular thyroidization, interstitial mononuclear infiltrate, and peritubular fibrosis.',
        clinicalPearl:
          'Declining eGFR correlates most closely with the severity of tubulointerstitial fibrosis rather than glomerular histology alone.',
        severity: 'critical',
      },
    ],
    compensatoryPathway: [
      {
        stepNumber: 1,
        phaseTitle: 'Proximal Tubular SGLT2 Hyper-Reabsorption',
        mechanismType: 'Cellular Remodeling',
        trigger: 'Filtered glucose load exceeds normal physiological concentration in Bowman space.',
        physiologicalReaction: 'Proximal tubular epithelial cells upregulate SGLT2 expression, co-transporting Na+ and glucose back into peritubular capillaries.',
        clinicalConsequence: 'Depletes Na+ and Cl- concentration in tubular fluid reaching the distal thick ascending limb.',
      },
      {
        stepNumber: 2,
        phaseTitle: 'Maladaptive Tubuloglomerular Feedback (TGF)',
        mechanismType: 'Hemodynamic',
        trigger: 'Macula densa NKCC2 sensors detect low luminal NaCl delivery.',
        physiologicalReaction: 'Decreased ATP/adenosine release dilates the afferent arteriole while juxtaglomerular renin/Ang II constricts the efferent arteriole.',
        clinicalConsequence: 'Elevates intraglomerular hydrostatic pressure (P_GC) and drives hyperfiltration.',
      },
      {
        stepNumber: 3,
        phaseTitle: 'AGE-RAGE Signaling & Mesangial TGF-β1 Matrix Synthesis',
        mechanismType: 'Immunological',
        trigger: 'Hyperglycemia non-enzymatically glycates GBM collagen and activates RAGE receptors on mesangial cells and podocytes.',
        physiologicalReaction: 'ROS generation and TGF-β1 secretion stimulate collagen IV and fibronectin deposition while inducing podocyte apoptosis.',
        clinicalConsequence: 'Slit diaphragm disruption causes progression from microalbuminuria to overt nephrotic-range proteinuria.',
      },
      {
        stepNumber: 4,
        phaseTitle: 'Proteinuric Tubular Toxicity & Interstitial Scarring',
        mechanismType: 'Cellular Remodeling',
        trigger: 'Proximal tubules endocytose excessive filtered albumin and free fatty acids.',
        physiologicalReaction: 'Lysosomal rupture activates NLRP3 inflammasomes and chemokines (MCP-1), recruiting macrophages and myofibroblasts.',
        clinicalConsequence: 'Irreversible tubulointerstitial fibrosis, nephron drop-out, and progression to ESRD.',
      },
    ],
  },
  {
    id: 'gi-peptic-ulcer-perforation',
    title: 'Peptic Ulcer Disease, Mucosal Barrier Breakdown & Perforation Reaction',
    clinicalQuestion:
      'How do H. pylori and NSAIDs erode the gastroduodenal mucosa into a penetrating peptic ulcer, and how does the GI wall and peritoneum react?',
    organSystem: 'gastrointestinal',
    archetype3D: 'gi_mucosa_ulcer',
    icdCode: 'ICD-10: K25.5 / K26.5',
    summary:
      'Disruption of the gastroduodenal mucus-bicarbonate-prostaglandin barrier by H. pylori urease/CagA toxins or NSAID COX-1 inhibition exposes epithelial cells to back-diffusing HCl and pepsin (pH 1.5). Progressive transmural necrosis erodes through the muscularis propria, risking gastroduodenal artery hemorrhage or free peritoneal perforation.',
    primaryInsultSummary:
      'Loss of PGE2-mediated mucus/bicarbonate secretion and mucosal blood flow, combined with H. pylori CagA/VacA cytotoxins and acid-peptic autodigestion.',
    hostReactionSummary:
      'Epithelial restitution migration, granulation tissue angiogenesis at the ulcer base, muscularis scar contraction, and acute peritoneal neutrophil/fibrin walling-off upon perforation.',
    stages: [
      {
        stageIndex: 0,
        stageName: 'Intact Mucus-Bicarbonate Barrier & Mucosal Perfusion',
        timeCourse: 'Baseline Gastroduodenal Homeostasis',
        pathophysiologyNarrative:
          'Despite luminal gastric acid at pH 1.5–2.0, surface foveolar cells remain at neutral pH 7.0 beneath an unstirred mucin gel layer buffered by HCO3- secretion.',
        bodyReactionNarrative:
          'Endogenous prostaglandins (PGE2, PGI2) continuously stimulate mucin synthesis, bicarbonate transport, and rich submucosal capillary blood flow to sweep away any back-diffused H+ ions.',
        histologicalHallmark:
          'Intact tall columnar foveolar epithelium, thickPAS-positive surface mucin layer, and uninflamed lamina propria.',
        sceneParams: {
          stenosisRatio: 0.05,
          wallHypertrophy: 0.05,
          fibrosisIntensity: 0.0,
          inflammationLevel: 0.05,
          edemaScale: 0.0,
          perfusionSpeed: 1.4,
          lesionScale: 0.05,
          hypoxiaTint: 0.0,
          cellularInfiltrateCount: 15,
        },
        biomarkers: [
          { label: 'Mucosal Surface pH', value: 6.9, unit: 'pH', referenceRange: '6.5–7.2', status: 'nominal', decimals: 1 },
          { label: 'Hemoglobin', value: 14.4, unit: 'g/dL', referenceRange: '13.5–17.5', status: 'nominal', decimals: 1 },
          { label: 'Serum Gastrin', value: 48, unit: 'pg/mL', referenceRange: '< 100 pg/mL', status: 'nominal', decimals: 0 },
          { label: 'WBC Count', value: 6.4, unit: '×10³/µL', referenceRange: '4.5–11.0', status: 'nominal', decimals: 1 },
        ],
      },
      {
        stageIndex: 1,
        stageName: 'Barrier Breakdown, Back-Diffusion of H+ & Active Gastritis',
        timeCourse: 'Days to Weeks (Erosive Gastritis / Duodenitis)',
        pathophysiologyNarrative:
          'H. pylori urease generates ammonia and protease that thin the mucus gel, while NSAIDs inhibit COX-1, cutting PGE2 levels. Luminal H+ and pepsin back-diffuse across weakened tight junctions.',
        bodyReactionNarrative:
          'Gastric epithelial cells secrete IL-8 to recruit neutrophils into the lamina propria. Histamine release from mast cells attempts reactive hyperemia, while somatostatin D-cells are inhibited, increasing acid drive.',
        histologicalHallmark:
          'Superficial mucosal erosion confined above the muscularis mucosae, neutrophilic pit abscesses, and lamina propria edema.',
        sceneParams: {
          stenosisRatio: 0.28,
          wallHypertrophy: 0.3,
          fibrosisIntensity: 0.2,
          inflammationLevel: 0.58,
          edemaScale: 0.38,
          perfusionSpeed: 1.15,
          lesionScale: 0.38,
          hypoxiaTint: 0.2,
          cellularInfiltrateCount: 64,
        },
        biomarkers: [
          { label: 'Mucosal Surface pH', value: 4.1, unit: 'pH', referenceRange: '6.5–7.2', status: 'depressed', decimals: 1 },
          { label: 'Hemoglobin', value: 13.1, unit: 'g/dL', referenceRange: '13.5–17.5', status: 'depressed', decimals: 1 },
          { label: 'Serum Gastrin', value: 118, unit: 'pg/mL', referenceRange: '< 100 pg/mL', status: 'elevated', decimals: 0 },
          { label: 'WBC Count', value: 9.8, unit: '×10³/µL', referenceRange: '4.5–11.0', status: 'nominal', decimals: 1 },
        ],
      },
      {
        stageIndex: 2,
        stageName: 'Deep Chronic Peptic Ulcer Crater &的四-Layer Askanazy Reaction',
        timeCourse: 'Weeks to Months (Penetrating Submucosal/Muscularis Ulcer)',
        pathophysiologyNarrative:
          'Acid-peptic digestion breaches the muscularis mucosae into the submucosa and muscularis propria, forming a sharply punched-out ulcer crater with overhanging mucosal margins.',
        bodyReactionNarrative:
          'The host mounts the classic 4-zone Askanazy defensive base: (1) superficial fibrinopurulent exudate, (2) fibrinoid necrosis, (3) vascular granulation tissue, and (4) deep collagenous scar with obliterative endarteritis to prevent bleeding.',
        histologicalHallmark:
          'Sharp punched-out crater with 4 Askanazy zones, radiating mucosal folds, and hypertrophied submucosal nerve trunks.',
        sceneParams: {
          stenosisRatio: 0.58,
          wallHypertrophy: 0.65,
          fibrosisIntensity: 0.68,
          inflammationLevel: 0.78,
          edemaScale: 0.62,
          perfusionSpeed: 0.75,
          lesionScale: 0.78,
          hypoxiaTint: 0.52,
          cellularInfiltrateCount: 112,
        },
        biomarkers: [
          { label: 'Mucosal Surface pH', value: 2.3, unit: 'pH', referenceRange: '6.5–7.2', status: 'critical', decimals: 1 },
          { label: 'Hemoglobin', value: 9.6, unit: 'g/dL', referenceRange: '13.5–17.5', status: 'critical', decimals: 1 },
          { label: 'Serum Gastrin', value: 145, unit: 'pg/mL', referenceRange: '< 100 pg/mL', status: 'elevated', decimals: 0 },
          { label: 'WBC Count', value: 12.6, unit: '×10³/µL', referenceRange: '4.5–11.0', status: 'elevated', decimals: 1 },
        ],
      },
      {
        stageIndex: 3,
        stageName: 'Transmural Perforation / Arterial Erosion & Peritoneal Defense',
        timeCourse: 'Acute Surgical Emergency (Hours)',
        pathophysiologyNarrative:
          'Posterior duodenal ulcers erode into the gastroduodenal artery causing massive hemorrhage, whereas anterior ulcers perforate full-thickness through the serosa, spilling acid, bile, and gas into the peritoneal cavity.',
        bodyReactionNarrative:
          'Peritoneal mesothelial cells trigger explosive chemical peritonitis: omental migration attempts to seal the perforation with fibrin exudate, somatic abdominal wall muscles contract reflexively (board-like rigidity), and third-spacing triggers hypovolemic shock.',
        histologicalHallmark:
          'Full-thickness transmural serosal defect, eroded submucosal arterial wall with fibrin plug, and acute fibrinous serositis.',
        sceneParams: {
          stenosisRatio: 0.85,
          wallHypertrophy: 0.85,
          fibrosisIntensity: 0.88,
          inflammationLevel: 0.96,
          edemaScale: 0.92,
          perfusionSpeed: 0.35,
          lesionScale: 0.98,
          hypoxiaTint: 0.8,
          cellularInfiltrateCount: 155,
        },
        biomarkers: [
          { label: 'Mucosal Surface pH', value: 1.7, unit: 'pH', referenceRange: '6.5–7.2', status: 'critical', decimals: 1 },
          { label: 'Hemoglobin', value: 7.2, unit: 'g/dL', referenceRange: '13.5–17.5', status: 'critical', decimals: 1 },
          { label: 'Serum Lactate', value: 4.8, unit: 'mmol/L', referenceRange: '0.5–2.0', status: 'critical', decimals: 1 },
          { label: 'WBC Count', value: 19.4, unit: '×10³/µL', referenceRange: '4.5–11.0', status: 'critical', decimals: 1 },
        ],
      },
    ],
    hotspots: [
      {
        id: 'hs-ulcer-crater',
        indexNumber: 1,
        label: 'Punched-Out Ulcer Crater & Fibrinoid Base',
        anatomicalStructure: 'Lesser Curvature Antrum / First Part of Duodenum',
        position3D: [0.0, 0.22, 0.95],
        pathologyEffect:
          'Coagulative acid-peptic necrosis destroys mucosa, muscularis mucosae, and submucosa down to the muscularis propria.',
        bodyReaction:
          'Surface fibrinopurulent exudate and underlying vascular granulation tissue (Askanazy zones) attempt to wall off luminal acid.',
        histologicalFinding:
          'Clean, sharply demarcated edges (unlike heaped-up malignant margins) with radiating mucosal folds.',
        clinicalPearl:
          'Gastric ulcers on the lesser curvature always require biopsy of margins to exclude signet-ring adenocarcinoma.',
        severity: 'critical',
      },
      {
        id: 'hs-submucosal-artery',
        indexNumber: 2,
        label: 'Submucosal Gastroduodenal / Left Gastric Artery Branch',
        anatomicalStructure: 'Submucosal Vascular Plexus at Ulcer Floor',
        position3D: [0.55, -0.35, 0.65],
        pathologyEffect:
          'Necrotic digestion erodes the lateral wall of the gastroduodenal artery (posterior duodenal ulcer) or left gastric artery.',
        bodyReaction:
          'Reactive obliterative endarteritis proliferates intimal smooth muscle to narrow the vessel lumen before ulceration breaches it.',
        histologicalFinding:
          'Visible sentinel clot ("Forrest IIa visible vessel") with focal transmural arterial wall necrosis.',
        clinicalPearl:
          'Posterior duodenal bulb ulcers bleed from the gastroduodenal artery and may cause acute pancreatitis.',
        severity: 'critical',
      },
      {
        id: 'hs-mucus-barrier',
        indexNumber: 3,
        label: 'Marginal Foveolar Epithelium & Mucus-HCO3 Zone',
        anatomicalStructure: 'Peri-Ulcer Gastric Mucosal Margin',
        position3D: [-0.72, 0.45, 0.58],
        pathologyEffect:
          'COX-1 inhibition or H. pylori colonization depletes protective PGE2 and thins the surface mucin layer.',
        bodyReaction:
          'Surviving crypt neck stem cells upregulate EGF-receptor signaling and flatten to migrate across the denuded basement membrane ("epithelial restitution").',
        histologicalFinding:
          'Regenerative foveolar hyperplasia, mucin depletion, and lamina propria plasma cell/neutrophil infiltrate.',
        clinicalPearl:
          'Proton pump inhibitors (PPIs) raise intragastric pH > 4.0, stabilizing platelet clots and inactivating pepsinogen.',
        severity: 'compensatory',
      },
      {
        id: 'hs-serosal-peritoneum',
        indexNumber: 4,
        label: 'Serosal Coat & Omental Containment Reaction',
        anatomicalStructure: 'Visceral Peritoneum & Muscularis Propria',
        position3D: [0.18, -0.78, -0.45],
        pathologyEffect:
          'Anterior duodenal wall perforation releases gastric acid and air into the peritoneal cavity (pneumoperitoneum under diaphragm).',
        bodyReaction:
          'The greater omentum ("policeman of the abdomen") migrates via chemotactic fibrin gradients to plug the serosal defect.',
        histologicalFinding:
          'Transmural defect lined by dense neutrophilic exudate, mesothelial reactive hyperplasia, and fibrin adhesions.',
        clinicalPearl:
          'Phrenic nerve irritation (C3–C5) from subdiaphragmatic air/acid causes referred pain to the shoulder tip (Kehr sign).',
        severity: 'critical',
      },
    ],
    compensatoryPathway: [
      {
        stepNumber: 1,
        phaseTitle: 'Prostaglandin-Mediated Mucosal Hyperemia',
        mechanismType: 'Hemodynamic',
        trigger: 'Back-diffusion of luminal H+ ions stimulates capsaicin-sensitive afferent sensory neurons in the lamina propria.',
        physiologicalReaction: 'Release of CGRP and nitric oxide dilates submucosal arterioles to deliver HCO3- and buffer intracellular acidosis.',
        clinicalConsequence: 'NSAIDs abolish this protective hyperemic reflex, rapidly accelerating deep mucosal necrosis.',
      },
      {
        stepNumber: 2,
        phaseTitle: 'Epithelial Restitution & EGF Proliferation',
        mechanismType: 'Cellular Remodeling',
        trigger: 'Focal denudation of surface foveolar cells exposes the basal lamina.',
        physiologicalReaction: 'Adjacent viable epithelial cells extend lamellipodia and migrate across the defect within hours, stimulated by salivary/mucosal EGF and TGF-α.',
        clinicalConsequence: 'Repairs superficial erosions rapidly if luminal pH is buffered above 4.0.',
      },
      {
        stepNumber: 3,
        phaseTitle: 'Askanazy Zonal Granulation & Obliterative Endarteritis',
        mechanismType: 'Immunological',
        trigger: 'Breach of muscularis mucosae exposes submucosal collagen and vessels to pepsin.',
        physiologicalReaction: 'Macrophages and fibroblasts form a 4-layer barrier and induce intimal proliferation inside underlying arteries to thrombose them prior to erosion.',
        clinicalConsequence: 'Prevents fatal hemorrhage in most ulcers, though large vessels (>1 mm) cannot fully obliterate.',
      },
      {
        stepNumber: 4,
        phaseTitle: 'Peritoneal Fibrin Sealing & Somatic Guarding Reflex',
        mechanismType: 'Neurohormonal',
        trigger: 'Full-thickness serosal perforation spills chemical acid into the peritoneal cavity.',
        physiologicalReaction: 'Peritoneal nociceptors trigger spinal reflex contraction of rectus abdominis muscles and omental fibrin adhesion.',
        clinicalConsequence: 'Produces classic board-like abdominal rigidity and localized or generalized peritonitis.',
      },
    ],
  },
  {
    id: 'resp-ards-alveolar-damage',
    title: 'Acute Respiratory Distress Syndrome (ARDS) & Alveolar-Capillary Reaction',
    clinicalQuestion:
      'How does severe sepsis or pneumonia cause diffuse alveolar damage in ARDS, and how do the lungs and pulmonary vasculature react?',
    organSystem: 'respiratory',
    archetype3D: 'lung_alveoli',
    icdCode: 'ICD-10: J80',
    summary:
      'Cytokine storm (TNF-α, IL-1β, IL-6, IL-8) activates pulmonary capillary neutrophils, releasing elastase and ROS that breach the endothelial-epithelial barrier. Protein-rich edema floods alveoli, inactivates surfactant, forms hyaline membranes, and triggers hypoxic pulmonary vasoconstriction.',
    primaryInsultSummary:
      'Necrosis of Type I pneumocytes and capillary endothelial gap formation, flooding alveoli with proteinaceous exudate and destroying Type II surfactant.',
    hostReactionSummary:
      'Euler-Liljestrand hypoxic pulmonary vasoconstriction (HPV) to minimize V/Q shunt, Type II pneumocyte hyperplasia, and TGF-β fibroproliferative remodeling.',
    stages: [
      {
        stageIndex: 0,
        stageName: 'Healthy Alveolar-Capillary Gas Exchange Unit',
        timeCourse: 'Baseline Normoxic State',
        pathophysiologyNarrative:
          'Ultra-thin alveolar-capillary membrane (0.5 µm) composed of squamous Type I pneumocytes, fused basement membrane, and capillary endothelium enables rapid O2/CO2 diffusion.',
        bodyReactionNarrative:
          'Cuboidal Type II pneumocytes secrete dipalmitoylphosphatidylcholine (DPPC) surfactant to lower surface tension (Laplace law) and prevent end-expiratory alveolar collapse.',
        histologicalHallmark:
          'Thin delicate alveolar septa, air-filled alveolar lumens, and sparse resident alveolar macrophages.',
        sceneParams: {
          stenosisRatio: 0.05,
          wallHypertrophy: 0.05,
          fibrosisIntensity: 0.0,
          inflammationLevel: 0.05,
          edemaScale: 0.0,
          perfusionSpeed: 1.5,
          lesionScale: 0.05,
          hypoxiaTint: 0.0,
          cellularInfiltrateCount: 14,
        },
        biomarkers: [
          { label: 'PaO2 / FiO2', value: 440, unit: 'mmHg', referenceRange: '> 400 mmHg', status: 'nominal', decimals: 0 },
          { label: 'Lung Compliance', value: 85, unit: 'mL/cmH2O', referenceRange: '60–100', status: 'nominal', decimals: 0 },
          { label: 'A-a O2 Gradient', value: 9, unit: 'mmHg', referenceRange: '5–15 mmHg', status: 'nominal', decimals: 0 },
          { label: 'Mean PAP', value: 14, unit: 'mmHg', referenceRange: '10–20 mmHg', status: 'nominal', decimals: 0 },
        ],
      },
      {
        stageIndex: 1,
        stageName: 'Endothelial Activation, Neutrophil Sequestration & Interstitial Edema',
        timeCourse: 'Hours 0–24 (Incipient Exudative Phase)',
        pathophysiologyNarrative:
          'Circulating endotoxin or pulmonary infection triggers alveolar macrophages to release IL-8 and TNF-α. Neutrophils marginate inside pulmonary capillaries and degranulate protease/ROS.',
        bodyReactionNarrative:
          'Endothelial VE-cadherin junctions retract, increasing capillary permeability (Kf). Pulmonary lymphatics sharply increase clearance flow to pump leaked interstitial fluid before alveolar flooding occurs.',
        histologicalHallmark:
          'Capillary congestion, neutrophil margination, interstitial septal widening, and early Type I pneumocyte swelling.',
        sceneParams: {
          stenosisRatio: 0.35,
          wallHypertrophy: 0.38,
          fibrosisIntensity: 0.15,
          inflammationLevel: 0.65,
          edemaScale: 0.45,
          perfusionSpeed: 1.1,
          lesionScale: 0.4,
          hypoxiaTint: 0.3,
          cellularInfiltrateCount: 78,
        },
        biomarkers: [
          { label: 'PaO2 / FiO2', value: 255, unit: 'mmHg', referenceRange: '> 400 mmHg', status: 'elevated', decimals: 0 },
          { label: 'Lung Compliance', value: 52, unit: 'mL/cmH2O', referenceRange: '60–100', status: 'depressed', decimals: 0 },
          { label: 'A-a O2 Gradient', value: 145, unit: 'mmHg', referenceRange: '5–15 mmHg', status: 'elevated', decimals: 0 },
          { label: 'Mean PAP', value: 23, unit: 'mmHg', referenceRange: '10–20 mmHg', status: 'elevated', decimals: 0 },
        ],
      },
      {
        stageIndex: 2,
        stageName: 'Hyaline Membrane Formation, Surfactant Loss & Shunt Hypoxemia',
        timeCourse: 'Days 2–7 (Full Exudative Diffuse Alveolar Damage)',
        pathophysiologyNarrative:
          'Sloughing of necrotic Type I pneumocytes allows fibrinogen-rich plasma and cellular debris to condense along alveolar walls as glassy pink hyaline membranes. Surfactant dilution causes dependent alveolar atelectasis.',
        bodyReactionNarrative:
          'Pulmonary arterioles perfusing flooded alveoli constrict via Hypoxic Pulmonary Vasoconstriction (HPV) to redirect blood toward aerated non-dependent ventral lung zones.',
        histologicalHallmark:
          'Waxy eosinophilic hyaline membranes lining alveolar ducts, intra-alveolar hemorrhage, and collapsed dependent alveoli.',
        sceneParams: {
          stenosisRatio: 0.68,
          wallHypertrophy: 0.68,
          fibrosisIntensity: 0.48,
          inflammationLevel: 0.94,
          edemaScale: 0.9,
          perfusionSpeed: 0.45,
          lesionScale: 0.88,
          hypoxiaTint: 0.78,
          cellularInfiltrateCount: 150,
        },
        biomarkers: [
          { label: 'PaO2 / FiO2', value: 112, unit: 'mmHg', referenceRange: '> 400 mmHg', status: 'critical', decimals: 0 },
          { label: 'Lung Compliance', value: 26, unit: 'mL/cmH2O', referenceRange: '60–100', status: 'critical', decimals: 0 },
          { label: 'A-a O2 Gradient', value: 380, unit: 'mmHg', referenceRange: '5–15 mmHg', status: 'critical', decimals: 0 },
          { label: 'Mean PAP', value: 32, unit: 'mmHg', referenceRange: '10–20 mmHg', status: 'critical', decimals: 0 },
        ],
      },
      {
        stageIndex: 3,
        stageName: 'Type II Pneumocyte Hyperplasia & Fibroproliferative Organization',
        timeCourse: 'Days 7–21+ (Proliferative & Fibrotic Phase)',
        pathophysiologyNarrative:
          'If the patient survives the acute exudative insult, intra-alveolar exudates organize into granulation tissue. Persistent TGF-β1 signaling deposits interstitial collagen, permanently stiffening alveolar septa.',
        bodyReactionNarrative:
          'Surviving Type II pneumocytes proliferate along the basement membrane to re-epithelialize denuded surfaces and transdifferentiate into new Type I pneumocytes, while aquaporin/ENaC channels pump fluid out of airspaces.',
        histologicalHallmark:
          'Cuboidal Type II pneumocyte "hobnail" hyperplasia, Masson bodies organizing in alveolar lumens, and septal collagen fibrosis.',
        sceneParams: {
          stenosisRatio: 0.76,
          wallHypertrophy: 0.88,
          fibrosisIntensity: 0.92,
          inflammationLevel: 0.58,
          edemaScale: 0.5,
          perfusionSpeed: 0.6,
          lesionScale: 0.82,
          hypoxiaTint: 0.6,
          cellularInfiltrateCount: 95,
        },
        biomarkers: [
          { label: 'PaO2 / FiO2', value: 168, unit: 'mmHg', referenceRange: '> 400 mmHg', status: 'critical', decimals: 0 },
          { label: 'Lung Compliance', value: 22, unit: 'mL/cmH2O', referenceRange: '60–100', status: 'critical', decimals: 0 },
          { label: 'A-a O2 Gradient', value: 260, unit: 'mmHg', referenceRange: '5–15 mmHg', status: 'critical', decimals: 0 },
          { label: 'Mean PAP', value: 36, unit: 'mmHg', referenceRange: '10–20 mmHg', status: 'critical', decimals: 0 },
        ],
      },
    ],
    hotspots: [
      {
        id: 'hs-hyaline-membrane',
        indexNumber: 1,
        label: 'Alveolar Wall & Hyaline Membrane Barrier',
        anatomicalStructure: 'Type I Pneumocyte Layer & Fused Basement Membrane',
        position3D: [0.35, 0.45, 0.88],
        pathologyEffect:
          'Necrotic epithelial debris and leaked plasma fibrinogen polymerize into dense hyaline membranes that increase diffusion distance 10-fold.',
        bodyReaction:
          'Alveolar macrophages phagocytose proteinaceous debris while plasminogen activator attempts fibrinolysis.',
        histologicalFinding:
          'Glassy eosinophilic membranes coating alveolar ducts (histological Diffuse Alveolar Damage).',
        clinicalPearl:
          'Causes refractory intrapulmonary right-to-left shunt that does not correct with 100% FiO2 alone—requires PEEP.',
        severity: 'critical',
      },
      {
        id: 'hs-type2-pneumocytes',
        indexNumber: 2,
        label: 'Type II Surfactant & Stem Cell Niche',
        anatomicalStructure: 'Alveolar Septal Corners',
        position3D: [-0.52, 0.32, 0.75],
        pathologyEffect:
          'Direct injury and plasma protein competition inactivate DPPC surfactant, raising surface tension and causing atelectrauma.',
        bodyReaction:
          'Type II cells act as alveolar progenitor cells, undergoing mitotic hyperplasia and differentiating into replacement Type I cells.',
        histologicalFinding:
          'Row of hyperplastic cuboidal Type II cells with lamellar bodies lining thickened septa.',
        clinicalPearl:
          'Low tidal volume ventilation (6 mL/kg IBW) prevents cyclical shear injury (VILI) to regenerating alveoli.',
        severity: 'compensatory',
      },
      {
        id: 'hs-pulm-capillary',
        indexNumber: 3,
        label: 'Pulmonary Capillary Bed & HPV Shunt Control',
        anatomicalStructure: 'Perialveolar Capillary Plexus & Precapillary Arteriole',
        position3D: [0.18, -0.65, 0.65],
        pathologyEffect:
          'Neutrophil extracellular traps (NETs) and platelet microthrombi occlude capillary segments, increasing dead-space fraction.',
        bodyReaction:
          'Hypoxic inhibition of Kv channels depolarizes arteriolar smooth muscle, constricting flow to flooded alveoli.',
        histologicalFinding:
          'Intracapillary leukostasis, fibrin microthrombi, and endothelial cell swelling.',
        clinicalPearl:
          'Prone positioning redistributes perfusion and recruits dorsal dependent lung units, improving V/Q matching and mortality.',
        severity: 'compensatory',
      },
    ],
    compensatoryPathway: [
      {
        stepNumber: 1,
        phaseTitle: 'Alveolar Macrophage Cytokine & Chemokine Alarm',
        mechanismType: 'Immunological',
        trigger: 'Pathogen-associated (PAMPs) or systemic damage-associated (DAMPs) molecules bind alveolar TLR4/TLR2.',
        physiologicalReaction: 'Macrophages secrete IL-8, TNF-α, and IL-1β, upregulating endothelial E-selectin and ICAM-1.',
        clinicalConsequence: 'Recruits massive waves of activated neutrophils into pulmonary capillaries.',
      },
      {
        stepNumber: 2,
        phaseTitle: 'Hypoxic Pulmonary Vasoconstriction (Euler-Liljestrand Reflex)',
        mechanismType: 'Hemodynamic',
        trigger: 'Alveolar flooding drops local alveolar PAO2 < 60 mmHg.',
        physiologicalReaction: 'Mitochondrial O2 sensors inhibit voltage-gated K+ channels in pulmonary arteriolar smooth muscle, triggering Ca2+ influx and vasoconstriction.',
        clinicalConsequence: 'Diverts deoxygenated blood away from flooded alveoli to better-ventilated units, at the cost of rising pulmonary artery pressure (RV afterload).',
      },
      {
        stepNumber: 3,
        phaseTitle: 'Vectorial Sodium & Fluid Clearance (ENaC / Na-K-ATPase)',
        mechanismType: 'Cellular Remodeling',
        trigger: 'Alveolar lumen flooding activates β2-adrenergic and corticosteroid-sensitive transport pathways.',
        physiologicalReaction: 'Surviving Type II pneumocytes pump Na+ across apical ENaC and basolateral Na+/K+-ATPase, drawing edema water out via Aquaporin-5.',
        clinicalConsequence: 'Gradually resolves alveolar pulmonary edema if capillary hydrostatic pressure is kept low (conservative fluid strategy).',
      },
      {
        stepNumber: 4,
        phaseTitle: 'Type II Hyperplasia & Myofibroblast Matrix Organization',
        mechanismType: 'Cellular Remodeling',
        trigger: 'Denuded alveolar basement membrane and persistent TGF-β1 / PDGF signaling.',
        physiologicalReaction: 'Type II cells proliferate to restore epithelial continuity while fibroblasts deposit collagen I/III.',
        clinicalConsequence: 'Restores gas-exchange barrier or progresses to restrictive fibrotic lung disease.',
      },
    ],
  },
  {
    id: 'neuro-ischemic-stroke-penumbra',
    title: 'Middle Cerebral Artery Ischemic Stroke, Excitotoxicity & Penumbral Edema',
    clinicalQuestion:
      'How does acute MCA thromboembolic occlusion damage cerebral tissue, and how does the brain and neurovascular unit react across the ischemic penumbra?',
    organSystem: 'neurological',
    archetype3D: 'brain_vascular',
    icdCode: 'ICD-10: I63.511',
    summary:
      'Thromboembolic occlusion of the M1 segment of the Middle Cerebral Artery (MCA) drops core cerebral blood flow below 10 mL/100g/min. Na+/K+-ATPase failure triggers anoxic depolarization, glutamate NMDA excitotoxicity, cytotoxic astrocyte swelling, blood-brain barrier disruption, and leptomeningeal collateral recruitment across the ischemic penumbra.',
    primaryInsultSummary:
      'Acute M1 thromboembolism causing ATP failure, glutamate NMDA calcium overload, cytotoxic edema, and MMP-9 blood-brain barrier breakdown.',
    hostReactionSummary:
      'Willisian & leptomeningeal pial collateral vasodilation, Cushing reflex systemic hypertension, microglial activation, and reactive astrogliosis (glial scar) surrounding liquefactive necrosis.',
    stages: [
      {
        stageIndex: 0,
        stageName: 'Healthy Neurovascular Coupling & Cerebral Autoregulation',
        timeCourse: 'Baseline Cerebral Perfusion (CBF ~55 mL/100g/min)',
        pathophysiologyNarrative:
          'The Circle of Willis and M1–M4 MCA branches deliver continuous oxygen and glucose. Tight junctions (claudin-5, occludin) and astrocyte end-feet maintain an intact Blood-Brain Barrier (BBB).',
        bodyReactionNarrative:
          'Myogenic and metabolic autoregulation keeps CBF constant across Mean Arterial Pressures of 60–150 mmHg, while astrocytic EAAT2 transporters rapidly clear synaptic glutamate.',
        histologicalHallmark:
          'Intact pyramidal cortical neurons, unswollen neuropil, and continuous capillary tight junctions.',
        sceneParams: {
          stenosisRatio: 0.05,
          wallHypertrophy: 0.05,
          fibrosisIntensity: 0.0,
          inflammationLevel: 0.05,
          edemaScale: 0.0,
          perfusionSpeed: 1.5,
          lesionScale: 0.05,
          hypoxiaTint: 0.0,
          cellularInfiltrateCount: 12,
        },
        biomarkers: [
          { label: 'Core CBF', value: 54, unit: 'mL/100g/min', referenceRange: '50–60', status: 'nominal', decimals: 0 },
          { label: 'ICP', value: 10, unit: 'mmHg', referenceRange: '5–15 mmHg', status: 'nominal', decimals: 0 },
          { label: 'CPP', value: 78, unit: 'mmHg', referenceRange: '60–100 mmHg', status: 'nominal', decimals: 0 },
          { label: 'NIHSS Score', value: 0, unit: 'pts', referenceRange: '0 pts', status: 'nominal', decimals: 0 },
        ],
      },
      {
        stageIndex: 1,
        stageName: 'M1 Occlusion, Glutamate Excitotoxicity & Cytotoxic Edema',
        timeCourse: 'Minutes to 6 Hours (Hyperacute Core & Salvageable Penumbra)',
        pathophysiologyNarrative:
          'Thromboembolism lodges at the MCA bifurcation. Core CBF drops < 10 mL/100g/min: Na+/K+-ATPase fails, neurons depolarize and dump glutamate, opening NMDA channels and flooding cells with Ca2+ and Na+/water (cytotoxic edema).',
        bodyReactionNarrative:
          'In the surrounding penumbra (CBF 12–22 mL/100g/min), leptomeningeal anastomoses from the Anterior and Posterior Cerebral Arteries maximally dilate via H+/NO, and oxygen extraction fraction (OEF) increases to >80%.',
        histologicalHallmark:
          'Swollen astrocytes and neuronal dendrites (cytotoxic edema, DWI-bright on MRI) with intact blood-brain barrier.',
        sceneParams: {
          stenosisRatio: 0.85,
          wallHypertrophy: 0.35,
          fibrosisIntensity: 0.15,
          inflammationLevel: 0.55,
          edemaScale: 0.48,
          perfusionSpeed: 0.35,
          lesionScale: 0.65,
          hypoxiaTint: 0.55,
          cellularInfiltrateCount: 58,
        },
        biomarkers: [
          { label: 'Core CBF', value: 8, unit: 'mL/100g/min', referenceRange: '50–60', status: 'critical', decimals: 0 },
          { label: 'ICP', value: 16, unit: 'mmHg', referenceRange: '5–15 mmHg', status: 'elevated', decimals: 0 },
          { label: 'CPP', value: 72, unit: 'mmHg', referenceRange: '60–100 mmHg', status: 'nominal', decimals: 0 },
          { label: 'NIHSS Score', value: 16, unit: 'pts', referenceRange: '0 pts', status: 'critical', decimals: 0 },
        ],
      },
      {
        stageIndex: 2,
        stageName: 'Red Neurons, BBB Breakdown & Vasogenic Edema',
        timeCourse: '12 to 72 Hours (Subacute Infarction & Peak Swelling)',
        pathophysiologyNarrative:
          'Intracellular Ca2+ activates calpains, phospholipase A2, and neuronal NOS. Endothelial MMP-9 degrades tight junctions and basal lamina, allowing plasma proteins and water to leak into the extracellular space (vasogenic edema).',
        bodyReactionNarrative:
          'Systemic sympathetic activation elevates blood pressure ("permissive hypertension") to drive perfusion through collateral vessels, while resident microglia transform into ameboid phagocytes and neutrophils infiltrate.',
        histologicalHallmark:
          'Eosinophilic "Red Neurons" (12–24h) with pyknotic nuclei, loss of Nissl substance, and prominent neutrophil infiltration (24–72h).',
        sceneParams: {
          stenosisRatio: 0.88,
          wallHypertrophy: 0.65,
          fibrosisIntensity: 0.42,
          inflammationLevel: 0.92,
          edemaScale: 0.92,
          perfusionSpeed: 0.25,
          lesionScale: 0.92,
          hypoxiaTint: 0.82,
          cellularInfiltrateCount: 142,
        },
        biomarkers: [
          { label: 'Core CBF', value: 6, unit: 'mL/100g/min', referenceRange: '50–60', status: 'critical', decimals: 0 },
          { label: 'ICP', value: 26, unit: 'mmHg', referenceRange: '5–15 mmHg', status: 'critical', decimals: 0 },
          { label: 'CPP', value: 56, unit: 'mmHg', referenceRange: '60–100 mmHg', status: 'depressed', decimals: 0 },
          { label: 'NIHSS Score', value: 19, unit: 'pts', referenceRange: '0 pts', status: 'critical', decimals: 0 },
        ],
      },
      {
        stageIndex: 3,
        stageName: 'Liquefactive Necrosis, Foamy Microglia & Reactive Gliosis',
        timeCourse: 'Weeks 1–4+ (Chronic Cavitation & Glial Scar)',
        pathophysiologyNarrative:
          'Unlike solid organs that undergo coagulative necrosis, lipid-rich cerebral tissue undergoes hydrolytic enzymatic digestion into a fluid-filled cystic cavity (liquefactive necrosis).',
        bodyReactionNarrative:
          'Lipid-laden macrophages ("gitter cells") clear myelin debris while surrounding reactive astrocytes upregulate GFAP and chondroitin sulfate proteoglycans, forming a dense glial scar to wall off the cavity.',
        histologicalHallmark:
          'Foamy CD68+ gitter cells (days 3–14), GFAP+ gemistocytic reactive astrocytes (weeks 1–3), and cystic cavitation.',
        sceneParams: {
          stenosisRatio: 0.75,
          wallHypertrophy: 0.85,
          fibrosisIntensity: 0.9,
          inflammationLevel: 0.52,
          edemaScale: 0.42,
          perfusionSpeed: 0.55,
          lesionScale: 0.85,
          hypoxiaTint: 0.65,
          cellularInfiltrateCount: 88,
        },
        biomarkers: [
          { label: 'Core CBF', value: 14, unit: 'mL/100g/min', referenceRange: '50–60', status: 'depressed', decimals: 0 },
          { label: 'ICP', value: 13, unit: 'mmHg', referenceRange: '5–15 mmHg', status: 'nominal', decimals: 0 },
          { label: 'CPP', value: 74, unit: 'mmHg', referenceRange: '60–100 mmHg', status: 'nominal', decimals: 0 },
          { label: 'NIHSS Score', value: 11, unit: 'pts', referenceRange: '0 pts', status: 'elevated', decimals: 0 },
        ],
      },
    ],
    hotspots: [
      {
        id: 'hs-m1-thrombus',
        indexNumber: 1,
        label: 'MCA M1 Thromboembolic Occlusion',
        anatomicalStructure: 'Proximal Middle Cerebral Artery Stem',
        position3D: [0.15, -0.35, 0.92],
        pathologyEffect:
          'Fibrin-platelet cardioembolism or atherothrombus arrests anterograde flow to the lateral cerebral convexity and lenticulostriate perforators.',
        bodyReaction:
          'Endogenous endothelial tPA attempts local fibrinolysis while Circle of Willis communicating arteries reverse flow.',
        histologicalFinding:
          'Laminated red-and-white intraluminal thromboembolus ("hyperdense MCA sign" on non-contrast CT).',
        clinicalPearl:
          'IV tenecteplase/alteplase (<4.5h) and mechanical thrombectomy (<24h with perfusion mismatch) salvage the penumbra.',
        severity: 'critical',
      },
      {
        id: 'hs-ischemic-penumbra',
        indexNumber: 2,
        label: 'Ischemic Penumbra & Leptomeningeal Collaterals',
        anatomicalStructure: 'Frontoparietal Watershed & Pial Anastomoses',
        position3D: [0.75, 0.55, 0.48],
        pathologyEffect:
          'Electrically silent ("stunned") neurons with CBF 12–20 mL/100g/min that retain membrane integrity but face spreading peri-infarct depolarizations.',
        bodyReaction:
          'ACA and PCA pial arterioles maximally dilate and neurons increase oxygen extraction fraction (OEF) to survive until reperfusion.',
        histologicalFinding:
          'Preserved neuronal cell bodies with reversible dendritic beading and astrocytic end-foot swelling.',
        clinicalPearl:
          'Avoid aggressive antihypertensives in acute ischemic stroke (<220/120 mmHg if no tPA) so collateral perfusion does not collapse.',
        severity: 'compensatory',
      },
      {
        id: 'hs-infarct-core',
        indexNumber: 3,
        label: 'Necrotic Infarct Core & Glial Scar Wall',
        anatomicalStructure: 'Lateral Cerebral Cortex & Basal Ganglia',
        position3D: [0.85, 0.05, 0.65],
        pathologyEffect:
          'Irreversible ATP depletion, NMDA calcium excitotoxicity, and enzymatic liquefactive necrosis of gray and white matter.',
        bodyReaction:
          'Microglia differentiate into foamy gitter cells to phagocytose myelin, while GFAP+ astrocytes build a border glial scar.',
        histologicalFinding:
          'Red neurons at 12–24h -> neutrophils at 24–72h -> foamy macrophages at 3–5d -> reactive gliosis & cystic cavity.',
        clinicalPearl:
          'Produces contralateral hemiparesis/sensory loss (face & arm > leg) and aphasia (dominant hemisphere) or hemineglect (non-dominant).',
        severity: 'critical',
      },
    ],
    compensatoryPathway: [
      {
        stepNumber: 1,
        phaseTitle: 'Leptomeningeal Collateral Recruitment & OEF Surge',
        mechanismType: 'Hemodynamic',
        trigger: 'Drop in MCA perfusion pressure creates a pressure gradient across pial arteriolar anastomoses.',
        physiologicalReaction: 'Acidosis and adenosine dilate ACA/PCA collateral vessels; penumbral neurons raise Oxygen Extraction Fraction from 35% to >80%.',
        clinicalConsequence: 'Sustains penumbral viability for hours (the therapeutic window for thrombectomy).',
      },
      {
        stepNumber: 2,
        phaseTitle: 'Sympathetic Autoregulatory Hypertension (Cushing/Ischemic Reflex)',
        mechanismType: 'Neurohormonal',
        trigger: 'Brainstem and hypothalamic perfusion sensors detect regional cerebral ischemia and rising ICP.',
        physiologicalReaction: 'Sympathetic outflow elevates systemic Mean Arterial Pressure (MAP) to maintain Cerebral Perfusion Pressure (CPP = MAP - ICP).',
        clinicalConsequence: 'Clinical permissive hypertension preserves collateral blood flow.',
      },
      {
        stepNumber: 3,
        phaseTitle: 'Microglial Phagocytosis (Gitter Cell Clearance)',
        mechanismType: 'Immunological',
        trigger: 'Liquefactive necrosis releases myelin lipids and neuronal DAMPs.',
        physiologicalReaction: 'Resident microglia and infiltrating monocytes engulf lipid-rich necrotic debris, becoming foamy gitter cells.',
        clinicalConsequence: 'Resorbs necrotic brain parenchyma, leaving a fluid-filled CSF cavity.',
      },
      {
        stepNumber: 4,
        phaseTitle: 'Reactive Astrogliosis (Glial Scar Formation)',
        mechanismType: 'Cellular Remodeling',
        trigger: 'IL-6, STAT3, and TGF-β signaling at the border between viable penumbra and necrotic core.',
        physiologicalReaction: 'Astrocytes hypertrophy, upregulate GFAP intermediate filaments, and interdigitate processes around the cavity.',
        clinicalConsequence: 'Re-establishes Blood-Brain Barrier integrity and isolates healthy neural tissue from toxic inflammatory exudate.',
      },
    ],
  },
  {
    id: 'cellular-septic-endotheliopathy',
    title: 'Septic Endotheliopathy, Glycocalyx Shedding & Immunothrombosis',
    clinicalQuestion:
      'How does systemic bacteremia and sepsis damage the microvascular endothelium at the cellular level, and how does the immune and coagulation system react?',
    organSystem: 'cellular_immune',
    archetype3D: 'microvascular_inflammation',
    icdCode: 'ICD-10: A41.9 / R65.21',
    summary:
      'Bacterial PAMPs (LPS/endotoxin) activate leukocyte and endothelial TLR4, unleashing TNF-α, IL-1β, and IL-6. Heparanase and MMPs cleave the protective endothelial glycocalyx, iNOS overproduces nitric oxide causing vasoplegia, VE-cadherin breakdown causes capillary leak, and Neutrophil Extracellular Traps (NETs) + Tissue Factor drive disseminated microvascular thrombosis (DIC).',
    primaryInsultSummary:
      'Enzymatic shedding of the endothelial heparan-sulfate glycocalyx, VE-cadherin adherens junction disassembly, and mitochondrial cytopathic hypoxia.',
    hostReactionSummary:
      'Selectin/integrin leukocyte rolling and transmigration, NETosis pathogen trapping, immunothrombosis to compartimentalize bacteria, and adrenal HPA-axis cortisol/catecholamine stress response.',
    stages: [
      {
        stageIndex: 0,
        stageName: 'Intact Endothelial Glycocalyx & Antithrombotic Microvessel',
        timeCourse: 'Baseline Microvascular Homeostasis',
        pathophysiologyNarrative:
          'A thick (0.5–1.0 µm) negatively charged endothelial glycocalyx of heparan sulfate, syndecan-1, and hyaluronan shields adhesion molecules, repels platelets/RBCs, and maintains oncotic Starling forces.',
        bodyReactionNarrative:
          'Endothelial thrombomodulin, Tissue Factor Pathway Inhibitor (TFPI), and constitutive eNOS keep leukocytes quiescent and blood fluid.',
        histologicalHallmark:
          'Intact bush-like luminal glycocalyx, sealed VE-cadherin tight/adherens junctions, and laminar central RBC axial streaming.',
        sceneParams: {
          stenosisRatio: 0.05,
          wallHypertrophy: 0.05,
          fibrosisIntensity: 0.0,
          inflammationLevel: 0.05,
          edemaScale: 0.0,
          perfusionSpeed: 1.5,
          lesionScale: 0.05,
          hypoxiaTint: 0.0,
          cellularInfiltrateCount: 18,
        },
        biomarkers: [
          { label: 'MAP', value: 88, unit: 'mmHg', referenceRange: '70–100 mmHg', status: 'nominal', decimals: 0 },
          { label: 'Serum Lactate', value: 0.9, unit: 'mmol/L', referenceRange: '0.5–2.0', status: 'nominal', decimals: 1 },
          { label: 'Syndecan-1 (Glycocalyx)', value: 18, unit: 'ng/mL', referenceRange: '< 30 ng/mL', status: 'nominal', decimals: 0 },
          { label: 'D-Dimer', value: 0.22, unit: 'µg/mL', referenceRange: '< 0.50', status: 'nominal', decimals: 2 },
        ],
      },
      {
        stageIndex: 1,
        stageName: 'TLR4 Cytokine Activation, Selectin Rolling & iNOS Vasodilation',
        timeCourse: 'Hours 1–6 (Early Hyperdynamic Sepsis)',
        pathophysiologyNarrative:
          'Bacterial LPS binds CD14/TLR4 on macrophages and endothelium, activating NF-κB. TNF-α and IL-1β mobilize Weibel-Palade bodies to express P-selectin and E-selectin on the luminal surface.',
        bodyReactionNarrative:
          'Neutrophils roll via Sialyl-Lewis-X, lock onto ICAM-1 via LFA-1/Mac-1 integrins, and diapedese via PECAM-1. Inducible nitric oxide synthase (iNOS) generates massive NO, dropping systemic vascular resistance (SVR).',
        histologicalHallmark:
          'Endothelial activation, marginated rolling/adherent neutrophils, and arteriolar smooth muscle relaxation.',
        sceneParams: {
          stenosisRatio: 0.28,
          wallHypertrophy: 0.3,
          fibrosisIntensity: 0.15,
          inflammationLevel: 0.65,
          edemaScale: 0.38,
          perfusionSpeed: 1.9,
          lesionScale: 0.35,
          hypoxiaTint: 0.22,
          cellularInfiltrateCount: 75,
        },
        biomarkers: [
          { label: 'MAP', value: 68, unit: 'mmHg', referenceRange: '70–100 mmHg', status: 'depressed', decimals: 0 },
          { label: 'Serum Lactate', value: 2.4, unit: 'mmol/L', referenceRange: '0.5–2.0', status: 'elevated', decimals: 1 },
          { label: 'Syndecan-1 (Glycocalyx)', value: 85, unit: 'ng/mL', referenceRange: '< 30 ng/mL', status: 'elevated', decimals: 0 },
          { label: 'D-Dimer', value: 1.45, unit: 'µg/mL', referenceRange: '< 0.50', status: 'elevated', decimals: 2 },
        ],
      },
      {
        stageIndex: 2,
        stageName: 'Glycocalyx Shedding, VE-Cadherin Gap Leak & NETosis',
        timeCourse: 'Hours 6–24 (Septic Shock & Capillary Leak Syndrome)',
        pathophysiologyNarrative:
          'Heparanase, MMP-9, and ROS strip away the endothelial glycocalyx. RhoA/ROCK signaling phosphorylates and internalizes VE-cadherin, opening paracellular gaps that leak albumin and fluid into the interstitium.',
        bodyReactionNarrative:
          'Activated neutrophils extrude DNA-histone webs coated in myeloperoxidase (NETs) to trap circulating bacteria, while monocytes express Tissue Factor to initiate extrinsic coagulation.',
        histologicalHallmark:
          'Denuded endothelial glycocalyx, paracellular endothelial gaps, interstitial edema, and extracellular chromatin NET meshes.',
        sceneParams: {
          stenosisRatio: 0.62,
          wallHypertrophy: 0.6,
          fibrosisIntensity: 0.45,
          inflammationLevel: 0.95,
          edemaScale: 0.85,
          perfusionSpeed: 0.5,
          lesionScale: 0.78,
          hypoxiaTint: 0.62,
          cellularInfiltrateCount: 148,
        },
        biomarkers: [
          { label: 'MAP', value: 54, unit: 'mmHg', referenceRange: '70–100 mmHg', status: 'critical', decimals: 0 },
          { label: 'Serum Lactate', value: 4.9, unit: 'mmol/L', referenceRange: '0.5–2.0', status: 'critical', decimals: 1 },
          { label: 'Syndecan-1 (Glycocalyx)', value: 240, unit: 'ng/mL', referenceRange: '< 30 ng/mL', status: 'critical', decimals: 0 },
          { label: 'D-Dimer', value: 6.8, unit: 'µg/mL', referenceRange: '< 0.50', status: 'critical', decimals: 2 },
        ],
      },
      {
        stageIndex: 3,
        stageName: 'Microvascular Immunothrombosis (DIC) & Cytopathic Hypoxia',
        timeCourse: '24+ Hours (Refractory Septic Shock & Multi-Organ Dysfunction)',
        pathophysiologyNarrative:
          'Downregulation of thrombomodulin/Protein C and PAI-1 surge shut down fibrinolysis. Fibrin-platelet-NET microthrombi plug capillaries while peroxynitrite (ONOO-) poisons mitochondrial Complex I/IV.',
        bodyReactionNarrative:
          'Even if macro-hemodynamics (MAP) are restored with vasopressors, microcirculatory shunting and mitochondrial respiratory paralysis prevent cellular oxygen utilization ("cytopathic hypoxia").',
        histologicalHallmark:
          'Occlusive hyaline fibrin microthrombi in capillaries, schistocytes (sheared RBCs), and mitochondrial cristae swelling.',
        sceneParams: {
          stenosisRatio: 0.88,
          wallHypertrophy: 0.82,
          fibrosisIntensity: 0.85,
          inflammationLevel: 0.88,
          edemaScale: 0.95,
          perfusionSpeed: 0.18,
          lesionScale: 0.96,
          hypoxiaTint: 0.88,
          cellularInfiltrateCount: 160,
        },
        biomarkers: [
          { label: 'MAP', value: 48, unit: 'mmHg', referenceRange: '70–100 mmHg', status: 'critical', decimals: 0 },
          { label: 'Serum Lactate', value: 8.2, unit: 'mmol/L', referenceRange: '0.5–2.0', status: 'critical', decimals: 1 },
          { label: 'Syndecan-1 (Glycocalyx)', value: 410, unit: 'ng/mL', referenceRange: '< 30 ng/mL', status: 'critical', decimals: 0 },
          { label: 'D-Dimer', value: 18.4, unit: 'µg/mL', referenceRange: '< 0.50', status: 'critical', decimals: 2 },
        ],
      },
    ],
    hotspots: [
      {
        id: 'hs-glycocalyx-layer',
        indexNumber: 1,
        label: 'Endothelial Glycocalyx & VE-Cadherin Junctions',
        anatomicalStructure: 'Luminal Endothelial Surface & Intercellular Cleft',
        position3D: [0.0, 0.58, 0.75],
        pathologyEffect:
          'TNF-α and heparanase shed syndecan-1 and heparan sulfate chains, exposing ICAM-1/VCAM-1 and opening VE-cadherin paracellular gaps.',
        bodyReaction:
          'Sphingosine-1-phosphate (S1P) and angiopoietin-1/Tie2 signaling attempt to re-stabilize cortical actin and seal endothelial junctions.',
        histologicalFinding:
          'Loss of luminal glycocalyx brush border on EM and widened inter-endothelial junctions.',
        clinicalPearl:
          'Excessive crystalloid fluid resuscitation after glycocalyx shedding worsens interstitial third-spacing and tissue edema.',
        severity: 'critical',
      },
      {
        id: 'hs-neutrophil-net',
        indexNumber: 2,
        label: 'Leukocyte Diapedesis & NETosis Web',
        anatomicalStructure: 'Post-Capillary Venule Wall',
        position3D: [-0.65, -0.15, 0.62],
        pathologyEffect:
          'Extruded histones (H3/H4) and neutrophil elastase directly lyse endothelial membranes and activate platelets via TLR2/4.',
        bodyReaction:
          'Evolutionarily conserved host defense designed to physically ensnare and kill disseminating bacteria inside the microvasculature.',
        histologicalFinding:
          'Marginated neutrophils trans-migrating via PECAM-1 and extracellular DNA-myeloperoxidase filaments.',
        clinicalPearl:
          'Circulating cell-free DNA and citrullinated histone H3 correlate with SOFA organ failure scores.',
        severity: 'compensatory',
      },
      {
        id: 'hs-fibrin-microthrombus',
        indexNumber: 3,
        label: 'Tissue Factor Microthrombus & RBC Shearing',
        anatomicalStructure: 'Capillary Lumen',
        position3D: [0.68, -0.25, 0.55],
        pathologyEffect:
          'Tissue factor + Factor VIIa generates thrombin webs that trap platelets and shear passing erythrocytes into schistocytes.',
        bodyReaction:
          'Immunothrombosis attempts to wall off infected microvascular beds to prevent systemic bacterial seeding.',
        histologicalFinding:
          'Intraluminal fibrin strands, platelet aggregates, and fragmented helmet cells (schistocytes).',
        clinicalPearl:
          'Consumption of platelets, fibrinogen, and Factors V/VIII leads to paradoxical bleeding alongside microvascular ischemia (DIC).',
        severity: 'critical',
      },
    ],
    compensatoryPathway: [
      {
        stepNumber: 1,
        phaseTitle: 'Innate TLR4 Sensing & Leukocyte Adhesion Cascade',
        mechanismType: 'Immunological',
        trigger: 'Circulating PAMPs (LPS, peptidoglycan) bind endothelial and macrophage pattern-recognition receptors.',
        physiologicalReaction: 'Selectin-mediated rolling -> chemokine integrin activation -> ICAM-1 firm adhesion -> PECAM-1 transendothelial migration.',
        clinicalConsequence: 'Delivers phagocytes to the site of infection, but systemic activation damages bystander organs.',
      },
      {
        stepNumber: 2,
        phaseTitle: 'iNOS Nitric Oxide Surge & ATP-Sensitive K+ Vasoplegia',
        mechanismType: 'Hemodynamic',
        trigger: 'TNF-α and IFN-γ induce vascular smooth muscle iNOS and lactic acidosis opens K_ATP channels.',
        physiologicalReaction: 'Sustained cGMP-mediated smooth muscle hyperpolarization and myosin light-chain dephosphorylation.',
        clinicalConsequence: 'Distributive vasoplegic shock refractory to endogenous catecholamines.',
      },
      {
        stepNumber: 3,
        phaseTitle: 'NETosis & Extrinsic Coagulation (Immunothrombosis)',
        mechanismType: 'Immunological',
        trigger: 'Activated platelets bind neutrophils via P-selectin/PSGL-1 while monocytes express Tissue Factor.',
        physiologicalReaction: 'Neutrophils release chromatin NETs that activate Factor XII and inhibit Tissue Factor Pathway Inhibitor (TFPI).',
        clinicalConsequence: 'Traps pathogens locally, but widespread activation triggers Disseminated Intravascular Coagulation (DIC).',
      },
      {
        stepNumber: 4,
        phaseTitle: 'HPA-Axis Cortisol & Baroreceptor Vasopressin Release',
        mechanismType: 'Neurohormonal',
        trigger: 'IL-1/IL-6 stimulation of the hypothalamus and profound arterial hypotension.',
        physiologicalReaction: 'Adrenal cortex secretes cortisol (upregulating α1-adrenergic receptor expression) and posterior pituitary releases vasopressin (V1a vasoconstriction).',
        clinicalConsequence: 'Provides the physiological rationale for norepinephrine + vasopressin + hydrocortisone in refractory septic shock.',
      },
    ],
  },
];

export const ORGAN_SYSTEM_LABELS: Record<
  PathologyModelSpec['organSystem'],
  { label: string; shortLabel: string; description: string }
> = {
  cardiovascular: {
    label: 'Cardiovascular System',
    shortLabel: 'Cardiovascular',
    description: 'Heart chambers, coronary vasculature, valves, and hemodynamic remodeling',
  },
  hepatobiliary: {
    label: 'Hepatobiliary & Portal System',
    shortLabel: 'Hepatobiliary',
    description: 'Hepatic lobules, Space of Disse, portal venous system, and splanchnic circulation',
  },
  gastrointestinal: {
    label: 'Gastrointestinal Tract',
    shortLabel: 'Gastrointestinal',
    description: 'Mucosa-bicarbonate barrier, submucosa, muscularis propria, and peritoneal serosa',
  },
  renal: {
    label: 'Renal & Nephron System',
    shortLabel: 'Renal',
    description: 'Glomerular filtration barrier, juxtaglomerular apparatus, tubules, and interstitium',
  },
  respiratory: {
    label: 'Respiratory & Alveolar System',
    shortLabel: 'Respiratory',
    description: 'Bronchial tree, alveolar-capillary membrane, Type I/II pneumocytes, and pulmonary vessels',
  },
  neurological: {
    label: 'Neurological & Cerebrovascular',
    shortLabel: 'Neurological',
    description: 'Cerebral cortex, Circle of Willis / MCA vasculature, blood-brain barrier, and glia',
  },
  cellular_immune: {
    label: 'Cellular & Microvascular Immune',
    shortLabel: 'Cellular & Immune',
    description: 'Endothelial glycocalyx, leukocyte diapedesis, NETosis, and microvascular coagulation',
  },
};
