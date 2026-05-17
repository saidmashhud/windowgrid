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

export const ROW_COUNT = 1_000_000;
export const COLUMN_COUNT = 40;

const FIRST = ["Ada", "Linus", "Grace", "Alan", "Margaret", "Dennis", "Barbara", "Ken", "Radia", "Donald"];
const LAST = ["Lovelace", "Torvalds", "Hopper", "Turing", "Hamilton", "Ritchie", "Liskov", "Thompson", "Perlman", "Knuth"];
const CITY = ["Berlin", "Tokyo", "Lagos", "Lima", "Oslo", "Cairo", "Hanoi", "Quito", "Riga", "Perth"];

export interface ColumnDef {
  id: number;
  title: string;
  kind: "id" | "name" | "email" | "city" | "score" | "note";
}

export const columns: ColumnDef[] = Array.from({ length: COLUMN_COUNT }, (_, i) => {
  if (i === 0) return { id: 0, title: "#", kind: "id" };
  if (i === 1) return { id: 1, title: "Name", kind: "name" };
  if (i === 2) return { id: 2, title: "Email", kind: "email" };
  if (i === 3) return { id: 3, title: "City", kind: "city" };
  if (i % 3 === 0) return { id: i, title: `Note ${i}`, kind: "note" };
  return { id: i, title: `Score ${i}`, kind: "score" };
});

const cache = new Map<number, string[]>();
const MAX_CACHE = 5_000;

export function getRow(rowIndex: number): string[] {
  const hit = cache.get(rowIndex);
  if (hit) return hit;

  const rng = mulberry32(rowIndex * 2654435761);
  const first = FIRST[(rng() * FIRST.length) | 0]!;
  const last = LAST[(rng() * LAST.length) | 0]!;
  const city = CITY[(rng() * CITY.length) | 0]!;

  const row = columns.map((c) => {
    switch (c.kind) {
      case "id":
        return rowIndex.toLocaleString();
      case "name":
        return `${first} ${last}`;
      case "email":
        return `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
      case "city":
        return city;
      case "score":
        return ((rng() * 1000) | 0).toString();
      case "note": {
        const words = 2 + ((rng() * 22) | 0);
        return Array.from({ length: words }, () => LAST[(rng() * LAST.length) | 0]!.toLowerCase()).join(" ");
      }
    }
  });

  if (cache.size > MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(rowIndex, row);
  return row;
}
