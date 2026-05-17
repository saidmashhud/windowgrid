import { FenwickTree } from "../src/core/fenwick.js";

function now(): number {
  return Number(process.hrtime.bigint()) / 1e6;
}

function bench(label: string, iterations: number, fn: (i: number) => void): number {
  for (let i = 0; i < Math.min(iterations, 10_000); i++) fn(i);
  const start = now();
  for (let i = 0; i < iterations; i++) fn(i);
  const elapsed = now() - start;
  const perOp = (elapsed / iterations) * 1e6;
  console.log(
    `  ${label.padEnd(34)} ${elapsed.toFixed(2).padStart(9)} ms total   ${perOp
      .toFixed(1)
      .padStart(9)} ns/op`,
  );
  return perOp;
}

class NaiveOffsets {
  private prefix: Float64Array;
  private sizes: Float64Array;
  constructor(n: number, fill: number) {
    this.sizes = new Float64Array(n).fill(fill);
    this.prefix = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) this.prefix[i + 1] = this.prefix[i]! + fill;
  }
  offsetOf(i: number) {
    return this.prefix[i]!;
  }
  findIndex(target: number) {
    let lo = 0;
    let hi = this.prefix.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.prefix[mid + 1]! <= target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  set(i: number, v: number) {
    const delta = v - this.sizes[i]!;
    this.sizes[i] = v;
    for (let k = i + 1; k < this.prefix.length; k++) this.prefix[k]! += delta;
  }
}

function randInt(max: number): number {
  return (Math.random() * max) | 0;
}

const SIZES = [1_000, 10_000, 100_000, 1_000_000];
const QUERIES = 1_000_000;
const UPDATES = 100_000;

console.log("\nwindowgrid offset benchmark");
console.log("=".repeat(72));
console.log(`queries per size: ${QUERIES.toLocaleString()}   updates: ${UPDATES.toLocaleString()}\n`);

const results: Array<{ n: number; offsetNs: number; findNs: number; updateNs: number }> = [];

for (const n of SIZES) {
  console.log(`N = ${n.toLocaleString()} rows`);
  const tree = new FenwickTree(n, 32);
  const total = tree.total();

  const offsetNs = bench("FenwickTree.offsetOf", QUERIES, () => {
    tree.offsetOf(randInt(n));
  });
  const findNs = bench("FenwickTree.findIndex", QUERIES, () => {
    tree.findIndex(Math.random() * total);
  });
  const updateNs = bench("FenwickTree.set (point update)", UPDATES, () => {
    tree.set(randInt(n), 20 + randInt(60));
  });

  results.push({ n, offsetNs, findNs, updateNs });
  console.log("");
}

console.log("Point-update comparison: Fenwick O(log n) vs naive O(n)");
console.log("-".repeat(72));
for (const n of [10_000, 100_000, 1_000_000]) {
  const tree = new FenwickTree(n, 32);
  const naive = new NaiveOffsets(n, 32);
  const fNs = bench(`  fenwick set  (N=${n.toLocaleString()})`, 50_000, () => {
    tree.set(randInt(n), 20 + randInt(60));
  });
  const updatesForNaive = n >= 1_000_000 ? 200 : 2_000;
  const nNs = bench(`  naive set    (N=${n.toLocaleString()})`, updatesForNaive, () => {
    naive.set(randInt(n), 20 + randInt(60));
  });
  console.log(`  -> fenwick is ${(nNs / fNs).toFixed(0)}x faster on updates\n`);
}

console.log("Summary (ns/op):");
console.log("-".repeat(72));
console.log("  N            offsetOf    findIndex    set(update)");
for (const r of results) {
  console.log(
    `  ${r.n.toLocaleString().padEnd(11)} ${r.offsetNs.toFixed(1).padStart(8)}  ${r.findNs
      .toFixed(1)
      .padStart(10)}  ${r.updateNs.toFixed(1).padStart(13)}`,
  );
}
console.log(
  "\nNote how offsetOf/findIndex/set grow ~logarithmically with N (roughly +const per 10x).\n",
);
