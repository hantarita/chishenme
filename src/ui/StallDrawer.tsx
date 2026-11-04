import { useEffect, useRef, useState } from "react";
import { heatColor, readableTextColor } from "../domain/heat";
import type { RankedDish } from "../domain/types";
import { useCanteen } from "../store";
import { DishRating, formatDaysAgo, SpicyTag, Stars } from "./common";
import { ReviewForm } from "./ReviewForm";

const REVIEW_PAGE = 8;

function DishItem({ dish, onReview }: { dish: RankedDish; onReview(id: string): void }) {
  const focusDishId = useCanteen((s) => s.focusDishId);
  const ref = useRef<HTMLLIElement>(null);
  const focusNonce = useCanteen((s) => s.focusNonce);
  const focused = focusDishId === dish.id;

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focused, focusNonce]);

  return (
    <li ref={ref} className={focused ? "dish-item is-focused" : "dish-item"}>
      <div className="board-main">
        <span className="board-title">
          {dish.name} <SpicyTag spicy={dish.spicy} />
          {dish.isNew && <span className="tag tag-new">新</span>}
        </span>
        <span className="muted">¥{dish.price}</span>
      </div>
      <DishRating dish={dish} />
      <button type="button" className="link-btn" onClick={() => onReview(dish.id)} aria-label={`评价${dish.name}`}>
        评价
      </button>
    </li>
  );
}

export function StallDrawer() {
  const selectedId = useCanteen((s) => s.selectedId);
  const summary = useCanteen((s) => s.stalls.find((x) => x.id === s.selectedId));
  const detail = useCanteen((s) => s.detail);
  const reviews = useCanteen((s) => s.reviews);
  const closeStall = useCanteen((s) => s.goHome);
  const setReviewDish = useCanteen((s) => s.setReviewDish);
  const removeReview = useCanteen((s) => s.removeReview);
  const [shownReviews, setShownReviews] = useState(REVIEW_PAGE);
  const [allOpen, setAllOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const formAnchor = useRef<HTMLDivElement>(null);
  const focusDishId = useCanteen((s) => s.focusDishId);
  const focusNonce = useCanteen((s) => s.focusNonce);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setShownReviews(REVIEW_PAGE);
    setAllOpen(false);
    if (!selectedId) {
      // 关闭按钮卸载后焦点会掉到 body，要还给打开详情的控件
      if (document.activeElement === document.body) opener.current?.focus({ preventScroll: true });
      opener.current = null;
      return;
    }
    opener.current ??= document.activeElement as HTMLElement | null;
    // 手机上榜单在 3D 画面下方，要滚回顶部才能看到镜头飞过去
    if (window.matchMedia("(max-width: 899px)").matches) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedId]);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [selectedId, focusNonce]);

  // 从榜单跳来时，这道菜可能不在推荐和避雷榜里，要展开全部菜品
  useEffect(() => {
    if (!detail || !focusDishId) return;
    const listed = [...detail.top, ...detail.low].some((d) => d.id === focusDishId);
    if (!listed) setAllOpen(true);
    // 只在换档口或换目标时展开；发表评论刷新 detail 时，不能推翻用户的收起操作
  }, [detail?.id, focusDishId, focusNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.isComposing || !useCanteen.getState().selectedId) return;
      if (document.querySelector("dialog[open]")) return;
      // 输入时按 Esc 可能只是取消输入法，不能丢掉正在写的点评
      if ((e.target as Element | null)?.closest?.("input, textarea, select")) return;
      closeStall();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeStall]);

  if (!selectedId || !summary) return null;

  const color = heatColor(summary.score);
  const startReview = (dishId: string) => {
    setReviewDish(dishId);
    formAnchor.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <div className="drawer" role="dialog" aria-label={`${summary.name}详情`} data-testid="stall-drawer">
      <header className="drawer-head" style={{ background: color, color: readableTextColor(color) }}>
        <div>
          <p className="drawer-cuisine">{summary.cuisine}</p>
          <h2>{summary.name}</h2>
        </div>
        <button ref={closeRef} type="button" className="close-btn" onClick={closeStall} aria-label="关闭详情">
          ✕
        </button>
      </header>

      <div className="drawer-body">
        <div className="score-block">
          {summary.score > 0 ? (
            <>
              <strong className="score-number" data-testid="stall-score">{summary.score.toFixed(1)}</strong>
              <div>
                <Stars score={summary.score} size="lg" />
                <p className="muted">{summary.reviewCount} 条点评</p>
              </div>
            </>
          ) : (
            <strong className="score-empty" data-testid="stall-score">暂无评分</strong>
          )}
        </div>
        <p className="intro">{summary.intro}</p>

        {!detail ? (
          <p className="muted">加载中…</p>
        ) : (
          <>
            {detail.top.length === 0 ? (
              <p className="empty">
                {summary.reviewCount > 0 ? "还没有人评价具体菜品，评价一道菜后这里会出现榜单。" : "这个档口还没有人评价，来当第一个吧。"}
              </p>
            ) : (
              <>
                <section>
                  <h3 className="good">👍 推荐菜 Top {detail.top.length}</h3>
                  <ul className="dish-list" data-testid="top-list">
                    {detail.top.map((d) => (
                      <DishItem key={d.id} dish={d} onReview={startReview} />
                    ))}
                  </ul>
                </section>
                {detail.low.length > 0 && (
                  <section>
                    <h3 className="bad">⚠️ 评价最低 {detail.low.length} 道</h3>
                    <ul className="dish-list" data-testid="low-list">
                      {detail.low.map((d) => (
                        <DishItem key={d.id} dish={d} onReview={startReview} />
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}

            <section>
              <button type="button" className="toggle-btn" aria-expanded={allOpen} onClick={() => setAllOpen(!allOpen)}>
                {allOpen ? "收起" : "查看"}全部菜品（{detail.dishes.length}）
              </button>
              {allOpen && (
                <ul className="dish-list" data-testid="all-dishes">
                  {detail.dishes.map((d) => (
                    <DishItem key={d.id} dish={d} onReview={startReview} />
                  ))}
                </ul>
              )}
            </section>

            <section ref={formAnchor}>
              <h3>写点评</h3>
              <ReviewForm key={detail.id} detail={detail} />
            </section>

            <section>
              <h3>学生点评（{reviews.length}）</h3>
              {reviews.length === 0 && <p className="muted">还没有点评。</p>}
              <ul className="review-list" data-testid="review-list">
                {reviews.slice(0, shownReviews).map((r) => (
                  <li key={r.id} className={r.isLocal ? "review is-local" : "review"}>
                    <div className="review-head">
                      <b>{r.author}</b>
                      {r.isLocal && <span className="tag tag-new">我写的</span>}
                      <span className="muted review-date">{formatDaysAgo(r.createdAt)}</span>
                    </div>
                    <div className="review-meta">
                      <Stars score={r.stars} size="sm" />
                      <span className="muted">{r.dishName ?? "档口整体"}</span>
                    </div>
                    <p>{r.text}</p>
                    {r.isLocal && (
                      <button type="button" className="link-btn" onClick={() => void removeReview(r.id)}>
                        删除
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {reviews.length > shownReviews && (
                <button type="button" className="toggle-btn" onClick={() => setShownReviews(shownReviews + REVIEW_PAGE)}>
                  显示更多点评
                </button>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
