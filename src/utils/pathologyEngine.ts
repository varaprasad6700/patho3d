import type {
  Archetype3D,
  BiomarkerMetric,
  OrganSystem,
  PathologyModelSpec,
  PathologyStage,
  StageSceneParams,
} from '../types/pathology.ts';
import { CLINICAL_CASES } from '../data/clinicalCases.ts';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Resolves the discrete stage index (0..3) nearest to a continuous scrubber position [0..3].
 */
export function resolveActiveStageIndex(scrubberValue: number): 0 | 1 | 2 | 3 {
  const clamped = clamp(Math.round(scrubberValue), 0, 3);
  return clamped as 0 | 1 | 2 | 3;
}

/**
 * Smoothly interpolates 3D scene morphology & physiological parameters between adjacent stages
 * as the doctor scrubs continuously across [0.0 .. 3.0].
 */
export function interpolateStageSceneParams(
  stages: [PathologyStage, PathologyStage, PathologyStage, PathologyStage],
  scrubberValue: number
): StageSceneParams {
  const clamped = clamp(scrubberValue, 0, 3);
  const lowerIdx = Math.min(2, Math.floor(clamped));
  const upperIdx = lowerIdx + 1;
  const t = clamped - lowerIdx;

  const a = stages[lowerIdx].sceneParams;
  const b = stages[upperIdx].sceneParams;

  return {
    stenosisRatio: Number(lerp(a.stenosisRatio, b.stenosisRatio, t).toFixed(3)),
    wallHypertrophy: Number(lerp(a.wallHypertrophy, b.wallHypertrophy, t).toFixed(3)),
    fibrosisIntensity: Number(lerp(a.fibrosisIntensity, b.fibrosisIntensity, t).toFixed(3)),
    inflammationLevel: Number(lerp(a.inflammationLevel, b.inflammationLevel, t).toFixed(3)),
    edemaScale: Number(lerp(a.edemaScale, b.edemaScale, t).toFixed(3)),
    perfusionSpeed: Number(lerp(a.perfusionSpeed, b.perfusionSpeed, t).toFixed(3)),
    lesionScale: Number(lerp(a.lesionScale, b.lesionScale, t).toFixed(3)),
    hypoxiaTint: Number(lerp(a.hypoxiaTint, b.hypoxiaTint, t).toFixed(3)),
    cellularInfiltrateCount: Math.round(lerp(a.cellularInfiltrateCount, b.cellularInfiltrateCount, t)),
  };
}

/**
 * Smoothly interpolates quantitative clinical biomarkers between adjacent stages.
 */
export function interpolateStageBiomarkers(
  stages: [PathologyStage, PathologyStage, PathologyStage, PathologyStage],
  scrubberValue: number
): BiomarkerMetric[] {
  const clamped = clamp(scrubberValue, 0, 3);
  const lowerIdx = Math.min(2, Math.floor(clamped));
  const upperIdx = lowerIdx + 1;
  const t = clamped - lowerIdx;

  const lowerBiomarkers = stages[lowerIdx].biomarkers;
  const upperBiomarkers = stages[upperIdx].biomarkers;
  const nearestStage = stages[resolveActiveStageIndex(clamped)];

  return lowerBiomarkers.map((metricA, idx) => {
    const metricB = upperBiomarkers[idx] ?? metricA;
    const nearestMetric = nearestStage.biomarkers[idx] ?? metricA;
    const decimals = metricA.decimals ?? (Number.isInteger(metricA.value) ? 0 : 1);
    const interpolatedVal =
      metricA.label === metricB.label
        ? Number(lerp(metricA.value, metricB.value, t).toFixed(decimals))
        : nearestMetric.value;

    return {
      label: nearestMetric.label,
      value: interpolatedVal,
      unit: nearestMetric.unit,
      referenceRange: nearestMetric.referenceRange,
      status: nearestMetric.status,
      decimals,
    };
  });
}

export interface QueryValidationResult {
  valid: boolean;
  error?: string;
  sanitizedQuery: string;
}

export function validateClinicalQuery(rawInput: string): QueryValidationResult {
  const trimmed = rawInput.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return {
      valid: false,
      error: 'Please enter a clinical pathology question or disease process to generate a 3D model.',
      sanitizedQuery: '',
    };
  }
  if (trimmed.length < 6) {
    return {
      valid: false,
      error: 'Please describe the pathology or organ reaction in at least 6 characters (e.g., "Mitral stenosis LA remodeling").',
      sanitizedQuery: trimmed,
    };
  }
  return {
    valid: true,
    sanitizedQuery: trimmed,
  };
}

/**
 * Maps a natural-language medical query to the closest OrganSystem and 3D Archetype.
 */
