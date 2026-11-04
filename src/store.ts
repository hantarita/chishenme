import { create } from "zustand";
import { api } from "./api/client";
import type { NewReviewInput, RankedDish, Review, SpicyFilter, StallDetail, StallSummary } from "./domain/types";

interface CanteenState {
  stalls: StallSummary[];
  newDishes: RankedDish[];
  topDishes: RankedDish[];
  selectedId: string | null;
  detail: StallDetail | null;
  reviews: Review[];
  /** 从榜单或转盘跳来时要高亮并滚动到的菜 */
  focusDishId: string | null;
  /** 带 nonce，重复点同一道菜也能重新定位 */
  focusNonce: number;
  /** 评论表单预选的菜。带 nonce，重复点同一道菜也能生效 */
  reviewTarget: { dishId: string | null; nonce: number };
  wheelOpen: boolean;
  toast: string | null;
  loadError: boolean;
  /** 每次“回到全景”加一，镜头据此复位 */
  homeNonce: number;

  init(): Promise<void>;
  selectStall(id: string, dishId?: string | null): Promise<void>;
  closeStall(): void;
  goHome(): void;
  setReviewDish(id: string | null): void;
  submitReview(input: NewReviewInput): Promise<void>;
  removeReview(id: string): Promise<void>;
  resetDemo(): Promise<void>;
  setWheelOpen(open: boolean): void;
  drawWheel(spicy: SpicyFilter): Promise<RankedDish[]>;
  showToast(message: string): void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let selectRequest = 0;
const deleting = new Set<string>();

export const useCanteen = create<CanteenState>((set, get) => {
  const refreshBoards = async () => {
    const [stalls, newDishes, topDishes] = await Promise.all([api.getStalls(), api.getNewDishes(), api.getTopDishes(5)]);
    set({ stalls, newDishes, topDishes });
  };

  const loadStall = async (id: string) => {
    const request = ++selectRequest;
    const [detail, reviews] = await Promise.all([api.getStall(id), api.getReviews(id)]);
    // 连续点不同档口时，丢弃较早请求的结果
    if (request === selectRequest && get().selectedId === id) set({ detail, reviews });
  };

  return {
    stalls: [],
    newDishes: [],
    topDishes: [],
    selectedId: null,
    detail: null,
    reviews: [],
    focusDishId: null,
    focusNonce: 0,
    reviewTarget: { dishId: null, nonce: 0 },
    wheelOpen: false,
    toast: null,
    loadError: false,
    homeNonce: 0,

    init: async () => {
      try {
        await refreshBoards();
      } catch {
        set({ loadError: true });
      }
    },

    selectStall: async (id, dishId = null) => {
      const changed = get().selectedId !== id;
      set((s) => ({
        selectedId: id,
        focusDishId: dishId,
        focusNonce: dishId ? s.focusNonce + 1 : s.focusNonce,
        // 再次点击同一个档口时，不要清掉表单里已经选好的菜
        ...(changed || dishId ? { reviewTarget: { dishId, nonce: s.reviewTarget.nonce + 1 } } : {}),
        ...(changed ? { detail: null, reviews: [] } : {}),
      }));
      await loadStall(id);
    },

    closeStall: () => {
      selectRequest++;
      set({ selectedId: null, detail: null, reviews: [], focusDishId: null });
    },

    goHome: () => {
      get().closeStall();
      set((s) => ({ homeNonce: s.homeNonce + 1 }));
    },

    setReviewDish: (dishId) => set((s) => ({ reviewTarget: { dishId, nonce: s.reviewTarget.nonce + 1 } })),

    submitReview: async (input) => {
      const before = get().stalls.find((s) => s.id === input.stallId)?.score ?? 0;
      await api.createReview(input);
      await refreshBoards();
      if (get().selectedId === input.stallId) await loadStall(input.stallId);
      const after = get().stalls.find((s) => s.id === input.stallId)?.score ?? 0;
      get().showToast(after === before ? `已发布，档口评分仍为 ${after.toFixed(1)}` : `已发布，档口评分 ${before.toFixed(1)} → ${after.toFixed(1)}`);
    },

    removeReview: async (id) => {
      if (deleting.has(id)) return;
      deleting.add(id);
      let message = "评论已删除";
      try {
        await api.deleteReview(id);
      } catch {
        // 可能已在其他标签页删除，下面刷新后列表就对了
        message = "这条评论已经不存在";
      }
      await refreshBoards();
      const selected = get().selectedId;
      if (selected) await loadStall(selected);
      deleting.delete(id);
      get().showToast(message);
    },

    resetDemo: async () => {
      await api.resetLocalData();
      await refreshBoards();
      const selected = get().selectedId;
      if (selected) await loadStall(selected);
      get().showToast("已清除本机写入的评论");
    },

    setWheelOpen: (wheelOpen) => set({ wheelOpen }),

    drawWheel: (spicy) => api.drawWheel({ spicy }),

    showToast: (toast) => {
      clearTimeout(toastTimer);
      set({ toast });
      toastTimer = setTimeout(() => set({ toast: null }), 3500);
    },
  };
});
