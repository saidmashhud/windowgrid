import { FenwickTree } from "./fenwick.js";
import type { AxisConfig, Range, VirtualItem } from "./types.js";

export interface ScrollMapping {
  offset: number;
  adjustment: number;
  scrollSize: number;
}

export class Axis {
  static readonly MAX_SCROLL_SIZE = 15_000_000;

  private tree: FenwickTree;
  private readonly measured: Uint8Array;
  private estimatedSize: number;
  private overscanValue: number;

  constructor(config: AxisConfig) {
    this.estimatedSize = config.estimatedSize;
    this.overscanValue = Math.max(0, Math.floor(config.overscan));
    this.tree = new FenwickTree(config.count, config.estimatedSize);
    this.measured = new Uint8Array(config.count);
  }

  get count(): number {
    return this.tree.length;
  }

  get overscan(): number {
    return this.overscanValue;
  }

  setOverscan(value: number): void {
    this.overscanValue = Math.max(0, Math.floor(value));
  }

  getSize(index: number): number {
    return this.tree.getSize(index);
  }

  isMeasured(index: number): boolean {
    return this.measured[index] === 1;
  }

  getOffset(index: number): number {
    return this.tree.offsetOf(index);
  }

  getTotalSize(): number {
    return this.tree.total();
  }

  getScrollSize(): number {
    return Math.min(this.tree.total(), Axis.MAX_SCROLL_SIZE);
  }

  mapScroll(scroll: number, viewport: number): ScrollMapping {
    const total = this.tree.total();
    if (total <= Axis.MAX_SCROLL_SIZE) {
      return { offset: scroll, adjustment: 0, scrollSize: total };
    }
    const scrollSize = Axis.MAX_SCROLL_SIZE;
    const maxPhysical = Math.max(1, scrollSize - viewport);
    const maxVirtual = Math.max(0, total - viewport);
    const pct = Math.min(1, Math.max(0, scroll / maxPhysical));
    const offset = pct * maxVirtual;
    return { offset, adjustment: offset - scroll, scrollSize };
  }

  measure(index: number, size: number): boolean {
    const prev = this.tree.getSize(index);
    this.measured[index] = 1;
    if (prev === size) return false;
    this.tree.set(index, size);
    return true;
  }

  unmeasure(index: number): void {
    if (this.measured[index] !== 1) return;
    this.measured[index] = 0;
    this.tree.set(index, this.estimatedSize);
  }

  indexAt(offset: number): number {
    return this.tree.findIndex(offset);
  }

  computeRange(scroll: number, size: number, exclude?: Set<number>): Range {
    const n = this.count;
    if (n === 0) return { start: 0, end: 0 };

    const first = this.indexAt(scroll);
    const last = this.indexAt(scroll + size);

    let start = Math.max(0, first - this.overscanValue);
    let end = Math.min(n, last + this.overscanValue + 1);

    if (exclude && exclude.size > 0) {
      while (start < end && exclude.has(start)) start++;
      while (end > start && exclude.has(end - 1)) end--;
    }

    return { start, end };
  }

  itemsForRange(range: Range, exclude?: Set<number>): VirtualItem[] {
    const items: VirtualItem[] = [];
    if (range.end <= range.start) return items;

    let offset = this.tree.offsetOf(range.start);
    for (let i = range.start; i < range.end; i++) {
      const size = this.tree.getSize(i);
      if (!exclude || !exclude.has(i)) {
        items.push({ index: i, offset, size });
      }
      offset += size;
    }
    return items;
  }

  setEstimatedSize(size: number): void {
    if (size === this.estimatedSize) return;
    this.estimatedSize = size;
    for (let i = 0; i < this.count; i++) {
      if (this.measured[i] !== 1) this.tree.set(i, size);
    }
  }
}
