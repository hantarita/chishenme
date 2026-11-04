import type { RankedDish, SpicyFilter } from "./types";

export const WHEEL_SIZE = 6;
export const WHEEL_MIN = 2;

type Rng = () => number;

function shuffled<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 每个档口最多抽一道。符合条件的档口不足 WHEEL_SIZE 时，返回的菜会变少 */
export function drawWheel(dishes: RankedDish[], filter: SpicyFilter, rng: Rng = Math.random, size = WHEEL_SIZE): RankedDish[] {
  const eligible = dishes.filter((d) => filter === "all" || d.spicy === (filter === "spicy"));
  const byStall = new Map<string, RankedDish[]>();
  for (const d of eligible) byStall.set(d.stallId, [...(byStall.get(d.stallId) ?? []), d]);

  return shuffled([...byStall.values()], rng)
    .slice(0, size)
    .map((group) => group[Math.floor(rng() * group.length)]);
}

export function sectorAtPointer(rotation: number, sectors: number): number {
  const step = 360 / sectors;
  const angle = ((-rotation % 360) + 360) % 360;
  return Math.floor(angle / step) % sectors;
}

/**
 * 算出转盘要停的角度，让指针（正上方）落在 winner 扇区。
 * jitter 取 -1 到 1，让每次停的位置略有不同，但不会压到扇区边线。
 */
export function landingRotation(current: number, winner: number, sectors: number, turns = 6, jitter = 0): number {
  const step = 360 / sectors;
  const sectorCenter = (winner + 0.5) * step + jitter * step * 0.35;
  const target = (360 - sectorCenter + 360) % 360;
  const delta = (target - (current % 360) + 360) % 360;
  return current + turns * 360 + delta;
}
