import { describe, expect, it } from "vitest";
import { heatColor, readableTextColor } from "./heat";
import { bayesian, newDishes, rankDishes, splitRankings, summarizeStalls, topDishes } from "./ratings";
import type { Dish, RankedDish, Stall } from "./types";
import { drawWheel, landingRotation, sectorAtPointer } from "./wheel";

const stall = (id: string): Stall => ({ id, name: id, slotIndex: 0, cuisine: "", intro: "" });
const dish = (id: string, stallId = "s", extra: Partial<Dish> = {}): Dish => ({
  id,
  stallId,
  name: id,
  price: 10,
  spicy: false,
  listedDaysAgo: 100,
  ...extra,
});
const ranked = (id: string, weighted: number, extra: Partial<RankedDish> = {}): RankedDish => ({
  ...dish(id),
  stallName: "s",
  isNew: false,
  rating: weighted,
  reviewCount: 3,
  weighted,
  ...extra,
});
const many = (n: number) => Array.from({ length: n }, (_, i) => ranked(`d${i}`, 5 - i * 0.1));

describe("splitRankings", () => {
  it.each([
    [0, 0, 0],
    [1, 1, 0],
    [2, 1, 1],
    [5, 3, 2],
    [6, 3, 3],
    [9, 3, 3],
    [10, 5, 5],
    [14, 5, 5],
  ])("N=%i 时推荐 %i 道、避雷 %i 道，且不重复", (n, topCount, lowCount) => {
    const { top, low } = splitRankings(many(n));
    expect(top).toHaveLength(topCount);
    expect(low).toHaveLength(lowCount);
    const lowIds = new Set(low.map((d) => d.id));
    expect(top.some((d) => lowIds.has(d.id))).toBe(false);
  });

  it("推荐榜最高分在前，避雷榜最低分在前", () => {
    const { top, low } = splitRankings(many(10));
    expect(top[0].id).toBe("d0");
    expect(low[0].id).toBe("d9");
  });

  it("按真实平均分排序，评论少的高分菜不会进评价最低榜", () => {
    const list = [
      ...Array.from({ length: 9 }, (_, i) => ranked(`d${i}`, 4.9, { rating: 4.2 + i * 0.05, reviewCount: 6 })),
      ranked("few", 3.9, { rating: 5, reviewCount: 1 }),
    ];
    const { top, low } = splitRankings(list);
    expect(top[0].id).toBe("few");
    expect(low.some((d) => d.id === "few")).toBe(false);
    expect(low[0].rating).toBe(4.2);
  });

  it("没有评论的菜不进榜", () => {
    const { top, low } = splitRankings([ranked("a", 4), ranked("b", 0, { reviewCount: 0 })]);
    expect([...top, ...low].map((d) => d.id)).toEqual(["a"]);
  });
});

describe("排序", () => {
  it("单条五星的菜排不过大量高分评论的菜", () => {
    expect(bayesian(1, 5, 3.5)).toBeLessThan(bayesian(40, 4.6, 3.5));
    const reviews = [
      { stallId: "s", dishId: "lucky", stars: 5 },
      ...Array.from({ length: 40 }, () => ({ stallId: "s", dishId: "solid", stars: 4.6 })),
      ...Array.from({ length: 20 }, () => ({ stallId: "s", dishId: "bad", stars: 2 })),
    ];
    const dishes = rankDishes([dish("lucky"), dish("solid"), dish("bad")], [stall("s")], reviews);
    expect(topDishes(dishes)[0].id).toBe("solid");
  });

  it("综合榜不收没有评论的菜，且最多 5 道", () => {
    const list = [...many(8), ranked("none", 0, { reviewCount: 0 })];
    const top = topDishes(list);
    expect(top).toHaveLength(5);
    expect(top.some((d) => d.id === "none")).toBe(false);
  });

  it("上新只收 14 天内的菜，最新的在前", () => {
    const dishes = rankDishes(
      [dish("old", "s", { listedDaysAgo: 15 }), dish("a", "s", { listedDaysAgo: 14 }), dish("b", "s", { listedDaysAgo: 1 })],
      [stall("s")],
      [],
    );
    expect(newDishes(dishes).map((d) => d.id)).toEqual(["b", "a"]);
  });
});

describe("档口评分", () => {
  it("包括评价档口整体的评论", () => {
    const [s] = summarizeStalls([stall("s")], [
      { stallId: "s", dishId: "d", stars: 5 },
      { stallId: "s", dishId: null, stars: 2 },
    ]);
    expect(s.score).toBe(3.5);
    expect(s.reviewCount).toBe(2);
  });

  it("没有评论时为 0", () => {
    expect(summarizeStalls([stall("s")], [])[0].score).toBe(0);
  });
});

describe("热力色", () => {
  it("0 分纯白，5 分最红", () => {
    expect(heatColor(0)).toBe("#FFFFFF");
    expect(heatColor(5)).toBe("#B30000");
  });

  it("越高分绿色和蓝色通道越低", () => {
    const parts = (hex: string) => [parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    for (let s = 0; s < 5; s += 0.1) {
      const [g0, b0] = parts(heatColor(s));
      const [g1, b1] = parts(heatColor(s + 0.1));
      expect(g1).toBeLessThanOrEqual(g0);
      expect(b1).toBeLessThanOrEqual(b0);
    }
  });

  it("招牌文字在深浅底色上都可读", () => {
    expect(readableTextColor(heatColor(0))).toBe("#241F1C");
    expect(readableTextColor(heatColor(5))).toBe("#FFFFFF");
  });
});

describe("转盘", () => {
  const stalls = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const pool = stalls.flatMap((s) => [
    ranked(`${s}1`, 3, { stallId: s, spicy: true }),
    ranked(`${s}2`, 3, { stallId: s, spicy: false }),
  ]);

  it("抽到的菜来自不同档口", () => {
    const drawn = drawWheel(pool, "all");
    expect(drawn).toHaveLength(6);
    expect(new Set(drawn.map((d) => d.stallId)).size).toBe(6);
  });

  it("筛选结果正确", () => {
    expect(drawWheel(pool, "spicy").every((d) => d.spicy)).toBe(true);
    expect(drawWheel(pool, "mild").every((d) => !d.spicy)).toBe(true);
  });

  it("符合条件的档口不足时返回更少的菜", () => {
    const few = [ranked("x", 3, { stallId: "a", spicy: true })];
    expect(drawWheel(few, "spicy")).toHaveLength(1);
    expect(drawWheel(few, "mild")).toHaveLength(0);
  });

  it.each([2, 3, 5, 6])("%i 个扇区时，指针总是停在中奖扇区", (sectors) => {
    for (const start of [0, 17, 359, 1234.5]) {
      for (let winner = 0; winner < sectors; winner++) {
        for (const jitter of [-1, 0, 1]) {
          const end = landingRotation(start, winner, sectors, 6, jitter);
          expect(end).toBeGreaterThan(start);
          expect(sectorAtPointer(end, sectors)).toBe(winner);
        }
      }
    }
  });
});
