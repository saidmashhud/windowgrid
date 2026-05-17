import { describe, it, expect } from "vitest";
import { GridEngine } from "./grid.js";

const baseOptions = {
  rowCount: 1000,
  columnCount: 50,
  estimatedRowHeight: 30,
  estimatedColumnWidth: 100,
  rowOverscan: 2,
  columnOverscan: 1,
};

describe("GridEngine.computeViewport", () => {
  it("reports correct total content size", () => {
    const g = new GridEngine(baseOptions);
    expect(g.getTotalHeight()).toBe(1000 * 30);
    expect(g.getTotalWidth()).toBe(50 * 100);
  });

  it("returns the top-left window at scroll 0", () => {
    const g = new GridEngine(baseOptions);
    const vp = g.computeViewport(0, 0, 800, 600);
    expect(vp.rows.range.start).toBe(0);
    expect(vp.rows.range.end).toBe(23);
    expect(vp.columns.range.start).toBe(0);
    expect(vp.columns.range.end).toBe(10);
    expect(vp.rows.items[0]!.offset).toBe(0);
    expect(vp.rows.totalSize).toBe(30000);
  });

  it("windows correctly mid-scroll", () => {
    const g = new GridEngine(baseOptions);
    const vp = g.computeViewport(3000, 1500, 800, 600);
    expect(vp.rows.range.start).toBe(98);
    expect(vp.columns.range.start).toBe(14);
    expect(vp.rows.items[0]!.offset).toBe(98 * 30);
  });

  it("clamps to the last row/col at max scroll", () => {
    const g = new GridEngine(baseOptions);
    const vp = g.computeViewport(g.getTotalHeight(), g.getTotalWidth(), 800, 600);
    expect(vp.rows.range.end).toBe(1000);
    expect(vp.columns.range.end).toBe(50);
  });

  it("re-measuring a row shifts subsequent item offsets in the viewport", () => {
    const g = new GridEngine(baseOptions);
    g.measureRow(0, 200);
    const vp = g.computeViewport(0, 0, 800, 600);
    const row1 = vp.rows.items.find((r) => r.index === 1)!;
    expect(row1.offset).toBe(200);
    expect(g.getTotalHeight()).toBe(200 + 999 * 30);
  });

  it("number of rendered cells stays bounded regardless of total rows", () => {
    const small = new GridEngine({ ...baseOptions, rowCount: 1000 });
    const huge = new GridEngine({ ...baseOptions, rowCount: 1_000_000 });
    const a = small.computeViewport(15_000, 0, 800, 600);
    const b = huge.computeViewport(15_000, 0, 800, 600);
    expect(a.rows.items.length).toBe(b.rows.items.length);
    expect(b.rows.items.length).toBeLessThan(40);
  });
});

describe("GridEngine pinned columns", () => {
  it("excludes pinned columns from the virtual window", () => {
    const g = new GridEngine({ ...baseOptions, pinnedLeft: [0, 1], pinnedRight: [49] });
    const vp = g.computeViewport(0, 0, 800, 600);
    const virtualIndices = vp.columns.items.map((c) => c.index);
    expect(virtualIndices).not.toContain(0);
    expect(virtualIndices).not.toContain(1);
    expect(virtualIndices).not.toContain(49);
  });

  it("computes left-pinned sticky offsets cumulatively from the edge", () => {
    const g = new GridEngine({ ...baseOptions, pinnedLeft: [0, 1] });
    g.columns.resize(0, 120);
    g.columns.resize(1, 80);
    const vp = g.computeViewport(0, 0, 800, 600);
    expect(vp.pinnedLeft.map((p) => p.index)).toEqual([0, 1]);
    expect(vp.pinnedLeft[0]!.stickyOffset).toBe(0);
    expect(vp.pinnedLeft[1]!.stickyOffset).toBe(120);
    expect(vp.pinnedLeftWidth).toBe(200);
  });

  it("computes right-pinned sticky offsets accumulating from the right edge", () => {
    const g = new GridEngine({ ...baseOptions, pinnedRight: [48, 49] });
    g.columns.resize(48, 90);
    g.columns.resize(49, 110);
    const vp = g.computeViewport(0, 0, 800, 600);
    const p49 = vp.pinnedRight.find((p) => p.index === 49)!;
    const p48 = vp.pinnedRight.find((p) => p.index === 48)!;
    expect(p49.stickyOffset).toBe(0);
    expect(p48.stickyOffset).toBe(110);
    expect(vp.pinnedRightWidth).toBe(200);
  });

  it("pinned columns follow their logical id after a reorder", () => {
    const g = new GridEngine({ ...baseOptions, pinnedLeft: [0] });
    g.columns.resize(0, 150);
    g.columns.reorder(0, 10);
    const vp = g.computeViewport(0, 0, 800, 600);
    expect(vp.pinnedLeft[0]!.index).toBe(0);
    expect(vp.pinnedLeft[0]!.size).toBe(150);
    expect(vp.columns.items.map((c) => c.index)).not.toContain(g.columns.visualOf(0));
  });
});

describe("GridEngine pinned rows", () => {
  it("excludes pinned rows from the window and stacks them at the top", () => {
    const g = new GridEngine({ ...baseOptions, pinnedTopRows: [0, 1] });
    g.measureRow(0, 40);
    g.measureRow(1, 60);
    const vp = g.computeViewport(0, 0, 800, 600);
    expect(vp.rows.items.map((r) => r.index)).not.toContain(0);
    expect(vp.pinnedTopRows.map((r) => r.index)).toEqual([0, 1]);
    expect(vp.pinnedTopRows[0]!.stickyOffset).toBe(0);
    expect(vp.pinnedTopRows[1]!.stickyOffset).toBe(40);
    expect(vp.pinnedTopHeight).toBe(100);
  });
});
