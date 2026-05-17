import { Axis } from "./axis.js";
import type { AxisConfig, ColumnPinConfig } from "./types.js";

export class ColumnModel {
  readonly axis: Axis;
  private order: number[];
  private position: number[];
  private leftPinned: Set<number>;
  private rightPinned: Set<number>;

  constructor(config: AxisConfig, pin?: ColumnPinConfig) {
    this.axis = new Axis(config);
    this.order = Array.from({ length: config.count }, (_, i) => i);
    this.position = this.order.slice();
    this.leftPinned = new Set(pin?.left ?? []);
    this.rightPinned = new Set(pin?.right ?? []);
  }

  get count(): number {
    return this.axis.count;
  }

  logicalAt(visual: number): number {
    const id = this.order[visual];
    if (id === undefined) throw new RangeError(`visual index ${visual} out of range`);
    return id;
  }

  visualOf(logical: number): number {
    const v = this.position[logical];
    if (v === undefined) throw new RangeError(`logical id ${logical} out of range`);
    return v;
  }

  getOrder(): readonly number[] {
    return this.order;
  }

  reorder(from: number, to: number): void {
    const n = this.count;
    if (from < 0 || from >= n || to < 0 || to >= n) {
      throw new RangeError(`reorder(${from}, ${to}) out of range [0, ${n})`);
    }
    if (from === to) return;

    const widthByLogical = new Map<number, number>();
    for (let v = 0; v < n; v++) {
      widthByLogical.set(this.order[v]!, this.axis.getSize(v));
    }

    const moved = this.order.splice(from, 1)[0]!;
    this.order.splice(to, 0, moved);

    for (let v = 0; v < n; v++) this.position[this.order[v]!] = v;

    for (let v = 0; v < n; v++) {
      const w = widthByLogical.get(this.order[v]!);
      if (w !== undefined) this.axis.measure(v, w);
    }
  }

  resize(logical: number, width: number): void {
    this.axis.measure(this.visualOf(logical), Math.max(0, width));
  }

  resizeVisual(visual: number, width: number): void {
    this.axis.measure(visual, Math.max(0, width));
  }

  pinLeft(logical: number): void {
    this.rightPinned.delete(logical);
    this.leftPinned.add(logical);
  }

  pinRight(logical: number): void {
    this.leftPinned.delete(logical);
    this.rightPinned.add(logical);
  }

  unpin(logical: number): void {
    this.leftPinned.delete(logical);
    this.rightPinned.delete(logical);
  }

  isPinned(logical: number): boolean {
    return this.leftPinned.has(logical) || this.rightPinned.has(logical);
  }

  getLeftPinned(): number[] {
    return this.sortedByVisual(this.leftPinned);
  }

  getRightPinned(): number[] {
    return this.sortedByVisual(this.rightPinned);
  }

  pinnedVisualSet(): Set<number> {
    const set = new Set<number>();
    for (const logical of this.leftPinned) set.add(this.visualOf(logical));
    for (const logical of this.rightPinned) set.add(this.visualOf(logical));
    return set;
  }

  private sortedByVisual(ids: Set<number>): number[] {
    return [...ids].sort((a, b) => this.visualOf(a) - this.visualOf(b));
  }
}
