import { describe, it, expect } from "vitest";
import { Axis } from "./axis.js";

const makeAxis = (count: number, est: number, overscan = 0) =>
  new Axis({ count, estimatedSize: est, overscan });

describe("Axis estimation and measurement", () => {
  it("starts every item at the estimate", () => {
    const a = makeAxis(10, 30);
    expect(a.getSize(0)).toBe(30);
    expect(a.getTotalSize()).toBe(300);
    expect(a.isMeasured(0)).toBe(false);
  });

  it("measure replaces the estimate and shifts downstream offsets", () => {
    const a = makeAxis(5, 30);
    expect(a.getOffset(2)).toBe(60);
    const changed = a.measure(1, 100);
    expect(changed).toBe(true);
    expect(a.isMeasured(1)).toBe(true);
    expect(a.getOffset(2)).toBe(130);
    expect(a.getTotalSize()).toBe(30 + 100 + 30 + 30 + 30);
  });

  it("measure returns false when the size is unchanged", () => {
    const a = makeAxis(3, 30);
    expect(a.measure(0, 30)).toBe(false);
  });

  it("unmeasure reverts to the current estimate", () => {
    const a = makeAxis(3, 30);
    a.measure(0, 80);
    a.unmeasure(0);
    expect(a.getSize(0)).toBe(30);
    expect(a.isMeasured(0)).toBe(false);
  });

  it("setEstimatedSize only affects unmeasured items", () => {
    const a = makeAxis(4, 30);
    a.measure(1, 100);
    a.setEstimatedSize(50);
    expect(a.getSize(0)).toBe(50);
    expect(a.getSize(1)).toBe(100);
    expect(a.getSize(2)).toBe(50);
  });

  it("indexAt maps a pixel offset to the containing item", () => {
    const a = makeAxis(5, 30);
    a.measure(0, 100);
    expect(a.indexAt(0)).toBe(0);
    expect(a.indexAt(99)).toBe(0);
    expect(a.indexAt(100)).toBe(1);
    expect(a.indexAt(135)).toBe(2);
  });
});

describe("Axis.computeRange (viewport windowing)", () => {
  it("returns a tight window with no overscan", () => {
    const a = makeAxis(100, 30);
    const r = a.computeRange(0, 300);
    expect(r.start).toBe(0);
    expect(r.end).toBe(11);
  });

  it("applies overscan symmetrically and clamps at edges", () => {
    const a = makeAxis(100, 30, 3);
    const top = a.computeRange(0, 300);
    expect(top.start).toBe(0);
    expect(top.end).toBe(14);

    const mid = a.computeRange(900, 300);
    expect(mid.start).toBe(27);
    expect(mid.end).toBe(44);
  });

  it("clamps the end at the last row (scroll max)", () => {
    const a = makeAxis(20, 30, 2);
    const r = a.computeRange(600, 300);
    expect(r.end).toBe(20);
    expect(r.start).toBeLessThanOrEqual(20);
  });

  it("empty axis yields an empty range", () => {
    const a = makeAxis(0, 30, 4);
    const r = a.computeRange(0, 300);
    expect(r).toEqual({ start: 0, end: 0 });
  });

  it("excludes pinned indices from the window edges", () => {
    const a = makeAxis(50, 30, 0);
    const exclude = new Set([0, 1]);
    const r = a.computeRange(0, 300, exclude);
    expect(r.start).toBe(2);
  });
});

describe("Axis.itemsForRange", () => {
  it("produces correct offsets and sizes", () => {
    const a = makeAxis(10, 30);
    a.measure(1, 50);
    const items = a.itemsForRange({ start: 0, end: 4 });
    expect(items.map((i) => i.offset)).toEqual([0, 30, 80, 110]);
    expect(items.map((i) => i.size)).toEqual([30, 50, 30, 30]);
  });

  it("skips excluded indices but still advances offsets past them", () => {
    const a = makeAxis(10, 30);
    const items = a.itemsForRange({ start: 0, end: 4 }, new Set([1]));
    expect(items.map((i) => i.index)).toEqual([0, 2, 3]);
    expect(items.find((i) => i.index === 2)!.offset).toBe(60);
  });
});
