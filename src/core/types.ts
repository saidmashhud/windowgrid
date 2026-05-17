export interface Range {
  start: number;
  end: number;
}

export interface VirtualItem {
  index: number;
  offset: number;
  size: number;
}

export interface PinnedItem extends VirtualItem {
  side: "leading" | "trailing";
  stickyOffset: number;
}

export interface AxisConfig {
  count: number;
  estimatedSize: number;
  overscan: number;
}

export interface ColumnPinConfig {
  left: number[];
  right: number[];
}

export interface AxisViewport {
  range: Range;
  items: VirtualItem[];
  totalSize: number;
  scrollSize: number;
  offsetAdjustment: number;
}

export interface Viewport {
  rows: AxisViewport;
  columns: AxisViewport;
  pinnedLeft: PinnedItem[];
  pinnedRight: PinnedItem[];
  pinnedTopRows: PinnedItem[];
  pinnedLeftWidth: number;
  pinnedRightWidth: number;
  pinnedTopHeight: number;
}
