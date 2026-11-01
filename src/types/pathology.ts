export type OrganSystem =
  | 'cardiovascular'
  | 'gastrointestinal'
  | 'renal'
  | 'hepatobiliary'
  | 'respiratory'
  | 'neurological'
  | 'cellular_immune';

export type Archetype3D =
  | 'heart_coronary'
  | 'liver_portal'
  | 'kidney_nephron'
  | 'gi_mucosa_ulcer'
  | 'lung_alveoli'
  | 'brain_vascular'
  | 'microvascular_inflammation';

export type BiomarkerStatus = 'nominal' | 'elevated' | 'critical' | 'depressed';

export interface BiomarkerMetric {
  label: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: BiomarkerStatus;
  decimals?: number;
}

export interface StageSceneParams {
  /** 0.0 (open vessel) to 0.92 (near-complete occlusion) */
  stenosisRatio: number;
  /** 0.0 (normal wall) to 1.0 (marked hypertrophy / wall thickening) */
  wallHypertrophy: number;
  /** 0.0 (smooth healthy serosa/parenchyma) to 1.0 (nodular cirrhosis/sclerosis/scarring) */
  fibrosisIntensity: number;
  /** 0.0 (calm) to 1.0 (intense hyperemia / cytokine activation) */
  inflammationLevel: number;
  /** 0.0 (no fluid shift) to 1.0 (interstitial edema / ascites / effusion) */
  edemaScale: number;
  /** 0.15 (stasis/ischemia) to 2.2 (hyperdynamic flow) */
  perfusionSpeed: number;
  /** 0.0 (no focal lesion) to 1.0 (prominent plaque/ulcer/thrombus/aneurysm) */
  lesionScale: number;
  /** 0.0 (normoxic crimson) to 1.0 (ischemic/cyanotic dark violaceous-slate) */
  hypoxiaTint: number;
  /** Number of active immune / inflammatory infiltrate cells (10 to 160) */
  cellularInfiltrateCount: number;
}

export interface PathologyStage {
  stageIndex: number; // 0, 1, 2, 3
  stageName: string;
  timeCourse: string;
  pathophysiologyNarrative: string;
  bodyReactionNarrative: string;
  histologicalHallmark: string;
  sceneParams: StageSceneParams;
  biomarkers: BiomarkerMetric[];
}

export interface AnatomicalHotspot {
  id: string;
  indexNumber: number;
  label: string;
  anatomicalStructure: string;
  /** Normalized 3D coordinates around the organ model [-2.2..2.2] */
  position3D: [number, number, number];
  pathologyEffect: string;
  bodyReaction: string;
  histologicalFinding: string;
  clinicalPearl: string;
  severity: 'baseline' | 'compensatory' | 'critical';
}

export interface CompensatoryStep {
  stepNumber: number;
  phaseTitle: string;
  mechanismType: 'Hemodynamic' | 'Neurohormonal' | 'Immunological' | 'Cellular Remodeling';
  trigger: string;
  physiologicalReaction: string;
  clinicalConsequence: string;
}

export interface PathologyModelSpec {
  id: string;
  title: string;
  clinicalQuestion: string;
  organSystem: OrganSystem;
  archetype3D: Archetype3D;
  icdCode: string;
  summary: string;
  primaryInsultSummary: string;
  hostReactionSummary: string;
  stages: [PathologyStage, PathologyStage, PathologyStage, PathologyStage];
  hotspots: AnatomicalHotspot[];
  compensatoryPathway: CompensatoryStep[];
  createdAt?: string;
  isCustomGenerated?: boolean;
}
