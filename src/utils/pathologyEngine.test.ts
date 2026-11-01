import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyPathologyQuery,
  interpolateStageBiomarkers,
  interpolateStageSceneParams,
  normalizeAISpec,
  resolveActiveStageIndex,
  validateClinicalQuery,
} from './pathologyEngine';
import { CLINICAL_CASES } from '../data/clinicalCases';

test('validateClinicalQuery rejects empty or overly short queries and sanitizes valid ones', () => {
  const emptyRes = validateClinicalQuery('   ');
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.error);

  const shortRes = validateClinicalQuery('abc');
  assert.equal(shortRes.valid, false);

  const validRes = validateClinicalQuery('  How does portal hypertension cause ascites?  ');
  assert.equal(validRes.valid, true);
  assert.equal(validRes.sanitizedQuery, 'How does portal hypertension cause ascites?');
});

test('classifyPathologyQuery maps clinical queries across all organ systems accurately', () => {
  assert.deepEqual(classifyPathologyQuery('How does hepatic cirrhosis cause portal hypertension and varices?'), {
    organSystem: 'hepatobiliary',
    archetype3D: 'liver_portal',
  });

  assert.deepEqual(classifyPathologyQuery('Diabetic nephropathy glomerular hyperfiltration and podocyte loss'), {
    organSystem: 'renal',
    archetype3D: 'kidney_nephron',
  });

  assert.deepEqual(classifyPathologyQuery('Peptic ulcer perforation in the gastric antrum'), {
    organSystem: 'gastrointestinal',
    archetype3D: 'gi_mucosa_ulcer',
  });

  assert.deepEqual(classifyPathologyQuery('LAD coronary plaque rupture and left ventricular remodeling'), {
    organSystem: 'cardiovascular',
    archetype3D: 'heart_coronary',
  });

  assert.deepEqual(classifyPathologyQuery('ARDS alveolar hyaline membrane and surfactant loss'), {
    organSystem: 'respiratory',
    archetype3D: 'lung_alveoli',
  });
});

test('interpolateStageSceneParams and interpolateStageBiomarkers smoothly blend across stages 0..3', () => {
  const cardioCase = CLINICAL_CASES[0];

  const stage0Params = interpolateStageSceneParams(cardioCase.stages, 0);
  assert.equal(stage0Params.stenosisRatio, cardioCase.stages[0].sceneParams.stenosisRatio);

  const midParams = interpolateStageSceneParams(cardioCase.stages, 1.5);
  const s1 = cardioCase.stages[1].sceneParams.stenosisRatio;
  const s2 = cardioCase.stages[2].sceneParams.stenosisRatio;
  assert.ok(midParams.stenosisRatio > s1 && midParams.stenosisRatio < s2);

  const midBiomarkers = interpolateStageBiomarkers(cardioCase.stages, 1.5);
  assert.equal(midBiomarkers.length, 4);
  const lvefMid = midBiomarkers[0].value;
  assert.ok(lvefMid < cardioCase.stages[1].biomarkers[0].value);
  assert.ok(lvefMid > cardioCase.stages[2].biomarkers[0].value);
});

test('resolveActiveStageIndex clamps and rounds fractional stage scrubber values', () => {
  assert.equal(resolveActiveStageIndex(-1), 0);
  assert.equal(resolveActiveStageIndex(0.4), 0);
  assert.equal(resolveActiveStageIndex(0.6), 1);
  assert.equal(resolveActiveStageIndex(2.49), 2);
  assert.equal(resolveActiveStageIndex(2.51), 3);
  assert.equal(resolveActiveStageIndex(9.0), 3);
});

test('normalizeAISpec clamps out-of-range scene parameters and preserves 4 valid stages', () => {
  const normalized = normalizeAISpec(
    {
      title: 'Acute Renal Artery Stenosis & Goldblatt Hypertension',
      organSystem: 'renal',
      archetype3D: 'kidney_nephron',
    },
    'How does renal artery stenosis trigger RAAS hypertension?'
  );

  assert.equal(normalized.organSystem, 'renal');
  assert.equal(normalized.archetype3D, 'kidney_nephron');
  assert.equal(normalized.stages.length, 4);
  assert.ok(normalized.hotspots.length >= 3);
  assert.ok(normalized.compensatoryPathway.length === 4);
});
