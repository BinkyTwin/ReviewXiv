export interface RangeOffsets {
  start: number;
  end: number;
}

export function getOffsetsForRange(
  root: HTMLElement,
  range: Range,
): RangeOffsets | null {
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const preRange = document.createRange();
  preRange.setStart(root, 0);
  preRange.setEnd(range.startContainer, range.startOffset);
  const preText = preRange.cloneContents().textContent || "";

  const selectionText = range.cloneContents().textContent || "";

  return {
    start: preText.length,
    end: preText.length + selectionText.length,
  };
}

export function createRangeFromOffsets(
  root: HTMLElement,
  startOffset: number,
  endOffset: number,
): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentOffset = 0;
  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startNodeOffset = 0;
  let endNodeOffset = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const length = node.nodeValue?.length ?? 0;

    if (!startNode && currentOffset + length >= startOffset) {
      startNode = node;
      startNodeOffset = Math.max(0, startOffset - currentOffset);
    }

    if (currentOffset + length >= endOffset) {
      endNode = node;
      endNodeOffset = Math.max(0, endOffset - currentOffset);
      break;
    }

    currentOffset += length;
  }

  if (!startNode || !endNode) {
    return null;
  }

  const range = document.createRange();
  range.setStart(startNode, startNodeOffset);
  range.setEnd(endNode, endNodeOffset);
  return range;
}
