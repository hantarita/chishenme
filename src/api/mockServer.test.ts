import { beforeEach, describe, expect, it } from "vitest";
import { createReviewStorage, STORAGE_KEY } from "../data/storage";
import type { CanteenApi } from "./client";
import { createMockServer } from "./mockServer";

function memoryBacking() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

const brokenBacking = {
  getItem: () => {
    throw new Error("denied");
  },
  setItem: () => {
    throw new Error("denied");
  },
  removeItem: () => {
    throw new Error("denied");
  },
};

const review = { stallId: "minnan", dishId: "minnan-1", author: "", stars: 5, text: "沙茶汤底很香" };

describe("模拟 API", () => {
  let backing: ReturnType<typeof memoryBacking>;
  let server: CanteenApi;
  const make = () => createMockServer({ storage: createReviewStorage(backing), latencyMs: 0 });

  beforeEach(() => {
    backing = memoryBacking();
    server = make();
  });

  it("种子数据满足 SPEC 的分布要求", async () => {
    const stalls = await server.getStalls();
    expect(stalls).toHaveLength(12);
    expect(new Set(stalls.map((s) => s.slotIndex)).size).toBe(12);
    expect(stalls.find((s) => s.name === "北京味道")).toBeTruthy();
    expect(stalls.some((s) => s.score === 0)).toBe(true);
    expect(Math.max(...stalls.map((s) => s.score))).toBeGreaterThanOrEqual(4.7);

    const details = await Promise.all(stalls.map((s) => server.getStall(s.id)));
    const ratedCounts = details.map((d) => d.dishes.filter((x) => x.reviewCount > 0).length);
    expect(ratedCounts.some((n) => n >= 10)).toBe(true);
    expect(ratedCounts.some((n) => n >= 6 && n <= 9)).toBe(true);
    expect(ratedCounts.some((n) => n > 0 && n <= 5)).toBe(true);
    expect(details.flatMap((d) => d.dishes).every((x) => typeof x.spicy === "boolean")).toBe(true);
    expect((await server.getNewDishes()).length).toBeGreaterThan(0);
  });

  it("发表评论后档口评分更新，且换一个实例仍能读到", async () => {
    const before = await server.getStall("minnan");
    expect(before.score).toBe(0);

    const created = await server.createReview(review);
    expect(created.author).toBe("匿名同学");
    expect(created.isLocal).toBe(true);
    expect((await server.getStall("minnan")).score).toBe(5);
    expect((await make().getStall("minnan")).reviewCount).toBe(1);
  });

  it("可以删除自己的评论，不能删除种子评论", async () => {
    const created = await server.createReview(review);
    await server.deleteReview(created.id);
    expect((await server.getStall("minnan")).reviewCount).toBe(0);
    await expect(server.deleteReview("seed-1")).rejects.toThrow();
  });

  it("重置后只清除本机评论", async () => {
    const seedCount = (await server.getStall("beijing")).reviewCount;
    await server.createReview({ ...review, stallId: "beijing", dishId: null });
    await server.resetLocalData();
    expect((await server.getStall("beijing")).reviewCount).toBe(seedCount);
    expect(backing.getItem(STORAGE_KEY)).toBeNull();
  });

  it.each([
    ["星级为 0", { stars: 0 }],
    ["星级超过 5", { stars: 6 }],
    ["内容太短", { text: "好吃" }],
    ["内容太长", { text: "好".repeat(301) }],
    ["菜不属于该档口", { dishId: "beijing-1" }],
    ["档口不存在", { stallId: "nope" }],
  ])("拒绝无效评论：%s", async (_name, patch) => {
    await expect(server.createReview({ ...review, ...patch })).rejects.toThrow();
  });
});

describe("存储容错", () => {
  it("写入后可以恢复", () => {
    const backing = memoryBacking();
    const local = { id: "x", stallId: "s", dishId: null, author: "a", stars: 3, text: "还行吧吧吧", createdAt: "2026-01-01T00:00:00Z" };
    createReviewStorage(backing).save([local]);
    expect(createReviewStorage(backing).load()).toEqual([local]);
  });

  it("存储不可用时不报错，并退回内存", async () => {
    const server = createMockServer({ storage: createReviewStorage(brokenBacking), latencyMs: 0 });
    await server.createReview(review);
    expect((await server.getStall("minnan")).reviewCount).toBe(1);
    await expect(server.resetLocalData()).resolves.toBeUndefined();
    expect((await server.getStall("minnan")).reviewCount).toBe(0);
  });

  it("没有存储、内容损坏时都返回空列表", () => {
    expect(createReviewStorage(null).load()).toEqual([]);
    const backing = memoryBacking();
    backing.setItem(STORAGE_KEY, "{broken");
    expect(createReviewStorage(backing).load()).toEqual([]);
    backing.setItem(STORAGE_KEY, '{"a":1}');
    expect(createReviewStorage(backing).load()).toEqual([]);
  });
});
