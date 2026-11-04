import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { StallSummary } from "../domain/types";
import { queueLength, slotPoint, slotPose, STALL, STOOL_OFFSETS, TABLE_POSITIONS } from "./layout";

const CLOTHES = ["#3C6E71", "#5B7DB1", "#D9A441", "#7A8B99", "#4F5D75", "#8FA68E", "#C7B198", "#6A5D7B"];
const SKIN = ["#F2D3B3", "#E8C39E", "#D9AE86"];
const CHEF_COAT = "#FBFAF6";
const MAX_QUEUE = 4;
const QUEUE_GAP = 0.92;
const BODY_LENGTH = 0.92;

interface Person {
  x: number;
  z: number;
  seated: boolean;
  coat: string;
}

/** 后墙两端的队伍往里斜，否则会撞到侧墙的档口 */
const queueLean = (slot: number) => (slot === 0 ? 0.45 : slot === 5 ? -0.45 : 0);

function buildPeople(stalls: StallSummary[]): { people: Person[]; chefs: [number, number][] } {
  const people: Person[] = [];
  TABLE_POSITIONS.forEach(([x, z], t) => {
    STOOL_OFFSETS.forEach(([dx, dz], s) => {
      if ((t * 5 + s * 3) % 7 < 2) people.push({ x: x + dx, z: z + dz, seated: true, coat: CLOTHES[(t + s * 3) % CLOTHES.length] });
    });
  });
  const chefs: [number, number][] = [];
  for (const stall of stalls) {
    const pose = slotPose(stall.slotIndex);
    chefs.push(slotPoint(pose, stall.slotIndex % 2 ? -0.8 : 0.8, 0.45));
    const count = queueLength(stall.score);
    for (let i = 0; i < count; i++) {
      const [x, z] = slotPoint(pose, queueLean(stall.slotIndex) * i, STALL.depth / 2 + 1 + i * QUEUE_GAP);
      people.push({ x, z, seated: false, coat: CLOTHES[(stall.slotIndex * 3 + i) % CLOTHES.length] });
    }
  }
  return { people, chefs };
}

const CAPACITY = 12 + TABLE_POSITIONS.length * STOOL_OFFSETS.length + 12 * MAX_QUEUE;

/** 学生和厨师。全部用 instancedMesh，人多也只有三次绘制 */
export function Crowd({ stalls }: { stalls: StallSummary[] }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const hats = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  // 只有人数变化时才需要重排
  const signature = stalls.map((s) => `${s.slotIndex}:${queueLength(s.score)}`).join();

  useLayoutEffect(() => {
    const { people, chefs } = buildPeople(stalls);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();
    let n = 0;

    const place = (x: number, z: number, seated: boolean, coat: string, headColor: string) => {
      const bodyScale = seated ? 0.62 : 1;
      const bodyY = seated ? 0.86 : 0.74;
      bodies.current!.setMatrixAt(n, m.compose(pos.set(x, bodyY, z), q, scale.set(1, bodyScale, 1)));
      bodies.current!.setColorAt(n, color.set(coat));
      const headY = seated ? 1.46 : 1.66;
      heads.current!.setMatrixAt(n, m.compose(pos.set(x, headY, z), q, scale.set(1, 1, 1)));
      heads.current!.setColorAt(n, color.set(headColor));
      n++;
    };

    people.forEach((p, i) => place(p.x, p.z, p.seated, p.coat, SKIN[i % SKIN.length]));
    chefs.forEach(([x, z], i) => {
      place(x, z, false, CHEF_COAT, SKIN[i % SKIN.length]);
      hats.current!.setMatrixAt(i, m.compose(pos.set(x, 1.94, z), q, scale.set(1, 1, 1)));
    });

    bodies.current!.count = heads.current!.count = n;
    hats.current!.count = chefs.length;
    for (const mesh of [bodies, heads]) {
      mesh.current!.instanceMatrix.needsUpdate = true;
      mesh.current!.instanceColor!.needsUpdate = true;
    }
    hats.current!.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <instancedMesh ref={bodies} args={[undefined, undefined, CAPACITY]} castShadow frustumCulled={false}>
        <capsuleGeometry args={[0.25, BODY_LENGTH, 4, 10]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, CAPACITY]} frustumCulled={false}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={hats} args={[undefined, undefined, 12]} frustumCulled={false}>
        <cylinderGeometry args={[0.2, 0.17, 0.2, 10]} />
        <meshLambertMaterial color={CHEF_COAT} />
      </instancedMesh>
    </>
  );
}
