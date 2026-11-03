import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { HEAT_GRADIENT_CSS } from "../domain/heat";
import { useCanteen } from "../store";
import { FloorPlan } from "./FloorPlan";
import { Sidebar } from "./Sidebar";
import { StallDrawer } from "./StallDrawer";
import { WheelModal } from "./WheelModal";

const CanteenScene = lazy(() => import("../scene/CanteenScene"));

function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** 3D 代码加载或运行出错时退回平面图，不让整页白屏 */
class SceneBoundary extends Component<{ onError(): void; children: ReactNode }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function App() {
  const init = useCanteen((s) => s.init);
  const loadError = useCanteen((s) => s.loadError);
  const toast = useCanteen((s) => s.toast);
  const setWheelOpen = useCanteen((s) => s.setWheelOpen);
  const resetDemo = useCanteen((s) => s.resetDemo);
  const goHome = useCanteen((s) => s.goHome);

  const [webglOk, setWebglOk] = useState(canUseWebGL);
  const [view, setView] = useState<"3d" | "plan">(webglOk ? "3d" : "plan");

  useEffect(() => {
    void init();
  }, [init]);

  const fallBack = () => {
    setWebglOk(false);
    setView("plan");
  };

  const reset = () => {
    if (window.confirm("清除你在这个浏览器里写的所有点评？演示数据不受影响。")) void resetDemo();
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>吃什么</h1>
          <span className="brand-sub">北大家园食堂二层</span>
          <span className="demo-badge">演示数据</span>
        </div>
        <div className="top-actions">
          <button type="button" className="btn btn-quiet" onClick={reset}>重置演示数据</button>
          <button type="button" className="btn btn-primary" onClick={() => setWheelOpen(true)} data-testid="open-wheel">
            🎡 不知道吃什么
          </button>
        </div>
      </header>

      <main className="stage">
        {loadError && <p className="empty" role="alert">数据加载失败，请刷新页面重试。</p>}
        {view === "3d" && webglOk ? (
          <SceneBoundary onError={fallBack}>
            <Suspense fallback={<div className="scene-loading">正在搭建食堂…</div>}>
              <CanteenScene onContextLost={fallBack} />
            </Suspense>
          </SceneBoundary>
        ) : (
          <FloorPlan />
        )}

        <div className="stage-tools">
          {webglOk && (
            <div className="segmented" role="group" aria-label="视图">
              <button type="button" aria-pressed={view === "3d"} onClick={() => setView("3d")}>3D</button>
              <button type="button" aria-pressed={view === "plan"} onClick={() => setView("plan")}>平面图</button>
            </div>
          )}
          {view === "3d" && webglOk && (
            <button type="button" className="btn btn-small" onClick={goHome}>回到全景</button>
          )}
        </div>

        <div className="legend" data-testid="legend">
          <div className="legend-scale">
            <span>0</span>
            <span className="legend-bar" style={{ background: HEAT_GRADIENT_CSS }} />
            <span>5 星</span>
          </div>
          <p>档口、菜品和评论均为演示数据，布局为示意。</p>
        </div>

        <StallDrawer />
      </main>

      <Sidebar />
      <WheelModal />

      <div className="toast-region" aria-live="polite">
        {toast && <div className="toast" data-testid="toast">{toast}</div>}
      </div>
    </div>
  );
}
