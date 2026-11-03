import { useEffect, useState, type FormEvent } from "react";
import { REVIEW_TEXT_MAX, REVIEW_TEXT_MIN } from "../api/mockServer";
import type { StallDetail } from "../domain/types";
import { useCanteen } from "../store";

const STAR_LABELS = ["", "踩雷", "不太行", "一般", "不错", "超爱"];

export function ReviewForm({ detail }: { detail: StallDetail }) {
  const submitReview = useCanteen((s) => s.submitReview);
  const reviewTarget = useCanteen((s) => s.reviewTarget);
  const [dishId, setDishId] = useState<string>(reviewTarget.dishId ?? "");
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setDishId(reviewTarget.dishId ?? ""), [reviewTarget]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (stars === 0) return setError("请先打分");
    if (trimmed.length < REVIEW_TEXT_MIN) return setError(`评论至少写 ${REVIEW_TEXT_MIN} 个字`);

    setBusy(true);
    setError(null);
    try {
      await submitReview({ stallId: detail.id, dishId: dishId || null, author, stars, text: trimmed });
      setStars(0);
      setHoverStars(0);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  const shown = hoverStars || stars;

  return (
    <form className="review-form" onSubmit={submit} data-testid="review-form">
      <label className="field">
        <span>评价对象</span>
        <select value={dishId} onChange={(e) => setDishId(e.target.value)} data-testid="review-dish">
          <option value="">档口整体</option>
          {detail.dishes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}（{d.spicy ? "辣" : "不辣"}）
            </option>
          ))}
        </select>
      </label>

      <div className="field">
        <span id="star-label">打分</span>
        <div className="star-input" role="radiogroup" aria-labelledby="star-label" onPointerLeave={() => setHoverStars(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={stars === n}
              aria-label={`${n} 星，${STAR_LABELS[n]}`}
              className={n <= shown ? "star-btn is-on" : "star-btn"}
              onPointerEnter={(e) => {
                // 触屏没有悬停，模拟出来的 enter 会让星星显示成没有选中的分数
                if (e.pointerType === "mouse") setHoverStars(n);
              }}
              onClick={() => setStars(n)}
            >
              ★
            </button>
          ))}
          <span className="muted star-word">{STAR_LABELS[shown]}</span>
        </div>
      </div>

      <label className="field">
        <span>评论</span>
        <textarea
          value={text}
          maxLength={REVIEW_TEXT_MAX}
          rows={3}
          placeholder="味道、分量、排队情况，随便说说"
          onChange={(e) => setText(e.target.value)}
          data-testid="review-text"
        />
        <small className="muted count">{text.trim().length}/{REVIEW_TEXT_MAX}</small>
      </label>

      <label className="field">
        <span>昵称</span>
        <input value={author} maxLength={20} placeholder="匿名同学" onChange={(e) => setAuthor(e.target.value)} />
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? "发布中…" : "发布点评"}
      </button>
      <p className="muted form-note">点评只保存在这个浏览器里，其他人看不到。</p>
    </form>
  );
}
