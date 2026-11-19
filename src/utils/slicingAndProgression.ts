import { StageSceneParams } from '../types/pathology';

export type SliceAxis = 'off' | 'coronal' | 'sagittal' | 'axial';

export interface SliceState {
  axis: SliceAxis;
  /** Normalized slice position in [-1, 1] across the organ bounding box along the chosen axis. */
  depth: number;
  /** Reverses which half of the organ is clipped away. */
  flip: boolean;
}

export interface ComputedClipPlane {
  active: boolean;
  normal: [number, number, number];
  constant: number;
  worldCoord: number;
  indicatorPos: [number, number, number];
  indicatorEuler: [number, number, number];
  indicatorSize: [number, number];
}

export interface PathologyVisualState {
  fibrosisShader: number;
  hypoxiaShader: number;
  inflammationShader: number;
  lesionIntensity: number;
  stenosisRadiusFactor: number;
  flowSpeed: number;
  pulseAmplitude: number;
  pulseFrequency: number;
}

function clamp01(val: number): number {
  return Math.max(0, Math.min(1, val));
}

/**
 * Computes the Three.js clipping plane (n · p + constant >= 0 is kept)
 * and matching visual cutting-frame transform for an anatomical cross-section plane.
 *
 * Default (unflipped) orientations remove the camera-facing / anterior / superior half
 * so the user immediately sees cleanly into the organ interior:
 * - coronal: cuts along Z, normal (0, 0, -1) keeps posterior (z <= coord)
 * - sagittal: cuts along X, normal (-1, 0, 0) keeps anatomical right/viewer-left (x <= coord)
 * - axial: cuts along Y, normal (0, -1, 0) keeps inferior half (y <= coord)
 */
export function computeAnatomicalClipPlane(
  slice: SliceState,
  boundsMin: [number, number, number],
  boundsMax: [number, number, number]
): ComputedClipPlane {
  const cx = (boundsMin[0] + boundsMax[0]) * 0.5;
  const cy = (boundsMin[1] + boundsMax[1]) * 0.5;
  const cz = (boundsMin[2] + boundsMax[2]) * 0.5;
  const sx = Math.max(0.4, boundsMax[0] - boundsMin[0]);
  const sy = Math.max(0.4, boundsMax[1] - boundsMin[1]);
  const sz = Math.max(0.4, boundsMax[2] - boundsMin[2]);

  if (slice.axis === 'off') {
    return {
      active: false,
      normal: [0, 0, -1],
      constant: 100,
      worldCoord: cz,
      indicatorPos: [cx, cy, cz],
      indicatorEuler: [0, 0, 0],
      indicatorSize: [sx * 1.12, sy * 1.12],
    };
  }

  const clampedDepth = Math.max(-0.95, Math.min(0.95, slice.depth));
  const t = (clampedDepth + 1) * 0.5; // [0.025 .. 0.975]
  const sign = slice.flip ? 1 : -1;

  if (slice.axis === 'coronal') {
    const zCoord = boundsMin[2] + t * sz;
    const normal: [number, number, number] = [0, 0, sign];
    // n · p + constant = 0 at zCoord => sign * zCoord + constant = 0 => constant = -sign * zCoord
    const constant = -sign * zCoord;
    return {
      active: true,
      normal,
      constant,
      worldCoord: zCoord,
      indicatorPos: [cx, cy, zCoord],
      indicatorEuler: [0, 0, 0],
      indicatorSize: [sx * 1.14, sy * 1.14],
    };
  }

  if (slice.axis === 'sagittal') {
    const xCoord = boundsMin[0] + t * sx;
    const normal: [number, number, number] = [sign, 0, 0];
    const constant = -sign * xCoord;
    return {
      active: true,
      normal,
      constant,
      worldCoord: xCoord,
      indicatorPos: [xCoord, cy, cz],
      indicatorEuler: [0, Math.PI * 0.5, 0],
      indicatorSize: [sz * 1.14, sy * 1.14],
    };
  }

  // axial (transverse horizontal cut along Y)
  const yCoord = boundsMin[1] + t * sy;
  const normal: [number, number, number] = [0, sign, 0];
  const constant = -sign * yCoord;
  return {
    active: true,
    normal,
    constant,
    worldCoord: yCoord,
    indicatorPos: [cx, yCoord, cz],
    indicatorEuler: [Math.PI * 0.5, 0, 0],
    indicatorSize: [sx * 1.14, sz * 1.14],
  };
}

/**
 * Derives deterministic GLSL shader uniforms and biomechanical animation parameters
 * from the interpolated clinical stage parameters.
 */
export function computePathologyVisualState(params: StageSceneParams): PathologyVisualState {
  const fibrosisShader = clamp01(params.fibrosisIntensity);
  const hypoxiaShader = clamp01(params.hypoxiaTint);
  const inflammationShader = clamp01(params.inflammationLevel);
  const lesionIntensity = clamp01(params.lesionScale);
  const stenosis = clamp01(params.stenosisRatio);
  const perfusion = Math.max(0.1, Math.min(2.0, params.perfusionSpeed));

  return {
    fibrosisShader,
    hypoxiaShader,
    inflammationShader,
    lesionIntensity,
    // Arterial lumen visually constricts up to ~55% at severe stenosis
    stenosisRadiusFactor: 1 - stenosis * 0.55,
    // Blood flow bolus velocity slows dramatically as stenosis rises
    flowSpeed: Math.max(0.1, perfusion * (1 - stenosis * 0.72)),
    // Elastic physiological beat damps down as myocardial/parenchymal fibrosis stiffens tissue
    pulseAmplitude: Math.max(0.004, 0.022 * (1 - fibrosisShader * 0.72)),
    // Compensatory tachycardia / sympathetic surge under acute inflammation & hypoperfusion
    pulseFrequency: 1.12 + inflammationShader * 0.42 + stenosis * 0.25,
  };
}
