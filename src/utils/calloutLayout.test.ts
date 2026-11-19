import test from 'node:test';
import assert from 'node:assert/strict';
import { computeNonCrossingCallouts } from './calloutLayout';

test('computeNonCrossingCallouts sorts each side vertically by targetY so leader lines never cross', () => {
  const slots = computeNonCrossingCallouts(
    [
      { id: 'bottom-left', targetX: 460, targetY: 590, visible: true },
      { id: 'top-left', targetX: 440, targetY: 220, visible: true },
      { id: 'bottom-right', targetX: 820, targetY: 610, visible: true },
      { id: 'top-right', targetX: 810, targetY: 240, visible: true },
    ],
    1440,
    900
  );

  const byId = new Map(slots.map((s) => [s.id, s]));
  assert.equal(byId.get('top-left')!.side, 'left');
  assert.equal(byId.get('bottom-left')!.side, 'left');
  assert.equal(byId.get('top-right')!.side, 'right');
  assert.equal(byId.get('bottom-right')!.side, 'right');

  // Monotonic vertical ordering matches targetY -> zero line crossing
  assert.ok(byId.get('top-left')!.cardY < byId.get('bottom-left')!.cardY);
  assert.ok(byId.get('top-right')!.cardY < byId.get('bottom-right')!.cardY);
});

test('computeNonCrossingCallouts prevents overlapping cards when two hotspots project to identical Y', () => {
  const slots = computeNonCrossingCallouts(
    [
      { id: 'a', targetX: 400, targetY: 360, visible: true },
      { id: 'b', targetX: 420, targetY: 362, visible: true },
      { id: 'c', targetX: 900, targetY: 360, visible: true },
      { id: 'd', targetX: 920, targetY: 362, visible: true },
    ],
    1440,
    900
  );

  const left = slots.filter((s) => s.side === 'left').sort((x, y) => x.cardY - y.cardY);
  const right = slots.filter((s) => s.side === 'right').sort((x, y) => x.cardY - y.cardY);

  assert.equal(left.length, 2);
  assert.equal(right.length, 2);
  assert.ok(left[1].cardY - left[0].cardY >= 70, 'Left cards should have >= 70px vertical separation');
  assert.ok(right[1].cardY - right[0].cardY >= 70, 'Right cards should have >= 70px vertical separation');
});

test('computeNonCrossingCallouts balances sides even when all hotspots cluster on one side of center', () => {
  const slots = computeNonCrossingCallouts(
    [
      { id: '1', targetX: 600, targetY: 200, visible: true },
      { id: '2', targetX: 610, targetY: 300, visible: true },
      { id: '3', targetX: 620, targetY: 400, visible: true },
      { id: '4', targetX: 630, targetY: 500, visible: true },
    ],
    1440,
    900
  );

  const leftCount = slots.filter((s) => s.side === 'left').length;
  const rightCount = slots.filter((s) => s.side === 'right').length;
  assert.equal(leftCount, 2);
  assert.equal(rightCount, 2);
});
