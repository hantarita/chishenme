import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HALL } from "./layout";
import { floorLabelTexture, floorTexture } from "./textures";

const TABLE_X = [-9, -3, 3, 9];
const TABLE_Z = [-4.5, 0, 4.5];
const STOOL_OFFSETS: [number, number][] = [
  [-0.65, -1],
  [0.65, -1],
  [-0.65, 1],
  [0.65, 1],
];
const PILLARS: [number, number][] = [
  [-12.5, -6.5],
  [12.5, -6.5],
  [-12.5, 10.5],
  [12.5, 10.5],
];
const PILLAR_HEIGHT = 3.2;
const STAIR_STEPS = 8;
const STAIR_RISE = 0.14;

function Tables() {
  const tops = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  const stools = useRef<THREE.InstancedMesh>(null);

  const positions = useMemo(() => TABLE_X.flatMap((x) => TABLE_Z.map((z): [number, number] => [x, z])), []);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    positions.forEach(([x, z], i) => {
      tops.current!.setMatrixAt(i, m.makeTranslation(x, 0.76, z));
      legs.current!.setMatrixAt(i, m.makeTranslation(x, 0.37, z));
      STOOL_OFFSETS.forEach(([dx, dz], k) => {
        stools.current!.setMatrixAt(i * 4 + k, m.makeTranslation(x + dx, 0.23, z + dz));
      });
    });
    for (const mesh of [tops, legs, stools]) mesh.current!.instanceMatrix.needsUpdate = true;
  }, [positions]);

  return (
    <>
      <instancedMesh ref={tops} args={[undefined, undefined, positions.length]} castShadow>
        <boxGeometry args={[2.6, 0.08, 1.2]} />
        <meshLambertMaterial color="#F4EFE7" />
      </instancedMesh>
      <instancedMesh ref={legs} args={[undefined, undefined, positions.length]}>
        <boxGeometry args={[0.5, 0.74, 0.5]} />
        <meshLambertMaterial color="#7D766D" />
      </instancedMesh>
      <instancedMesh ref={stools} args={[undefined, undefined, positions.length * 4]} castShadow>
        <cylinderGeometry args={[0.24, 0.2, 0.46, 12]} />
        <meshLambertMaterial color="#3C6E71" />
      </instancedMesh>
    </>
  );
}

function Stairs() {
  const label = useMemo(() => floorLabelTexture("楼梯口 · 入口"), []);
  return (
    <group position={[0, 0, 10]}>
      {/* 台阶朝南，从入口方向能看到踏面 */}
      {Array.from({ length: STAIR_STEPS }, (_, i) => {
        const height = (STAIR_STEPS - i) * STAIR_RISE;
        return (
          <mesh key={i} position={[0, height / 2, i * 0.5 + 0.25]} castShadow>
            <boxGeometry args={[7, height, 0.5]} />
            <meshLambertMaterial color={i % 2 ? "#D8D1C7" : "#E9E3DA"} />
          </mesh>
        );
      })}
      {[-3.6, 3.6].map((x) => (
        <mesh key={x} position={[x, 1.1, 1.95]} rotation={[Math.atan(STAIR_RISE / 0.5), 0, 0]}>
          <boxGeometry args={[0.15, 0.6, 4.2]} />
          <meshLambertMaterial color="#6F7478" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -2.6]}>
        <planeGeometry args={[6, 1.125]} />
        <meshBasicMaterial map={label} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Hall() {
  const { width, depth, wallHeight } = HALL;
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshLambertMaterial map={floorTexture()} />
      </mesh>

      {/* 南面敞开，留给镜头 */}
      <mesh position={[0, wallHeight / 2, -depth / 2 - 0.15]} receiveShadow>
        <boxGeometry args={[width + 0.6, wallHeight, 0.3]} />
        <meshLambertMaterial color="#EDE7DF" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2 + 0.15), wallHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[0.3, wallHeight, depth]} />
          <meshLambertMaterial color="#E4DDD3" />
        </mesh>
      ))}

      {PILLARS.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, PILLAR_HEIGHT / 2, z]} castShadow>
          <boxGeometry args={[0.7, PILLAR_HEIGHT, 0.7]} />
          <meshLambertMaterial color="#D3CBC0" />
        </mesh>
      ))}

      <Tables />
      <Stairs />
    </>
  );
}
