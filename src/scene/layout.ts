export const HALL = { width: 40, depth: 28, wallHeight: 6 };
export const STALL = { width: 6, depth: 4, height: 3 };
/** 侧墙招牌向入口转动的比例：0 是正对大厅，1 是正对入口 */
export const BANNER_TURN = 0.55;

export interface SlotPose {
  x: number;
  z: number;
  rotationY: number;
  /** 档口正面朝向的单位向量 */
  front: [number, number];
  /** 招牌朝向的单位向量。镜头特写时对准招牌，文字才是正的 */
  view: [number, number];
}

const BACK_X = [-16, -9.6, -3.2, 3.2, 9.6, 16];
const SIDE_Z = [-5.6, 0.6, 6.8];

/** 0–5 后墙（从左到右），6–8 左墙，9–11 右墙（都从里到外） */
export function slotPose(index: number): SlotPose {
  if (index < 6) return { x: BACK_X[index], z: -12, rotationY: 0, front: [0, 1], view: [0, 1] };
  const angle = (Math.PI / 2) * (1 - BANNER_TURN);
  const view: [number, number] = [Math.sin(angle), Math.cos(angle)];
  if (index < 9) return { x: -18, z: SIDE_Z[index - 6], rotationY: Math.PI / 2, front: [1, 0], view };
  return { x: 18, z: SIDE_Z[index - 9], rotationY: -Math.PI / 2, front: [-1, 0], view: [-view[0], view[1]] };
}

/** 2D 平面图的网格位置，与 3D 布局一致：[列, 行] */
export function slotCell(index: number): [number, number] {
  if (index < 6) return [index + 1, 1];
  if (index < 9) return [1, index - 6 + 2];
  return [6, index - 9 + 2];
}
