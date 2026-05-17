import {
  createElement,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useWindowgrid, type UseWindowgridOptions } from "./useWindowgrid.js";
import type { PinnedItem, VirtualItem } from "../core/grid.js";

export interface CellContext {
  rowIndex: number;
  columnIndex: number;
  columnId: number;
  isPinnedColumn: boolean;
  isPinnedRow: boolean;
}

export interface WindowgridProps extends UseWindowgridOptions {
  children: (ctx: CellContext) => ReactNode;
  className?: string;
  style?: CSSProperties;
  cellClassName?: string;
}

const baseContainer: CSSProperties = {
  position: "relative",
  overflow: "auto",
  contain: "strict",
  willChange: "transform",
};

export function Windowgrid(props: WindowgridProps): ReactNode {
  const { children, className, style, cellClassName, ...gridOptions } = props;
  const api = useWindowgrid(gridOptions);
  const { viewport, scrollRef, measureRow, totalHeight, totalWidth } = api;

  const pinnedLeftWidth = viewport.pinnedLeftWidth;
  const pinnedRightWidth = viewport.pinnedRightWidth;
  const rowAdjustment = viewport.rows.offsetAdjustment;
  const colAdjustment = viewport.columns.offsetAdjustment;

  const cells: ReactNode[] = [];

  const renderCell = (
    row: VirtualItem,
    col: { index: number; offset: number; size: number; columnId: number },
    opts: { pinnedCol: boolean; pinnedRow: boolean; stickyLeft?: number; stickyRight?: number },
    key: string,
  ): void => {
    const top = opts.pinnedRow ? row.offset : row.offset - rowAdjustment;
    const left = col.offset - colAdjustment;
    const cellStyle: CSSProperties = {
      position: "absolute",
      top: 0,
      left: 0,
      width: col.size,
      height: row.size,
      transform: `translate(${left}px, ${top}px)`,
      boxSizing: "border-box",
    };
    if (opts.pinnedCol || opts.pinnedRow) {
      cellStyle.position = "sticky";
      cellStyle.zIndex = opts.pinnedCol && opts.pinnedRow ? 3 : 2;
      if (opts.stickyLeft != null) {
        cellStyle.left = opts.stickyLeft;
        cellStyle.transform = `translateY(${top}px)`;
      } else if (opts.stickyRight != null) {
        cellStyle.left = "auto";
        cellStyle.right = opts.stickyRight;
        cellStyle.transform = `translateY(${top}px)`;
      }
    }
    cells.push(
      createElement(
        "div",
        {
          key,
          className: cellClassName,
          style: cellStyle,
          ref: opts.pinnedRow || col.index !== viewport.columns.range.start
            ? undefined
            : measureRow(row.index),
        },
        children({
          rowIndex: row.index,
          columnIndex: col.index,
          columnId: col.columnId,
          isPinnedColumn: opts.pinnedCol,
          isPinnedRow: opts.pinnedRow,
        }),
      ),
    );
  };

  const colWithId = (item: VirtualItem) => ({
    ...item,
    columnId: api.engine.columns.logicalAt(item.index),
  });

  for (const row of viewport.rows.items) {
    for (const col of viewport.columns.items) {
      renderCell(row, colWithId(col), { pinnedCol: false, pinnedRow: false }, `c-${row.index}-${col.index}`);
    }
    for (const p of viewport.pinnedLeft) {
      renderCell(row, { ...p, columnId: p.index }, { pinnedCol: true, pinnedRow: false, stickyLeft: p.stickyOffset }, `pl-${row.index}-${p.index}`);
    }
    for (const p of viewport.pinnedRight) {
      renderCell(row, { ...p, columnId: p.index }, { pinnedCol: true, pinnedRow: false, stickyRight: p.stickyOffset }, `pr-${row.index}-${p.index}`);
    }
  }

  for (const prow of viewport.pinnedTopRows) {
    const pinnedRow: PinnedItem = { ...prow, offset: prow.stickyOffset };
    for (const col of viewport.columns.items) {
      renderCell(pinnedRow, colWithId(col), { pinnedCol: false, pinnedRow: true }, `tr-${prow.index}-${col.index}`);
    }
    for (const p of viewport.pinnedLeft) {
      renderCell(pinnedRow, { ...p, columnId: p.index }, { pinnedCol: true, pinnedRow: true, stickyLeft: p.stickyOffset }, `tpl-${prow.index}-${p.index}`);
    }
    for (const p of viewport.pinnedRight) {
      renderCell(pinnedRow, { ...p, columnId: p.index }, { pinnedCol: true, pinnedRow: true, stickyRight: p.stickyOffset }, `tpr-${prow.index}-${p.index}`);
    }
  }

  return createElement(
    "div",
    { ref: scrollRef, className, style: { ...baseContainer, ...style } },
    createElement("div", {
      style: {
        position: "relative",
        height: Math.max(totalHeight, 1),
        width: Math.max(totalWidth, 1),
        minWidth: pinnedLeftWidth + pinnedRightWidth,
      },
    }, ...cells),
  );
}
