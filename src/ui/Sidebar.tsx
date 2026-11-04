import { heatColor } from "../domain/heat";
import type { RankedDish } from "../domain/types";
import { useCanteen } from "../store";
import { DishRating, SpicyTag } from "./common";

function DishButton({ dish, rank, note }: { dish: RankedDish; rank?: number; note?: string }) {
  const selectStall = useCanteen((s) => s.selectStall);
  return (
    <li>
      <button type="button" className="board-row" onClick={() => void selectStall(dish.stallId, dish.id)}>
        {rank !== undefined && <span className={`rank rank-${rank}`}>{rank}</span>}
        <span className="board-main">
          <span className="board-title">
            {dish.name} <SpicyTag spicy={dish.spicy} />
          </span>
          <span className="muted">
            {dish.stallName} · ¥{dish.price}
            {note ? ` · ${note}` : ""}
          </span>
        </span>
        <DishRating dish={dish} />
      </button>
    </li>
  );
}

const listedNote = (days: number) => (days <= 0 ? "今天上架" : `${days} 天前上架`);

export function Sidebar({ onReset }: { onReset(): void }) {
  const newDishes = useCanteen((s) => s.newDishes);
  const topDishes = useCanteen((s) => s.topDishes);
  const stalls = useCanteen((s) => s.stalls);
  const selectedId = useCanteen((s) => s.selectedId);
  const selectStall = useCanteen((s) => s.selectStall);
  const sorted = [...stalls].sort((a, b) => b.score - a.score);

  return (
    <aside className="sidebar">
      <section aria-labelledby="top-title">
        <h2 id="top-title">综合榜 Top 5</h2>
        <p className="section-note">综合评分和评论数，只有一条五星的菜不会直接登顶。</p>
        <ol className="board" data-testid="top-dishes">
          {topDishes.map((dish, i) => (
            <DishButton key={dish.id} dish={dish} rank={i + 1} />
          ))}
        </ol>
      </section>

      <section aria-labelledby="new-title">
        <h2 id="new-title">菜品上新</h2>
        <p className="section-note">最近 14 天上架。</p>
        <ul className="board" data-testid="new-dishes">
          {newDishes.map((dish) => (
            <DishButton key={dish.id} dish={dish} note={listedNote(dish.listedDaysAgo)} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="stalls-title">
        <h2 id="stalls-title">全部档口</h2>
        <ul className="stall-list" data-testid="stall-list">
          {sorted.map((stall) => (
            <li key={stall.id}>
              <button
                type="button"
                className={stall.id === selectedId ? "stall-row is-selected" : "stall-row"}
                onClick={() => void selectStall(stall.id)}
              >
                <span className="swatch" style={{ background: heatColor(stall.score) }} />
                <span className="board-main">{stall.name}</span>
                <span className="muted">{stall.score > 0 ? `★ ${stall.score.toFixed(1)}` : "暂无评分"}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className="btn btn-block sidebar-reset" onClick={onReset}>重置演示数据</button>
    </aside>
  );
}
