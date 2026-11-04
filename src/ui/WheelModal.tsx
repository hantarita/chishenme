import { useCallback, useEffect, useRef, useState } from "react";
import type { RankedDish, SpicyFilter } from "../domain/types";
import { landingRotation, WHEEL_MIN } from "../domain/wheel";
import { useCanteen } from "../store";
import { DishRating, SpicyTag } from "./common";

const SECTOR_COLORS = ["#F3E6D0", "#CFE3DA", "#F7DDB0", "#C7DDE3", "#EADFC8", "#BBD6C5"];
const FILTERS: { value: SpicyFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "spicy", label: "🌶 只要辣" },
  { value: "mild", label: "不要辣" },
];
const SPIN_MS = 4000;
const R = 100;

function polar(deg: number, radius = R): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [Math.sin(rad) * radius, -Math.cos(rad) * radius];
}

function sectorPath(i: number, n: number): string {
  const [x0, y0] = polar((i * 360) / n);
  const [x1, y1] = polar(((i + 1) * 360) / n);
  return `M0 0 L${x0} ${y0} A${R} ${R} 0 ${n <= 2 ? 1 : 0} 1 ${x1} ${y1} Z`;
}

function SectorLabel({ dish, i, n }: { dish: RankedDish; i: number; n: number }) {
  const center = ((i + 0.5) * 360) / n;
  const flipped = center > 180;
  const transform = flipped ? `rotate(${center + 90})` : `rotate(${center - 90})`;
  const x = flipped ? -94 : 94;
  const anchor = flipped ? "start" : "end";
  return (
    <g transform={transform}>
      <text x={x} y={-1} textAnchor={anchor} className="sector-name">{dish.name}</text>
      <text x={x} y={9} textAnchor={anchor} className="sector-tag">{dish.spicy ? "辣" : "不辣"} · {dish.stallName}</text>
    </g>
  );
}

export function WheelModal() {
  const open = useCanteen((s) => s.wheelOpen);
  const setOpen = useCanteen((s) => s.setWheelOpen);
  const selectStall = useCanteen((s) => s.selectStall);
  const drawWheel = useCanteen((s) => s.drawWheel);
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [filter, setFilter] = useState<SpicyFilter>("all");
  const [dishes, setDishes] = useState<RankedDish[]>([]);
  const [rotation, setRotation] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<RankedDish | null>(null);
  const [drawing, setDrawing] = useState(true);
  const drawRequest = useRef(0);

  const redraw = useCallback(async (spicy: SpicyFilter) => {
    const request = ++drawRequest.current;
    setWinner(null);
    setAnimate(false);
    setDrawing(true);
    const drawn = await drawWheel(spicy);
    if (request !== drawRequest.current) return;
    setDishes(drawn);
    setDrawing(false);
  }, [drawWheel]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      void redraw(filter);
    } else if (!open && el.open) {
      el.close();
    }
    if (!open) {
      clearTimeout(timer.current);
      setSpinning(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const spin = () => {
    if (spinning || drawing || dishes.length < WHEEL_MIN) return;
    // 先定结果，动画只负责停到对应扇区
    const index = Math.floor(Math.random() * dishes.length);
    const next = landingRotation(rotation, index, dishes.length, 6, Math.random() * 2 - 1);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setWinner(null);
    setAnimate(!reduced);
    setRotation(next);
    setSpinning(true);
    timer.current = setTimeout(
      () => {
        setSpinning(false);
        setWinner(dishes[index]);
      },
      reduced ? 0 : SPIN_MS + 100,
    );
  };

  const changeFilter = (value: SpicyFilter) => {
    setFilter(value);
    void redraw(value);
  };

  const n = dishes.length;
  const loading = drawing && n < WHEEL_MIN;
  const notEnough = !drawing && n < WHEEL_MIN;

  return (
    <dialog ref={dialog} className="wheel-modal" onClose={() => setOpen(false)} aria-labelledby="wheel-title" data-testid="wheel-modal">
      <div className="wheel-head">
        <h2 id="wheel-title">不知道吃什么？转一下</h2>
        <button type="button" className="close-btn" onClick={() => setOpen(false)} aria-label="关闭转盘">✕</button>
      </div>

      <div className="segmented" role="group" aria-label="辣度筛选">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            disabled={spinning}
            onClick={() => changeFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty">正在抽菜…</p>
      ) : notEnough ? (
        <p className="empty">符合条件的档口不足 {WHEEL_MIN} 个，换个筛选条件试试。</p>
      ) : (
        <div className="wheel-stage">
          <div className="wheel-pointer" aria-hidden="true" />
          <svg
            className="wheel"
            viewBox="-102 -102 204 204"
            role="img"
            aria-label={`转盘，共 ${n} 道菜：${dishes.map((d) => d.name).join("、")}`}
            data-rotation={rotation}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: animate ? `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.85, 0.2, 1)` : "none",
            }}
          >
            {dishes.map((dish, i) => (
              <path key={dish.id} d={sectorPath(i, n)} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} stroke="#FFFFFF" strokeWidth="1" />
            ))}
            {dishes.map((dish, i) => (
              <SectorLabel key={dish.id} dish={dish} i={i} n={n} />
            ))}
            <circle r="12" fill="#241F1C" />
          </svg>
        </div>
      )}

      <div className="wheel-actions">
        <button type="button" className="btn" onClick={() => void redraw(filter)} disabled={spinning}>换一批</button>
        <button type="button" className="btn btn-primary" onClick={spin} disabled={spinning || drawing || notEnough} data-testid="wheel-spin">
          {spinning ? "转动中…" : winner ? "再转一次" : "开始转"}
        </button>
      </div>

      <div aria-live="polite">
        {winner && (
          <div className="wheel-result" data-testid="wheel-result" data-stall={winner.stallId}>
            <div className="board-main">
              <span className="muted">今天就吃</span>
              <strong className="wheel-dish">{winner.name}</strong>
              <span className="board-title">
                <SpicyTag spicy={winner.spicy} />
                <span className="muted">{winner.stallName} · ¥{winner.price}</span>
                <DishRating dish={winner} />
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                // 先关弹窗，详情才能拿到焦点：弹窗开着时页面其他部分不可聚焦
                dialog.current?.close();
                setOpen(false);
                void selectStall(winner.stallId, winner.id);
              }}
            >
              去这个档口
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
