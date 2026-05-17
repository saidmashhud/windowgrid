import { useEffect, useRef, useState, useCallback } from "react";
import { useWindowgrid } from "windowgrid/react";
import { columns, getRow, ROW_COUNT, COLUMN_COUNT } from "./data.js";

const HEADER_HEIGHT = 40;
const PINNED_LEFT = [0, 1];

export function App() {
  const api = useWindowgrid({
    rowCount: ROW_COUNT,
    columnCount: COLUMN_COUNT,
    estimatedRowHeight: 34,
    estimatedColumnWidth: 160,
    rowOverscan: 6,
    columnOverscan: 2,
    pinnedLeft: PINNED_LEFT,
  });
  const { engine, viewport, scrollRef, measureRow, totalHeight, totalWidth } = api;

  const [, bump] = useState(0);
  const forceUpdate = useCallback(() => bump((n) => n + 1), []);

  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollElRef = useRef<HTMLDivElement | null>(null);
  const attachScroll = useCallback(
    (node: HTMLDivElement | null) => {
      scrollElRef.current = node;
      (scrollRef as (n: HTMLElement | null) => void)(node);
      if (node) node.addEventListener("scroll", () => setScrollLeft(node.scrollLeft), { passive: true });
    },
    [scrollRef],
  );

  const [fps, setFps] = useState(0);
  const fpsRef = useRef({ frames: 0, last: performance.now() });
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const s = fpsRef.current;
      s.frames++;
      const now = performance.now();
      if (now - s.last >= 500) {
        setFps(Math.round((s.frames * 1000) / (now - s.last)));
        s.frames = 0;
        s.last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const renderedCells =
    (viewport.rows.items.length) *
      (viewport.columns.items.length + viewport.pinnedLeft.length) || 0;

  const dragVisual = useRef<number | null>(null);
  const onHeaderDragStart = (visual: number) => () => {
    dragVisual.current = visual;
  };
  const onHeaderDrop = (toVisual: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragVisual.current;
    if (from != null && from !== toVisual) {
      engine.columns.reorder(from, toVisual);
      forceUpdate();
    }
    dragVisual.current = null;
  };

  const pinnedLeftWidth = viewport.pinnedLeftWidth;

  const headerScroll = viewport.columns.items.map((c) => {
    const logical = engine.columns.logicalAt(c.index);
    return (
      <div
        key={`h-${c.index}`}
        className="cell header"
        draggable
        onDragStart={onHeaderDragStart(c.index)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onHeaderDrop(c.index)}
        style={{ transform: `translateX(${c.offset - pinnedLeftWidth}px)`, width: c.size }}
      >
        {columns[logical]!.title}
        <span className="grip">⋮⋮</span>
      </div>
    );
  });

  const headerPinned = viewport.pinnedLeft.map((p) => (
    <div
      key={`hp-${p.index}`}
      className="cell header pinned"
      style={{ left: p.stickyOffset, width: p.size, zIndex: 6 }}
    >
      {columns[p.index]!.title}
    </div>
  ));

  const body: React.ReactNode[] = [];
  for (const row of viewport.rows.items) {
    const data = getRow(row.index);
    const cells: React.ReactNode[] = [];
    for (const p of viewport.pinnedLeft) {
      cells.push(
        <div
          key={`bp-${p.index}`}
          className="cell pinned"
          style={{ left: p.stickyOffset, width: p.size, flex: `0 0 ${p.size}px`, zIndex: 4 }}
        >
          {data[p.index]}
        </div>,
      );
    }
    const firstCol = viewport.columns.items[0];
    if (firstCol) {
      const gap = firstCol.offset - pinnedLeftWidth;
      if (gap > 0) {
        cells.push(<div key="gap" className="spacer" style={{ flex: `0 0 ${gap}px` }} />);
      }
    }
    for (const col of viewport.columns.items) {
      const logical = engine.columns.logicalAt(col.index);
      cells.push(
        <div
          key={`b-${col.index}`}
          className="cell"
          style={{ width: col.size, flex: `0 0 ${col.size}px` }}
        >
          {data[logical]}
        </div>,
      );
    }
    body.push(
      <div
        key={`row-${row.index}`}
        className="row"
        ref={measureRow(row.index)}
        style={{ top: row.offset - viewport.rows.offsetAdjustment, minWidth: totalWidth }}
      >
        {cells}
      </div>,
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>windowgrid</h1>
        <div className="stats">
          <Stat label="rows" value={ROW_COUNT.toLocaleString()} />
          <Stat label="columns" value={COLUMN_COUNT.toString()} />
          <Stat label="rendered DOM cells" value={(renderedCells + headerScroll.length + headerPinned.length).toString()} highlight />
          <Stat label="FPS" value={fps.toString()} highlight />
          <Stat label="content height" value={`${Math.round(viewport.rows.totalSize).toLocaleString()} px`} />
        </div>
        <p className="hint">Drag column headers to reorder. The first two columns are frozen. Only the visible window is in the DOM.</p>
      </header>

      <div className="grid-frame">
        <div className="header-row" style={{ height: HEADER_HEIGHT }}>
          {headerPinned}
          <div className="header-track" style={{ transform: `translateX(${-scrollLeft}px)`, left: pinnedLeftWidth }}>
            {headerScroll}
          </div>
        </div>

        <div className="scroll" ref={attachScroll} style={{ top: HEADER_HEIGHT }}>
          <div
            className="content"
            style={{
              height: Math.max(totalHeight, 1),
              width: Math.max(totalWidth, 1),
              minWidth: pinnedLeftWidth,
            }}
          >
            {body}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`stat ${highlight ? "hl" : ""}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
