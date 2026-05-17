import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GridEngine } from "../core/grid.js";
import type { GridOptions, Viewport } from "../core/grid.js";

export interface UseWindowgridOptions extends GridOptions {
  rafThrottle?: boolean;
}

export interface WindowgridApi {
  engine: GridEngine;
  viewport: Viewport;
  scrollRef: (node: HTMLElement | null) => void;
  measureRow: (index: number) => (node: HTMLElement | null) => void;
  totalHeight: number;
  totalWidth: number;
}

const EMPTY_VIEWPORT: Viewport = {
  rows: { range: { start: 0, end: 0 }, items: [], totalSize: 0, scrollSize: 0, offsetAdjustment: 0 },
  columns: { range: { start: 0, end: 0 }, items: [], totalSize: 0, scrollSize: 0, offsetAdjustment: 0 },
  pinnedLeft: [],
  pinnedRight: [],
  pinnedTopRows: [],
  pinnedLeftWidth: 0,
  pinnedRightWidth: 0,
  pinnedTopHeight: 0,
};

export function useWindowgrid(options: UseWindowgridOptions): WindowgridApi {
  const {
    rowCount,
    columnCount,
    estimatedRowHeight,
    estimatedColumnWidth,
    rowOverscan,
    columnOverscan,
    pinnedLeft,
    pinnedRight,
    pinnedTopRows,
    rafThrottle = true,
  } = options;

  const engine = useMemo(
    () =>
      new GridEngine({
        rowCount,
        columnCount,
        estimatedRowHeight,
        estimatedColumnWidth,
        rowOverscan,
        columnOverscan,
        pinnedLeft,
        pinnedRight,
        pinnedTopRows,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowCount, columnCount, estimatedRowHeight, estimatedColumnWidth],
  );

  const scrollElRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastScroll = useRef({ top: 0, left: 0, width: 0, height: 0 });

  const [viewport, setViewport] = useState<Viewport>(EMPTY_VIEWPORT);

  const recompute = useCallback(() => {
    const el = scrollElRef.current;
    if (!el) return;
    const top = el.scrollTop;
    const left = el.scrollLeft;
    const width = el.clientWidth;
    const height = el.clientHeight;
    lastScroll.current = { top, left, width, height };
    setViewport(engine.computeViewport(top, left, width, height));
  }, [engine]);

  const scheduleRecompute = useCallback(() => {
    if (!rafThrottle) {
      recompute();
      return;
    }
    if (frameRef.current != null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      recompute();
    });
  }, [rafThrottle, recompute]);

  const roRef = useRef<ResizeObserver | null>(null);
  const nodeToIndex = useRef<WeakMap<Element, number>>(new WeakMap());

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      let dirty = false;
      for (const entry of entries) {
        const index = nodeToIndex.current.get(entry.target);
        if (index == null) continue;
        const box = entry.borderBoxSize?.[0];
        const height = box ? box.blockSize : entry.target.getBoundingClientRect().height;
        if (engine.measureRow(index, height)) dirty = true;
      }
      if (dirty) scheduleRecompute();
    });
    roRef.current = ro;
    return () => {
      ro.disconnect();
      roRef.current = null;
    };
  }, [engine, scheduleRecompute]);

  const scrollRef = useCallback(
    (node: HTMLElement | null) => {
      const prev = scrollElRef.current;
      if (prev) prev.removeEventListener("scroll", scheduleRecompute);
      scrollElRef.current = node;
      if (node) {
        node.addEventListener("scroll", scheduleRecompute, { passive: true });
        recompute();
      }
    },
    [scheduleRecompute, recompute],
  );

  const measureRow = useCallback(
    (index: number) => (node: HTMLElement | null) => {
      const ro = roRef.current;
      if (!ro) return;
      if (node) {
        nodeToIndex.current.set(node, index);
        ro.observe(node);
        const h = node.getBoundingClientRect().height;
        if (h > 0 && engine.measureRow(index, h)) scheduleRecompute();
      }
    },
    [engine, scheduleRecompute],
  );

  return {
    engine,
    viewport,
    scrollRef,
    measureRow,
    totalHeight: viewport.rows.scrollSize,
    totalWidth: viewport.columns.scrollSize,
  };
}
