import { describe, it, expect } from "vitest";
import { FenwickTree } from "./fenwick.js";

class Oracle {
  sizes: number[];
  constructor(n: number, fill = 0) {
    this.sizes = new Array(n).fill(fill);
  }
  add(i: number, d: number) {
    this.sizes[i]! += d;
  }
  set(i: number, v: number) {
    this.sizes[i] = v;
  }
  prefixSum(count: number) {
    let s = 0;
    for (let i = 0; i < Math.min(count, this.sizes.length); i++) s += this.sizes[i]!;
    return s;
  }
  total() {
    return this.prefixSum(this.sizes.length);
  }
  findIndex(target: number) {
    const n = this.sizes.length;
    if (n === 0) return 0;
    if (target <= 0) return 0;
    let best = 0;
    for (let i = 0; i <= n; i++) {
      if (this.prefixSum(i) <= target) best = i;
      else break;
    }
    return best >= n ? n - 1 : best;
  }
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("FenwickTree basic invariants", () => {
  it("prefixSum(0) is 0 and prefixSum(length) is total", () => {
    const t = new FenwickTree(5, 10);
    expect(t.prefixSum(0)).toBe(0);
    expect(t.prefixSum(5)).toBe(50);
    expect(t.total()).toBe(50);
  });

  it("offsetOf returns the leading edge of an index", () => {
    const t = new FenwickTree(4, 20);
    expect(t.offsetOf(0)).toBe(0);
    expect(t.offsetOf(1)).toBe(20);
    expect(t.offsetOf(3)).toBe(60);
  });

  it("set and add update downstream offsets", () => {
    const t = new FenwickTree(4, 10);
    t.set(1, 100);
    expect(t.offsetOf(2)).toBe(110);
    expect(t.total()).toBe(130);
    t.add(0, 5);
    expect(t.offsetOf(1)).toBe(15);
    expect(t.total()).toBe(135);
  });

  it("handles fractional sizes", () => {
    const t = new FenwickTree(3, 0);
    t.set(0, 1.5);
    t.set(1, 2.25);
    t.set(2, 0.25);
    expect(t.total()).toBeCloseTo(4.0, 10);
    expect(t.offsetOf(2)).toBeCloseTo(3.75, 10);
  });

  it("rejects out-of-range indices and bad lengths", () => {
    const t = new FenwickTree(3, 1);
    expect(() => t.set(3, 1)).toThrow(RangeError);
    expect(() => t.set(-1, 1)).toThrow(RangeError);
    expect(() => new FenwickTree(-1)).toThrow(RangeError);
    expect(() => new FenwickTree(2.5)).toThrow(RangeError);
  });

  it("empty tree is well-behaved", () => {
    const t = new FenwickTree(0, 10);
    expect(t.total()).toBe(0);
    expect(t.findIndex(50)).toBe(0);
  });
});

describe("FenwickTree.findIndex (index at offset)", () => {
  it("uses half-open [offset, offset+size) semantics at boundaries", () => {
    const t = new FenwickTree(3, 10);
    expect(t.findIndex(0)).toBe(0);
    expect(t.findIndex(9.99)).toBe(0);
    expect(t.findIndex(10)).toBe(1);
    expect(t.findIndex(19)).toBe(1);
    expect(t.findIndex(20)).toBe(2);
    expect(t.findIndex(29)).toBe(2);
  });

  it("clamps below zero to first and beyond content to last", () => {
    const t = new FenwickTree(3, 10);
    expect(t.findIndex(-100)).toBe(0);
    expect(t.findIndex(10_000)).toBe(2);
  });

  it("handles zero-height rows by skipping over them", () => {
    const t = new FenwickTree(4, 10);
    t.set(1, 0);
    t.set(2, 0);
    expect(t.findIndex(5)).toBe(0);
    expect(t.findIndex(10)).toBe(3);
  });
});

describe("FenwickTree vs brute-force oracle (randomized)", () => {
  it("agrees on prefixSum, total, and findIndex across random updates", () => {
    const rng = mulberry32(0xc0ffee);
    for (let trial = 0; trial < 40; trial++) {
      const n = 1 + Math.floor(rng() * 200);
      const fill = Math.floor(rng() * 50);
      const tree = new FenwickTree(n, fill);
      const oracle = new Oracle(n, fill);

      const ops = 200;
      for (let k = 0; k < ops; k++) {
        const i = Math.floor(rng() * n);
        if (rng() < 0.5) {
          const v = Math.floor(rng() * 120);
          tree.set(i, v);
          oracle.set(i, v);
        } else {
          const cur = oracle.sizes[i]!;
          const d = Math.max(-cur, Math.floor(rng() * 40) - 10);
          tree.add(i, d);
          oracle.add(i, d);
        }
      }

      for (let c = 0; c <= n; c++) {
        expect(tree.prefixSum(c)).toBeCloseTo(oracle.prefixSum(c), 6);
      }
      expect(tree.total()).toBeCloseTo(oracle.total(), 6);

      const total = oracle.total();
      for (let p = 0; p < 80; p++) {
        const target = rng() * (total + 40) - 20;
        expect(tree.findIndex(target)).toBe(oracle.findIndex(target));
      }
      let acc = 0;
      for (let i = 0; i < n; i++) {
        acc = oracle.prefixSum(i);
        expect(tree.findIndex(acc)).toBe(oracle.findIndex(acc));
      }
    }
  });

  it("scales to a large tree with sparse updates (smoke)", () => {
    const n = 1_000_000;
    const t = new FenwickTree(n, 32);
    expect(t.total()).toBe(n * 32);
    t.set(500_000, 1000);
    expect(t.offsetOf(500_001)).toBe(500_000 * 32 + 1000);
    expect(t.findIndex(t.total() + 5)).toBe(n - 1);
  });
});
