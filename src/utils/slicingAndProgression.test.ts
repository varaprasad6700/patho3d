import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAnatomicalClipPlane,
  computePathologyVisualState,
} from './slicingAndProgression';
import { StageSceneParams } from '../types/pathology';

const SAMPLE_MIN: [number, number, number] = [-1.0, -1.2, -0.8];
const SAMPLE_MAX: [number, number, number] = [1.0, 0.8, 0.8];

test('computeAnatomicalClipPlane returns inactive plane when axis is off', () => {
  const res = computeAnatomicalClipPlane(
    { axis: 'off', depth: 0, flip: false },
    SAMPLE_MIN,
    SAMPLE_MAX
  );
  assert.equal(res.active, false);
  assert.ok(res.constant > 50);
});

test('computeAnatomicalClipPlane places coronal plane accurately and clips front half by default', () => {
  const res = computeAnatomicalClipPlane(
    { axis: 'coronal', depth: 0.25, flip: false },
    SAMPLE_MIN,
    SAMPLE_MAX
  );
  assert.equal(res.active, true);
  assert.deepEqual(res.normal, [0, 0, -1]);

  // Point on the plane satisfies n · p + constant === 0
  const onPlaneVal = res.normal[2] * res.worldCoord + res.constant;
  assert.ok(Math.abs(onPlaneVal) < 1e-6);

  // Camera-facing point (+Z beyond plane) is clipped (< 0)
  const frontVal = res.normal[2] * (res.worldCoord + 0.3) + res.constant;
  assert.ok(frontVal < 0, 'front point should be clipped away');

  // Posterior point (-Z behind plane) is kept (> 0)
  const backVal = res.normal[2] * (res.worldCoord - 0.3) + res.constant;
  assert.ok(backVal > 0, 'posterior point should remain visible');
});

test('computeAnatomicalClipPlane flip reverses kept half-space for axial and sagittal axes', () => {
  const axialNorm = computeAnatomicalClipPlane(
    { axis: 'axial', depth: 0, flip: false },
    SAMPLE_MIN,
    SAMPLE_MAX
  );
  const axialFlip = computeAnatomicalClipPlane(
    { axis: 'axial', depth: 0, flip: true },
    SAMPLE_MIN,
    SAMPLE_MAX
  );
  assert.deepEqual(axialNorm.normal, [0, -1, 0]);
  assert.deepEqual(axialFlip.normal, [0, 1, 0]);
  assert.equal(axialNorm.worldCoord, axialFlip.worldCoord);

  const sagFlip = computeAnatomicalClipPlane(
    { axis: 'sagittal', depth: -0.5, flip: true },
    SAMPLE_MIN,
    SAMPLE_MAX
  );
  assert.deepEqual(sagFlip.normal, [1, 0, 0]);
  const rightKept = sagFlip.normal[0] * (sagFlip.worldCoord + 0.4) + sagFlip.constant;
  assert.ok(rightKept > 0);
});

test('computePathologyVisualState scales fibrosis, hypoxia, stenosis, flowSpeed, and stiffness from Stage 0 to Stage 3', () => {
  const stage0: StageSceneParams = {
    lesionScale: 0.0,
    wallHypertrophy: 0.0,
    stenosisRatio: 0.05,
    inflammationLevel: 0.05,
    fibrosisIntensity: 0.0,
    perfusionSpeed: 1.0,
    cellularInfiltrateCount: 10,
    edemaScale: 0.0,
    hypoxiaTint: 0.0,
  };
  const stage3: StageSceneParams = {
    lesionScale: 0.95,
    wallHypertrophy: 0.85,
    stenosisRatio: 0.9,
    inflammationLevel: 0.85,
    fibrosisIntensity: 0.9,
    perfusionSpeed: 0.35,
    cellularInfiltrateCount: 160,
    edemaScale: 0.75,
    hypoxiaTint: 0.88,
  };

  const v0 = computePathologyVisualState(stage0);
  const v3 = computePathologyVisualState(stage3);

  assert.ok(v3.fibrosisShader > v0.fibrosisShader);
  assert.ok(v3.hypoxiaShader > v0.hypoxiaShader);
  assert.ok(v3.inflammationShader > v0.inflammationShader);
  assert.ok(v3.lesionIntensity > v0.lesionIntensity);
  assert.ok(v3.stenosisRadiusFactor < v0.stenosisRadiusFactor);
  assert.ok(v3.flowSpeed < v0.flowSpeed);
  assert.ok(v3.pulseAmplitude < v0.pulseAmplitude);
  assert.ok(v3.pulseFrequency > v0.pulseFrequency);
});