export function classifyPathologyQuery(query: string): {
  organSystem: OrganSystem;
  archetype3D: Archetype3D;
} {
  const q = query.toLowerCase();

  if (
    /\b(liver|hepatic|cirrhosis|portal|varices|ascites|biliary|cholangitis|jaundice|hepatocyte|stellate|disse)\b/.test(
      q
    )
  ) {
    return { organSystem: 'hepatobiliary', archetype3D: 'liver_portal' };
  }

  if (
    /\b(kidney|renal|nephron|glomerul|podocyte|nephrotic|nephritic|ckd|aki|tubul|creatinine|uremia|macula densa)\b/.test(
      q
    )
  ) {
    return { organSystem: 'renal', archetype3D: 'kidney_nephron' };
  }

  if (
    /\b(stomach|gastric|ulcer|duoden|pylori|nsaid|mucosa|bowel|intestin|crohn|colitis|colon|esophag|peritonitis|gi)\b/.test(
      q
    )
  ) {
    return { organSystem: 'gastrointestinal', archetype3D: 'gi_mucosa_ulcer' };
  }

  if (
    /\b(lung|pulmonary|alveol|ards|pneumonia|asthma|copd|bronch|emphysema|pneumocyte|surfactant|hypoxemia|pleura)\b/.test(
      q
    )
  ) {
    return { organSystem: 'respiratory', archetype3D: 'lung_alveoli' };
  }

  if (
    /\b(brain|cerebr|stroke|mca|aneurysm|neuro|ischemic stroke|penumbra|gliosis|mening|icp|blood-brain)\b/.test(
      q
    )
  ) {
    return { organSystem: 'neurological', archetype3D: 'brain_vascular' };
  }

  if (
    /\b(sepsis|septic|endotheli|glycocalyx|cytokine|shock|dic|netosis|leukocyte|anaphylaxis|immune|microvascul)\b/.test(
      q
    )
  ) {
    return { organSystem: 'cellular_immune', archetype3D: 'microvascular_inflammation' };
  }

  if (
    /\b(heart|cardiac|coronary|myocardi|ventricular|atrial|aort|valve|mitral|stemi|infarct|atherosclero|hfref|hfpef|pericardi)\b/.test(
      q
    )
  ) {
    return { organSystem: 'cardiovascular', archetype3D: 'heart_coronary' };
  }

  return { organSystem: 'cardiovascular', archetype3D: 'heart_coronary' };
}

/**
 * Deterministic clinical fallback generator when offline or when synthesizing from local clinical templates.
 */
export function synthesizeFallbackPathologySpec(query: string): PathologyModelSpec {
  const { organSystem, archetype3D } = classifyPathologyQuery(query);
  const template =
    CLINICAL_CASES.find((c) => c.archetype3D === archetype3D) ?? CLINICAL_CASES[0];

  const cleanTitle = query
    .replace(/^(how does|what happens in|explain|show me|how do)\s+/i, '')
    .replace(/\?+$/, '')
    .trim();

  const formattedTitle =
    cleanTitle.length > 4
      ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)
      : template.title;

  return {
    ...template,
    id: `custom-${Date.now()}`,
    title: formattedTitle.slice(0, 78),
    clinicalQuestion: query,
    organSystem,
    archetype3D,
    summary: `Clinical 3D pathophysiological model for "${query}". ${template.summary}`,
    createdAt: new Date().toISOString(),
    isCustomGenerated: true,
  };
}

/**
 * Sanitizes and guarantees that a partial/AI-generated JSON object conforms strictly to PathologyModelSpec.
 */
