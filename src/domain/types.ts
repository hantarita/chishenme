export interface Stall {
  id: string;
  name: string;
  slotIndex: number;
  cuisine: string;
  intro: string;
}

export interface Dish {
  id: string;
  stallId: string;
  name: string;
  price: number;
  spicy: boolean;
  listedDaysAgo: number;
}

/** 种子评论只存“几天前”，链接长期可用时日期才不会变旧 */
export interface SeedReview {
  id: string;
  stallId: string;
  dishId: string | null;
  author: string;
  stars: number;
  text: string;
  createdDaysAgo: number;
}

export interface LocalReview {
  id: string;
  stallId: string;
  dishId: string | null;
  author: string;
  stars: number;
  text: string;
  createdAt: string;
}

export interface Review {
  id: string;
  stallId: string;
  dishId: string | null;
  dishName: string | null;
  author: string;
  stars: number;
  text: string;
  createdAt: string;
  isLocal: boolean;
}

export interface NewReviewInput {
  stallId: string;
  dishId: string | null;
  author: string;
  stars: number;
  text: string;
}

export interface RankedDish extends Dish {
  stallName: string;
  isNew: boolean;
  /** 显示用，保留一位小数 */
  rating: number;
  /** 排序用，未四舍五入 */
  meanRating: number;
  reviewCount: number;
  weighted: number;
}

export interface StallSummary extends Stall {
  score: number;
  reviewCount: number;
}

export interface StallDetail extends StallSummary {
  top: RankedDish[];
  low: RankedDish[];
  dishes: RankedDish[];
}

export type SpicyFilter = "all" | "spicy" | "mild";
