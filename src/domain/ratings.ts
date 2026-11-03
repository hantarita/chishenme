import type { Dish, RankedDish, Stall, StallSummary } from "./types";

export const BAYES_M = 5;
export const NEW_DISH_DAYS = 14;
export const NEW_DISH_LIMIT = 6;

interface Rated {
  stallId: string;
  dishId: string | null;
  stars: number;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

export function bayesian(count: number, rating: number, globalMean: number, m = BAYES_M): number {
  return (count * rating + m * globalMean) / (count + m);
}

export function summarizeStalls(stalls: Stall[], reviews: Rated[]): StallSummary[] {
  return stalls.map((stall) => {
    const stars = reviews.filter((r) => r.stallId === stall.id).map((r) => r.stars);
    return { ...stall, score: roundScore(mean(stars)), reviewCount: stars.length };
  });
}

export function rankDishes(dishes: Dish[], stalls: Stall[], reviews: Rated[]): RankedDish[] {
  const stallNames = new Map(stalls.map((s) => [s.id, s.name]));
  const byDish = new Map<string, number[]>();
  for (const r of reviews) {
    if (r.dishId === null) continue;
    byDish.set(r.dishId, [...(byDish.get(r.dishId) ?? []), r.stars]);
  }
  const globalMean = mean([...byDish.values()].flat());

  return dishes.map((dish) => {
    const stars = byDish.get(dish.id) ?? [];
    const rating = mean(stars);
    return {
      ...dish,
      stallName: stallNames.get(dish.stallId) ?? "",
      isNew: dish.listedDaysAgo <= NEW_DISH_DAYS,
      rating: roundScore(rating),
      reviewCount: stars.length,
      weighted: stars.length > 0 ? bayesian(stars.length, rating, globalMean) : 0,
    };
  });
}

function byWeightedDesc(a: RankedDish, b: RankedDish): number {
  return b.weighted - a.weighted || b.reviewCount - a.reviewCount || a.id.localeCompare(b.id);
}

export function topDishes(dishes: RankedDish[], limit = 5): RankedDish[] {
  return dishes
    .filter((d) => d.reviewCount > 0)
    .sort(byWeightedDesc)
    .slice(0, limit);
}

export function newDishes(dishes: RankedDish[], limit = NEW_DISH_LIMIT): RankedDish[] {
  return dishes
    .filter((d) => d.isNew)
    .sort((a, b) => a.listedDaysAgo - b.listedDaysAgo || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function byRatingDesc(a: RankedDish, b: RankedDish): number {
  return b.rating - a.rating || b.reviewCount - a.reviewCount || a.id.localeCompare(b.id);
}

/**
 * 见 SPEC §4.3。只统计有评论的菜，同一道菜不会同时上两个榜。
 * 这里按真实平均分排序：贝叶斯会把评论少的高分菜拉低，导致 5.0 分的菜出现在“评价最低”里。
 */
export function splitRankings(dishes: RankedDish[]): { top: RankedDish[]; low: RankedDish[] } {
  const rated = dishes.filter((d) => d.reviewCount > 0).sort(byRatingDesc);
  const n = rated.length;
  const topCount = n >= 10 ? 5 : n >= 6 ? 3 : Math.min(3, Math.ceil(n / 2));
  const lowCount = n >= 10 ? 5 : n >= 6 ? 3 : n - topCount;
  return {
    top: rated.slice(0, topCount),
    low: rated.slice(n - lowCount).reverse(),
  };
}
