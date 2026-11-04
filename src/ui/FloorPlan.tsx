import { heatColor, readableTextColor } from "../domain/heat";
import { slotCell } from "../scene/layout";
import { useCanteen } from "../store";

/** 3D 打不开时的退回视图，也可以手动切换。配色和点击逻辑与 3D 相同 */
export function FloorPlan() {
  const stalls = useCanteen((s) => s.stalls);
  const selectedId = useCanteen((s) => s.selectedId);
  const selectStall = useCanteen((s) => s.selectStall);

  return (
    <div className="plan" data-testid="floor-plan">
      <div className="plan-hall">中央餐桌区</div>
      <div className="plan-stairs">楼梯口 · 入口</div>
      {stalls.map((stall) => {
        const [col, row] = slotCell(stall.slotIndex);
        const background = heatColor(stall.score);
        return (
          <button
            key={stall.id}
            type="button"
            className={stall.id === selectedId ? "plan-stall is-selected" : "plan-stall"}
            style={{ gridColumn: col, gridRow: row, background, color: readableTextColor(background) }}
            onClick={() => void selectStall(stall.id)}
          >
            <b>{stall.name}</b>
            <span>{stall.score > 0 ? `★ ${stall.score.toFixed(1)}` : "暂无评分"}</span>
          </button>
        );
      })}
    </div>
  );
}
