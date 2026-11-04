import type { RankedDish } from "../domain/types";

export function Stars({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`stars stars-${size}`} role="img" aria-label={`${score.toFixed(1)} 星，满分 5 星`}>
      <span className="stars-base" aria-hidden="true">★★★★★</span>
      <span className="stars-fill" aria-hidden="true" style={{ width: `${(score / 5) * 100}%` }}>★★★★★</span>
    </span>
  );
}

export function SpicyTag({ spicy }: { spicy: boolean }) {
  return <span className={spicy ? "tag tag-spicy" : "tag tag-mild"}>{spicy ? "🌶 辣" : "不辣"}</span>;
}

export function DishRating({ dish }: { dish: RankedDish }) {
  if (dish.reviewCount === 0) return <span className="muted">暂无评分</span>;
  return (
    <span className="dish-rating">
      <b>★ {dish.rating.toFixed(1)}</b>
      <span className="muted">{dish.reviewCount} 条</span>
    </span>
  );
}

export function formatDaysAgo(iso: string, now = Date.now()): string {
  const days = Math.floor((now - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  return `${days} 天前`;
}
