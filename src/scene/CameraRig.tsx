import { CameraControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useCanteen } from "../store";
import { HALL, slotPose } from "./layout";

const DESKTOP_MIN_WIDTH = 900;
/** 抽屉盖住画面左侧，把档口往右挪 */
const DRAWER_FOCAL_OFFSET = -4;
/** 手机上详情面板盖住画面下方，把档口往上挪 */
const SHEET_FOCAL_OFFSET = 1.3;
/** 这个机位下，画面宽高比不小于该值时能看到整个大厅 */
const FULL_VIEW_ASPECT = 1.42;
const HOME = { y: 36, z: 34, targetZ: -1.5 };
const CLOSE_UP = { distance: 17, height: 9.5 };
/** 大厅只有南面敞开，转到墙后面就什么都看不到了 */
const MAX_AZIMUTH = 1.2;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 窄屏要退得更远，才能看到整个大厅 */
const homeScale = (aspect: number) => Math.min(2.8, Math.max(1, FULL_VIEW_ASPECT / aspect));

export function CameraRig() {
  const controls = useRef<CameraControls>(null);
  const userMoved = useRef(false);
  const aspect = useThree((s) => s.viewport.aspect);
  const invalidate = useThree((s) => s.invalidate);
  const selectedId = useCanteen((s) => s.selectedId);
  const homeNonce = useCanteen((s) => s.homeNonce);
  const stalls = useCanteen((s) => s.stalls);
  const slotIndex = stalls.find((s) => s.id === selectedId)?.slotIndex;
  const scale = homeScale(aspect);

  const flyHome = (animate: boolean) => {
    const c = controls.current;
    if (!c) return;
    c.setFocalOffset(0, 0, 0, animate);
    c.setLookAt(0, HOME.y * scale, HOME.z * scale, 0, 0, HOME.targetZ, animate);
  };

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    c.setBoundary(
      new THREE.Box3(
        new THREE.Vector3(-HALL.width / 2, 0, -HALL.depth / 2),
        new THREE.Vector3(HALL.width / 2, HALL.wallHeight, HALL.depth / 2),
      ),
    );
    const markMoved = () => {
      userMoved.current = true;
    };
    c.addEventListener("controlstart", markMoved);
    return () => c.removeEventListener("controlstart", markMoved);
  }, []);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const animate = !prefersReducedMotion();

    if (slotIndex === undefined) {
      userMoved.current = false;
      flyHome(animate);
      // 不带动画时控件不会发事件，按需渲染下要自己请求一帧
      if (!animate) invalidate();
      return;
    }

    const pose = slotPose(slotIndex);
    const [fx, fz] = pose.front;
    const [vx, vz] = pose.view;
    const desktop = window.innerWidth >= DESKTOP_MIN_WIDTH;
    c.setFocalOffset(desktop ? DRAWER_FOCAL_OFFSET : 0, desktop ? 0 : SHEET_FOCAL_OFFSET, 0, animate);
    const targetX = pose.x + fx * 1.5;
    const targetZ = pose.z + fz * 1.5;
    c.setLookAt(targetX + vx * CLOSE_UP.distance, CLOSE_UP.height, targetZ + vz * CLOSE_UP.distance, targetX, 2.2, targetZ, animate);
    if (!animate) invalidate();
  }, [slotIndex, homeNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // 画面尺寸变化（如手机地址栏收起）时只调整全景距离，不能打断用户调好的视角
  useEffect(() => {
    if (slotIndex === undefined && !userMoved.current) flyHome(false);
  }, [scale]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={7}
      maxDistance={Math.max(75, 60 * scale)}
      minPolarAngle={0.15}
      maxPolarAngle={1.3}
      minAzimuthAngle={-MAX_AZIMUTH}
      maxAzimuthAngle={MAX_AZIMUTH}
      smoothTime={0.45}
    />
  );
}
