import { CameraControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useCanteen } from "../store";
import { HALL, slotPose } from "./layout";

const DESKTOP_MIN_WIDTH = 900;
/** 抽屉盖住画面左侧，把档口往右挪 */
const DRAWER_FOCAL_OFFSET = -4;
/** 这个机位下，画面宽高比不小于该值时能看到整个大厅 */
const FULL_VIEW_ASPECT = 1.42;
const HOME = { y: 36, z: 34, targetZ: -1.5 };
const CLOSE_UP = { distance: 17, height: 9.5 };

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CameraRig() {
  const controls = useRef<CameraControls>(null);
  const aspect = useThree((s) => s.viewport.aspect);
  const selectedId = useCanteen((s) => s.selectedId);
  const homeNonce = useCanteen((s) => s.homeNonce);
  const stalls = useCanteen((s) => s.stalls);
  const slotIndex = stalls.find((s) => s.id === selectedId)?.slotIndex;

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const box = new THREE.Box3(
      new THREE.Vector3(-HALL.width / 2, 0, -HALL.depth / 2),
      new THREE.Vector3(HALL.width / 2, HALL.wallHeight, HALL.depth / 2),
    );
    c.setBoundary(box);
  }, []);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const animate = !prefersReducedMotion();

    if (slotIndex === undefined) {
      // 窄屏要退得更远，才能看到整个大厅
      const scale = Math.min(2.8, Math.max(1, FULL_VIEW_ASPECT / aspect));
      c.setFocalOffset(0, 0, 0, animate);
      c.setLookAt(0, HOME.y * scale, HOME.z * scale, 0, 0, HOME.targetZ, animate);
      return;
    }

    const pose = slotPose(slotIndex);
    const [fx, fz] = pose.front;
    const [vx, vz] = pose.view;
    const desktop = window.innerWidth >= DESKTOP_MIN_WIDTH;
    c.setFocalOffset(desktop ? DRAWER_FOCAL_OFFSET : 0, 0, 0, animate);
    const targetX = pose.x + fx * 1.5;
    const targetZ = pose.z + fz * 1.5;
    c.setLookAt(targetX + vx * CLOSE_UP.distance, CLOSE_UP.height, targetZ + vz * CLOSE_UP.distance, targetX, 2.2, targetZ, animate);
  }, [slotIndex, homeNonce, aspect]);

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={7}
      maxDistance={150}
      minPolarAngle={0.15}
      maxPolarAngle={1.3}
      smoothTime={0.45}
    />
  );
}