export function normalizeAISpec(
  raw: Partial<PathologyModelSpec>,
  originalQuery: string
): PathologyModelSpec {
  const fallback = synthesizeFallbackPathologySpec(originalQuery);

  const validArchetypes: Archetype3D[] = [
    'heart_coronary',
    'liver_portal',
    'kidney_nephron',
    'gi_mucosa_ulcer',
    'lung_alveoli',
    'brain_vascular',
    'microvascular_inflammation',
  ];

  const validSystems: OrganSystem[] = [
    'cardiovascular',
    'gastrointestinal',
    'renal',
    'hepatobiliary',
    'respiratory',
    'neurological',
    'cellular_immune',
  ];

  const archetype3D = validArchetypes.includes(raw.archetype3D as Archetype3D)
    ? (raw.archetype3D as Archetype3D)
    : fallback.archetype3D;

  const organSystem = validSystems.includes(raw.organSystem as OrganSystem)
    ? (raw.organSystem as OrganSystem)
    : fallback.organSystem;

  const rawStages = Array.isArray(raw.stages) && raw.stages.length === 4 ? raw.stages : fallback.stages;

  const normalizedStages = rawStages.map((st, idx) => {
    const fbStage = fallback.stages[idx];
    const sp = st?.sceneParams ?? fbStage.sceneParams;
    return {
      stageIndex: idx,
      stageName: st?.stageName || fbStage.stageName,
      timeCourse: st?.timeCourse || fbStage.timeCourse,
      pathophysiologyNarrative: st?.pathophysiologyNarrative || fbStage.pathophysiologyNarrative,
      bodyReactionNarrative: st?.bodyReactionNarrative || fbStage.bodyReactionNarrative,
      histologicalHallmark: st?.histologicalHallmark || fbStage.histologicalHallmark,
      sceneParams: {
        stenosisRatio: clamp(Number(sp.stenosisRatio ?? fbStage.sceneParams.stenosisRatio), 0, 0.95),
        wallHypertrophy: clamp(Number(sp.wallHypertrophy ?? fbStage.sceneParams.wallHypertrophy), 0, 1),
        fibrosisIntensity: clamp(Number(sp.fibrosisIntensity ?? fbStage.sceneParams.fibrosisIntensity), 0, 1),
        inflammationLevel: clamp(Number(sp.inflammationLevel ?? fbStage.sceneParams.inflammationLevel), 0, 1),
        edemaScale: clamp(Number(sp.edemaScale ?? fbStage.sceneParams.edemaScale), 0, 1),
        perfusionSpeed: clamp(Number(sp.perfusionSpeed ?? fbStage.sceneParams.perfusionSpeed), 0.1, 2.5),
        lesionScale: clamp(Number(sp.lesionScale ?? fbStage.sceneParams.lesionScale), 0, 1),
        hypoxiaTint: clamp(Number(sp.hypoxiaTint ?? fbStage.sceneParams.hypoxiaTint), 0, 1),
        cellularInfiltrateCount: Math.round(
          clamp(Number(sp.cellularInfiltrateCount ?? fbStage.sceneParams.cellularInfiltrateCount), 10, 180)
        ),
      },
      biomarkers:
        Array.isArray(st?.biomarkers) && st.biomarkers.length >= 2
          ? st.biomarkers.slice(0, 4).map((bm, bIdx) => ({
              label: bm.label || fbStage.biomarkers[bIdx]?.label || 'Metric',
              value: Number.isFinite(Number(bm.value)) ? Number(bm.value) : 0,
              unit: bm.unit || '',
              referenceRange: bm.referenceRange || 'Normal',
              status: ['nominal', 'elevated', 'critical', 'depressed'].includes(bm.status)
                ? bm.status
                : 'nominal',
              decimals: bm.decimals ?? (Number.isInteger(Number(bm.value)) ? 0 : 1),
            }))
          : fbStage.biomarkers,
    };
  }) as [PathologyStage, PathologyStage, PathologyStage, PathologyStage];

  const hotspots =
    Array.isArray(raw.hotspots) && raw.hotspots.length >= 2
      ? raw.hotspots.slice(0, 5).map((hs, idx) => {
          const fbHs = fallback.hotspots[idx % fallback.hotspots.length];
          const pos =
            Array.isArray(hs.position3D) && hs.position3D.length === 3
              ? ([
                  clamp(Number(hs.position3D[0]) || fbHs.position3D[0], -1.6, 1.6),
                  clamp(Number(hs.position3D[1]) || fbHs.position3D[1], -1.6, 1.6),
                  clamp(Number(hs.position3D[2]) || fbHs.position3D[2], -1.6, 1.6),
                ] as [number, number, number])
              : fbHs.position3D;
          return {
            id: hs.id || `hs-custom-${idx + 1}`,
            indexNumber: idx + 1,
            label: hs.label || fbHs.label,
            anatomicalStructure: hs.anatomicalStructure || fbHs.anatomicalStructure,
            position3D: pos,
            pathologyEffect: hs.pathologyEffect || fbHs.pathologyEffect,
            bodyReaction: hs.bodyReaction || fbHs.bodyReaction,
            histologicalFinding: hs.histologicalFinding || fbHs.histologicalFinding,
            clinicalPearl: hs.clinicalPearl || fbHs.clinicalPearl,
            severity: ['baseline', 'compensatory', 'critical'].includes(hs.severity)
              ? hs.severity
              : fbHs.severity,
          };
        })
      : fallback.hotspots;

  const compensatoryPathway =
    Array.isArray(raw.compensatoryPathway) && raw.compensatoryPathway.length >= 2
      ? raw.compensatoryPathway.slice(0, 4).map((cp, idx) => ({
          stepNumber: idx + 1,
          phaseTitle: cp.phaseTitle || fallback.compensatoryPathway[idx]?.phaseTitle || `Phase ${idx + 1}`,
          mechanismType: ['Hemodynamic', 'Neurohormonal', 'Immunological', 'Cellular Remodeling'].includes(
            cp.mechanismType
          )
            ? cp.mechanismType
            : 'Hemodynamic',
          trigger: cp.trigger || fallback.compensatoryPathway[idx]?.trigger || '',
          physiologicalReaction:
            cp.physiologicalReaction || fallback.compensatoryPathway[idx]?.physiologicalReaction || '',
          clinicalConsequence:
            cp.clinicalConsequence || fallback.compensatoryPathway[idx]?.clinicalConsequence || '',
        }))
      : fallback.compensatoryPathway;

  return {
    id: raw.id || `ai-${Date.now()}`,
    title: raw.title || fallback.title,
    clinicalQuestion: originalQuery,
    organSystem,
    archetype3D,
    icdCode: raw.icdCode || fallback.icdCode,
    summary: raw.summary || fallback.summary,
    primaryInsultSummary: raw.primaryInsultSummary || fallback.primaryInsultSummary,
    hostReactionSummary: raw.hostReactionSummary || fallback.hostReactionSummary,
    stages: normalizedStages,
    hotspots,
    compensatoryPathway,
    createdAt: new Date().toISOString(),
    isCustomGenerated: true,
  };
}
