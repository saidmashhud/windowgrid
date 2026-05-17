import { describe, it, expect } from "vitest";
import { ColumnModel } from "./columns.js";

const makeCols = (count: number, width: number, pin?: { left?: number[]; right?: number[] }) =>
  new ColumnModel(
    { count, estimatedSize: width, overscan: 0 },
    { left: pin?.left ?? [], right: pin?.right ?? [] },
  );

describe("ColumnModel reorder index math", () => {
  it("identity order initially", () => {
    const c = makeCols(5, 100);
    expect([...c.getOrder()]).toEqual([0, 1, 2, 3, 4]);
    expect(c.logicalAt(2)).toBe(2);
    expect(c.visualOf(2)).toBe(2);
  });

  it("moves a column forward and shifts the rest", () => {
    const c = makeCols(5, 100);
    c.reorder(0, 2);
    expect([...c.getOrder()]).toEqual([1, 2, 0, 3, 4]);
    expect(c.visualOf(0)).toBe(2);
    expect(c.logicalAt(0)).toBe(1);
  });

  it("moves a column backward", () => {
    const c = makeCols(5, 100);
    c.reorder(4, 1);
    expect([...c.getOrder()]).toEqual([0, 4, 1, 2, 3]);
  });

  it("reorder is a no-op when from === to", () => {
    const c = makeCols(4, 100);
    c.reorder(2, 2);
    expect([...c.getOrder()]).toEqual([0, 1, 2, 3]);
  });

  it("widths travel with the column across a reorder", () => {
    const c = makeCols(4, 100);
    c.resize(1, 250);
    expect(c.axis.getSize(c.visualOf(1))).toBe(250);
    c.reorder(1, 3);
    expect(c.visualOf(1)).toBe(3);
    expect(c.axis.getSize(3)).toBe(250);
    expect(c.axis.getSize(0)).toBe(100);
  });

  it("rejects out-of-range reorder", () => {
    const c = makeCols(3, 100);
    expect(() => c.reorder(0, 5)).toThrow(RangeError);
    expect(() => c.reorder(-1, 0)).toThrow(RangeError);
  });

  it("the inverse permutation stays consistent after several reorders", () => {
    const c = makeCols(6, 100);
    c.reorder(0, 5);
    c.reorder(3, 1);
    c.reorder(5, 0);
    for (let v = 0; v < 6; v++) {
      expect(c.visualOf(c.logicalAt(v))).toBe(v);
    }
  });
});

describe("ColumnModel resize", () => {
  it("resize by logical id updates the axis width", () => {
    const c = makeCols(3, 100);
    c.resize(2, 333);
    expect(c.axis.getSize(2)).toBe(333);
    expect(c.axis.getTotalSize()).toBe(100 + 100 + 333);
  });

  it("clamps negative widths to zero", () => {
    const c = makeCols(3, 100);
    c.resize(0, -50);
    expect(c.axis.getSize(0)).toBe(0);
  });
});

describe("ColumnModel pinning", () => {
  it("reports pinned sets in visual order", () => {
    const c = makeCols(6, 100, { left: [1, 0], right: [5] });
    expect(c.getLeftPinned()).toEqual([0, 1]);
    expect(c.getRightPinned()).toEqual([5]);
    expect(c.isPinned(0)).toBe(true);
    expect(c.isPinned(3)).toBe(false);
  });

  it("pinnedVisualSet maps logical pins to visual positions", () => {
    const c = makeCols(6, 100, { left: [0], right: [5] });
    c.reorder(0, 2);
    const set = c.pinnedVisualSet();
    expect(set.has(c.visualOf(0))).toBe(true);
    expect(set.has(c.visualOf(5))).toBe(true);
  });

  it("pinLeft/pinRight/unpin mutate membership exclusively", () => {
    const c = makeCols(4, 100);
    c.pinLeft(2);
    expect(c.getLeftPinned()).toEqual([2]);
    c.pinRight(2);
    expect(c.getLeftPinned()).toEqual([]);
    expect(c.getRightPinned()).toEqual([2]);
    c.unpin(2);
    expect(c.isPinned(2)).toBe(false);
  });
});
