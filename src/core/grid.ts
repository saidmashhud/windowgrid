import { Axis } from "./axis.js";
import { ColumnModel } from "./columns.js";
import type { PinnedItem, Viewport, VirtualItem } from "./types.js";

export interface GridOptions {
  rowCount: number;
  columnCount: number;
  estimatedRowHeight: number;
  estimatedColumnWidth: number;
  rowOverscan?: number;
  columnOverscan?: number;
  pinnedLeft?: number[];
  pinnedRight?: number[];
  pinnedTopRows?: number[];
}

export class GridEngine {
  readonly rows: Axis;
  readonly columns: ColumnModel;
  private pinnedTopRows: number[];

  constructor(options: GridOptions) {
    this.rows = new Axis({
      count: options.rowCount,
      estimatedSize: options.estimatedRowHeight,
      overscan: options.rowOverscan ?? 4,
    });
    this.columns = new ColumnModel(
      {
        count: options.columnCount,
        estimatedSize: options.estimatedColumnWidth,
        overscan: options.columnOverscan ?? 2,
      },
      { left: options.pinnedLeft ?? [], right: options.pinnedRight ?? [] },
    );
    this.pinnedTopRows = [...(options.pinnedTopRows ?? [])].sort((a, b) => a - b);
  }

  get rowCount(): number {
    return this.rows.count;
  }

  get columnCount(): number {
    return this.columns.count;
  }

  measureRow(index: number, height: number): boolean {
    return this.rows.measure(index, height);
  }

  getTotalHeight(): number {
    return this.rows.getTotalSize();
  }

  getTotalWidth(): number {
    return this.columns.axis.getTotalSize();
  }

  setPinnedTopRows(indices: number[]): void {
    this.pinnedTopRows = [...indices].sort((a, b) => a - b);
  }

  computeViewport(
    scrollTop: number,
    scrollLeft: number,
    viewportWidth: number,
    viewportHeight: number,
  ): Viewport {
    const pinnedRowSet = new Set(this.pinnedTopRows);
    const pinnedColVisual = this.columns.pinnedVisualSet();

    const rowMap = this.rows.mapScroll(scrollTop, viewportHeight);
    const colMap = this.columns.axis.mapScroll(scrollLeft, viewportWidth);

    const rowRange = this.rows.computeRange(rowMap.offset, viewportHeight, pinnedRowSet);
    const rowItems = this.rows.itemsForRange(rowRange, pinnedRowSet);

    const colRange = this.columns.axis.computeRange(colMap.offset, viewportWidth, pinnedColVisual);
    const colItems = this.columns.axis.itemsForRange(colRange, pinnedColVisual);

    const { items: pinnedLeft, total: pinnedLeftWidth } = this.buildPinned(
      this.columns.getLeftPinned(),
      "leading",
    );
    const { items: pinnedRight, total: pinnedRightWidth } = this.buildPinned(
      this.columns.getRightPinned().slice().reverse(),
      "trailing",
    );
    pinnedRight.reverse();

    const pinnedTopRows: PinnedItem[] = [];
    let topAcc = 0;
    for (const rowIndex of this.pinnedTopRows) {
      const size = this.rows.getSize(rowIndex);
      pinnedTopRows.push({
        index: rowIndex,
        offset: this.rows.getOffset(rowIndex),
        size,
        side: "leading",
        stickyOffset: topAcc,
      });
      topAcc += size;
    }

    return {
      rows: {
        range: rowRange,
        items: rowItems,
        totalSize: this.rows.getTotalSize(),
        scrollSize: rowMap.scrollSize,
        offsetAdjustment: rowMap.adjustment,
      },
      columns: {
        range: colRange,
        items: colItems,
        totalSize: this.columns.axis.getTotalSize(),
        scrollSize: colMap.scrollSize,
        offsetAdjustment: colMap.adjustment,
      },
      pinnedLeft,
      pinnedRight,
      pinnedTopRows,
      pinnedLeftWidth,
      pinnedRightWidth,
      pinnedTopHeight: topAcc,
    };
  }

  private buildPinned(
    logicalIds: number[],
    side: "leading" | "trailing",
  ): { items: PinnedItem[]; total: number } {
    const items: PinnedItem[] = [];
    let acc = 0;
    for (const logical of logicalIds) {
      const visual = this.columns.visualOf(logical);
      const size = this.columns.axis.getSize(visual);
      items.push({
        index: logical,
        offset: this.columns.axis.getOffset(visual),
        size,
        side,
        stickyOffset: acc,
      });
      acc += size;
    }
    return { items, total: acc };
  }
}

export type { Viewport, VirtualItem, PinnedItem };
