import type { NewReviewInput, RankedDish, Review, SpicyFilter, StallDetail, StallSummary } from "../domain/types";
import { createMockServer } from "./mockServer";

/** UI 只依赖这个接口。接入真实后端时，换掉下面的实现即可 */
export interface CanteenApi {
  getStalls(): Promise<StallSummary[]>;
  getStall(id: string): Promise<StallDetail>;
  getReviews(stallId: string): Promise<Review[]>;
  createReview(input: NewReviewInput): Promise<Review>;
  deleteReview(id: string): Promise<void>;
  getNewDishes(): Promise<RankedDish[]>;
  getTopDishes(limit?: number): Promise<RankedDish[]>;
  drawWheel(options: { spicy: SpicyFilter }): Promise<RankedDish[]>;
  resetLocalData(): Promise<void>;
}

export const api: CanteenApi = createMockServer();
