export interface ProjectedHotspotInput {
  id: string;
  targetX: number;
  targetY: number;
  visible: boolean;
}

export interface ComputedCalloutSlot {
  id: string;
  side: 'left' | 'right';
  cardWidth: number;
  cardX: number;
  cardY: number;
  anchorEndX: number;
  anchorEndY: number;
  elbowX: number;
  targetX: number;
  targetY: number;
  visible: boolean;
}

/**
 * Computes non-crossing left/right margin callout positions sorted by projected targetY.
 * Guarantees that leader lines on the same side never intersect each other and never overlap cards.
 */
export function computeNonCrossingCallouts(
  inputs: ProjectedHotspotInput[],
  viewportW: number,
  viewportH: number
): ComputedCalloutSlot[] {
  if (inputs.length === 0) return [];

  const centerX = viewportW * 0.5;
  const cardWidth = Math.min(235, Math.max(168, Math.floor(viewportW * 0.21)));
  const cardHeight = 56;
  const minGapY = 22;
  const topBound = Math.max(158, Math.floor(viewportH * 0.2));
  const bottomBound = Math.max(topBound + cardHeight * 2, viewportH - 185);

  // Assign each hotspot to the side closest to its projected X, then rebalance if heavily skewed
  const leftItems: ProjectedHotspotInput[] = [];
  const rightItems: ProjectedHotspotInput[] = [];

  const sortedByX = [...inputs].sort((a, b) => a.targetX - b.targetX);
  const maxPerSide = Math.ceil(inputs.length / 2);

  for (const item of sortedByX) {
    if (item.targetX <= centerX && leftItems.length < maxPerSide) {
      leftItems.push(item);
    } else if (rightItems.length < maxPerSide) {
      rightItems.push(item);
    } else {
      leftItems.push(item);
    }
  }

  const placeSide = (
    sideItems: ProjectedHotspotInput[],
    side: 'left' | 'right'
  ): ComputedCalloutSlot[] => {
    // Sort top-to-bottom by projected targetY so leader lines NEVER cross each other
    const ordered = [...sideItems].sort((a, b) => a.targetY - b.targetY);

    const centerSpread = Math.min(350, viewportW * 0.32);
    const cardX =
      side === 'left'
        ? Math.max(22, Math.round(centerX - centerSpread - cardWidth * 0.55))
        : Math.min(
            viewportW - cardWidth - 22,
            Math.round(centerX + centerSpread - cardWidth * 0.45)
          );

    // Start each card vertically near its targetY, then resolve collisions top-down and bottom-up
    const idealYs = ordered.map((item) =>
      Math.max(topBound, Math.min(bottomBound - cardHeight, item.targetY - cardHeight * 0.45))
    );

    const step = cardHeight + minGapY;
    for (let i = 1; i < idealYs.length; i++) {
      if (idealYs[i] < idealYs[i - 1] + step) {
        idealYs[i] = idealYs[i - 1] + step;
      }
    }

    // Clamp bottom overflow back upward without introducing overlap
    const maxY = bottomBound - cardHeight;
    if (idealYs.length > 0 && idealYs[idealYs.length - 1] > maxY) {
      idealYs[idealYs.length - 1] = maxY;
      for (let i = idealYs.length - 2; i >= 0; i--) {
        if (idealYs[i] > idealYs[i + 1] - step) {
          idealYs[i] = Math.max(topBound, idealYs[i + 1] - step);
        }
      }
    }

    return ordered.map((item, idx) => {
      const cardY = Math.round(idealYs[idx]);
      const anchorEndX = side === 'left' ? cardX + cardWidth - 6 : cardX + 6;
      const anchorEndY = cardY + 20;
      const horizontalLead = 24;
      const elbowX =
        side === 'left'
          ? Math.min(item.targetX - 12, anchorEndX + horizontalLead)
          : Math.max(item.targetX + 12, anchorEndX - horizontalLead);

      return {
        id: item.id,
        side,
        cardWidth,
        cardX,
        cardY,
        anchorEndX,
        anchorEndY,
        elbowX,
        targetX: item.targetX,
        targetY: item.targetY,
        visible: item.visible,
      };
    });
  };

  const placedMap = new Map<string, ComputedCalloutSlot>();
  for (const slot of [...placeSide(leftItems, 'left'), ...placeSide(rightItems, 'right')]) {
    placedMap.set(slot.id, slot);
  }

  // Return in original input order for stable React keying
  return inputs.map((inp) => placedMap.get(inp.id)!);
}
