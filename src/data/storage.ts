import type { LocalReview } from "../domain/types";

export const STORAGE_KEY = "chishenme:reviews:v1";

type Backing = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface ReviewStorage {
  load(): LocalReview[];
  save(reviews: LocalReview[]): void;
  clear(): void;
}

function browserBacking(): Backing | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 无痕模式等情况下 localStorage 可能抛错，此时退回内存，当前页面仍可使用 */
export function createReviewStorage(backing: Backing | null = browserBacking()): ReviewStorage {
  let memory: LocalReview[] | null = null;

  return {
    load() {
      if (memory) return memory;
      try {
        const parsed: unknown = JSON.parse(backing?.getItem(STORAGE_KEY) ?? "[]");
        return Array.isArray(parsed) ? (parsed as LocalReview[]) : [];
      } catch {
        return [];
      }
    },
    save(reviews) {
      try {
        if (!backing) throw new Error("no storage");
        backing.setItem(STORAGE_KEY, JSON.stringify(reviews));
        memory = null;
      } catch {
        memory = reviews;
      }
    },
    clear() {
      memory = null;
      try {
        backing?.removeItem(STORAGE_KEY);
      } catch {
        // 存储不可用时，清掉内存就够了
      }
    },
  };
}
