import { createReviewStorage, type ReviewStorage } from "../data/storage";
import dishesJson from "../data/seed/dishes.json";
import reviewsJson from "../data/seed/reviews.json";
import stallsJson from "../data/seed/stalls.json";
import { newDishes, rankDishes, REVIEW_TEXT_MAX, REVIEW_TEXT_MIN, splitRankings, summarizeStalls, topDishes } from "../domain/ratings";
import type { Dish, LocalReview, Review, SeedReview, Stall } from "../domain/types";
import { drawWheel } from "../domain/wheel";
import type { CanteenApi } from "./client";

const DAY_MS = 24 * 60 * 60 * 1000;

interface Options {
  storage?: ReviewStorage;
  latencyMs?: number;
  now?: () => number;
  rng?: () => number;
}

export function createMockServer({
  storage = createReviewStorage(),
  latencyMs = 80,
  now = Date.now,
  rng = Math.random,
}: Options = {}): CanteenApi {
  const stalls = stallsJson as Stall[];
  const dishes = dishesJson as Dish[];
  const seedReviews = reviewsJson as SeedReview[];

  const respond = async <T,>(produce: () => T): Promise<T> => {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
    return produce();
  };

  const allReviews = (): Review[] => {
    const dishNames = new Map(dishes.map((d) => [d.id, d.name]));
    const nameOf = (id: string | null) => (id ? (dishNames.get(id) ?? null) : null);
    const seed = seedReviews.map(({ createdDaysAgo, ...r }) => ({
      ...r,
      dishName: nameOf(r.dishId),
      createdAt: new Date(now() - createdDaysAgo * DAY_MS).toISOString(),
      isLocal: false,
    }));
    const local = storage.load().map((r) => ({ ...r, dishName: nameOf(r.dishId), isLocal: true }));
    return [...local, ...seed];
  };

  const ranked = () => rankDishes(dishes, stalls, allReviews());

  return {
    getStalls: () => respond(() => summarizeStalls(stalls, allReviews())),

    getStall: (id) =>
      respond(() => {
        const summary = summarizeStalls(stalls, allReviews()).find((s) => s.id === id);
        if (!summary) throw new Error(`档口不存在：${id}`);
        const stallDishes = ranked().filter((d) => d.stallId === id);
        return { ...summary, ...splitRankings(stallDishes), dishes: stallDishes };
      }),

    getReviews: (stallId) =>
      respond(() =>
        allReviews()
          .filter((r) => r.stallId === stallId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),

    createReview: (input) =>
      respond(() => {
        const text = input.text.trim();
        if (!stalls.some((s) => s.id === input.stallId)) throw new Error("档口不存在");
        if (input.dishId && !dishes.some((d) => d.id === input.dishId && d.stallId === input.stallId)) {
          throw new Error("这道菜不属于该档口");
        }
        if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) throw new Error("请打 1 到 5 星");
        if (text.length < REVIEW_TEXT_MIN || text.length > REVIEW_TEXT_MAX) {
          throw new Error(`评论需要 ${REVIEW_TEXT_MIN} 到 ${REVIEW_TEXT_MAX} 个字`);
        }

        const review: LocalReview = {
          id: `local-${now()}-${Math.floor(rng() * 1e6)}`,
          stallId: input.stallId,
          dishId: input.dishId,
          author: input.author.trim() || "匿名同学",
          stars: input.stars,
          text,
          createdAt: new Date(now()).toISOString(),
        };
        storage.save([review, ...storage.load()]);
        return allReviews().find((r) => r.id === review.id)!;
      }),

    deleteReview: (id) =>
      respond(() => {
        const local = storage.load();
        if (!local.some((r) => r.id === id)) throw new Error("只能删除自己写的评论");
        storage.save(local.filter((r) => r.id !== id));
      }),

    getNewDishes: () => respond(() => newDishes(ranked())),
    getTopDishes: (limit = 5) => respond(() => topDishes(ranked(), limit)),
    drawWheel: ({ spicy }) => respond(() => drawWheel(ranked(), spicy, rng)),
    resetLocalData: () => respond(() => storage.clear()),
  };
}
