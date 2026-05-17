import { describe, it, expect } from "vitest";
import { Axis } from "./axis.js";
import { GridEngine } from "./grid.js";

describe("scroll scaling past the browser max element height", () => {
  const big = 1_000_000;
  const rowH = 34;
  const viewport = 700;

  it("caps scrollSize at MAX_SCROLL_SIZE when content overflows", () => {
    const a = new Axis({ count: big, estimatedSize: rowH, overscan: 0 });
    expect(a.getTotalSize()).toBeGreaterThan(Axis.MAX_SCROLL_SIZE);
    expect(a.getScrollSize()).toBe(Axis.MAX_SCROLL_SIZE);
  });

  it("maps the physical bottom to the virtual bottom so the last rows are reachable", () => {
    const a = new Axis({ count: big, estimatedSize: rowH, overscan: 0 });
    const m = a.mapScroll(a.getScrollSize() - viewport, viewport);
    expect(m.offset).toBeCloseTo(a.getTotalSize() - viewport, 0);
    expect(a.indexAt(m.offset + viewport - 1)).toBeGreaterThanOrEqual(big - 2);
  });

  it("computeViewport at the bottom includes the final row", () => {
    const g = new GridEngine({
      rowCount: big,
      columnCount: 5,
      estimatedRowHeight: rowH,
      estimatedColumnWidth: 100,
      rowOverscan: 2,
    });
    const scrollSize = g.rows.getScrollSize();
    const vp = g.computeViewport(scrollSize - viewport, 0, 500, viewport);
    const indices = vp.rows.items.map((i) => i.index);
    expect(Math.max(...indices)).toBe(big - 1);
    expect(vp.rows.scrollSize).toBe(Axis.MAX_SCROLL_SIZE);
  });

  it("keeps the mapping monotonic with clean endpoints", () => {
    const a = new Axis({ count: big, estimatedSize: rowH, overscan: 0 });
    const top = a.mapScroll(0, viewport);
    expect(top.offset).toBe(0);
    expect(top.adjustment).toBe(0);
    let prev = -1;
    for (let s = 0; s <= a.getScrollSize() - viewport; s += 500_000) {
      const o = a.mapScroll(s, viewport).offset;
      expect(o).toBeGreaterThanOrEqual(prev);
      prev = o;
    }
  });

  it("does not scale when content fits under the cap", () => {
    const a = new Axis({ count: 100, estimatedSize: 30, overscan: 0 });
    const m = a.mapScroll(50, 300);
    expect(m.adjustment).toBe(0);
    expect(m.offset).toBe(50);
    expect(m.scrollSize).toBe(a.getTotalSize());
  });
});
