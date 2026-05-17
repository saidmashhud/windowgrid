export class FenwickTree {
  private readonly n: number;
  private readonly tree: Float64Array;
  private readonly sizes: Float64Array;
  private readonly logN: number;

  constructor(length: number, fill = 0) {
    if (length < 0 || !Number.isInteger(length)) {
      throw new RangeError(`FenwickTree length must be a non-negative integer, got ${length}`);
    }
    this.n = length;
    this.tree = new Float64Array(length + 1);
    this.sizes = new Float64Array(length);

    let lp = 1;
    while (lp << 1 <= length) lp <<= 1;
    this.logN = lp;

    if (fill !== 0 && length > 0) {
      this.sizes.fill(fill);
      for (let i = 1; i <= length; i++) {
        this.tree[i]! += fill;
        const parent = i + (i & -i);
        if (parent <= length) this.tree[parent]! += this.tree[i]!;
      }
    }
  }

  get length(): number {
    return this.n;
  }

  getSize(index: number): number {
    this.assertIndex(index);
    return this.sizes[index]!;
  }

  add(index: number, delta: number): void {
    this.assertIndex(index);
    if (delta === 0) return;
    this.sizes[index]! += delta;
    for (let i = index + 1; i <= this.n; i += i & -i) {
      this.tree[i]! += delta;
    }
  }

  set(index: number, value: number): void {
    this.assertIndex(index);
    this.add(index, value - this.sizes[index]!);
  }

  prefixSum(count: number): number {
    if (count <= 0) return 0;
    const c = count > this.n ? this.n : count;
    let sum = 0;
    for (let i = c; i > 0; i -= i & -i) {
      sum += this.tree[i]!;
    }
    return sum;
  }

  offsetOf(index: number): number {
    return this.prefixSum(index);
  }

  total(): number {
    return this.prefixSum(this.n);
  }

  findIndex(target: number): number {
    if (this.n === 0) return 0;
    if (target <= 0) return 0;

    let pos = 0;
    let remaining = target;

    for (let step = this.logN; step > 0; step >>= 1) {
      const next = pos + step;
      if (next <= this.n && this.tree[next]! <= remaining) {
        pos = next;
        remaining -= this.tree[pos]!;
      }
    }

    return pos >= this.n ? this.n - 1 : pos;
  }

  private assertIndex(index: number): void {
    if (index < 0 || index >= this.n || !Number.isInteger(index)) {
      throw new RangeError(`index ${index} out of range [0, ${this.n})`);
    }
  }
}
