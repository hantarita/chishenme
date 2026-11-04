import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HALL, STOOL_OFFSETS, TABLE_POSITIONS } from "./layout";
import { floorLabelTexture, floorTexture, glowTexture, signTexture, tileTexture, windowTexture, woodFloorTexture } from "./textures";

const PILLARS: [number, number][] = [
  [-12.5, -6.5],
  [12.5, -6.5],
  [-12.5, 10.5],
  [12.5, 10.5],
];
const PILLAR_HEIGHT = 3.2;
const STAIR_STEPS = 8;
const STAIR_RISE = 0.14;
const WOOD = "#B98A5A";
const DARK_WOOD = "#6B4A2E";
const STEEL = "#AEB3B7";
const INK = "#2F3A36";
const WINDOW_Z = [-9, 0, 9];
const LIGHT_POOLS: [number, number][] = [-9, -3, 3, 9].flatMap((x) => [-2.25, 2.25].map((z): [number, number] => [x, z]));
/** 招牌转向入口，从全景才看得清 */
const STATION_SIGN_YAW = 0.7;
const PLANTS: [number, number][] = [
  [-5.6, 12.9],
  [5.6, 12.9],
  [-12.5, 12],
  [12.5, 12],
];

function Box({ p, s, c, shadow }: { p: [number, number, number]; s: [number, number, number]; c: string; shadow?: boolean }) {
  return (
    <mesh position={p} castShadow={shadow}>
      <boxGeometry args={s} />
      <meshLambertMaterial color={c} />
    </mesh>
  );
}

function Sign({ text, p, ry = 0, width, bg = INK, ink = "#F4EFE0" }: { text: string; p: [number, number, number]; ry?: number; width: number; bg?: string; ink?: string }) {
  const map = useMemo(() => signTexture(text, bg, ink), [text, bg, ink]);
  return (
    <mesh position={p} rotation={[0, ry, 0]}>
      <planeGeometry args={[width, (width * 160) / 1024]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

function Tables() {
  const tops = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  const stools = useRef<THREE.InstancedMesh>(null);
  const holders = useRef<THREE.InstancedMesh>(null);
  const trays = useRef<THREE.InstancedMesh>(null);
  const bowls = useRef<THREE.InstancedMesh>(null);

  // 不是每个座位都摆餐盘，看起来才像有人吃过、有人刚来
  const settings = useMemo(
    () =>
      TABLE_POSITIONS.flatMap(([x, z], t) =>
        STOOL_OFFSETS.filter((_, s) => (t * 3 + s * 5) % 3 !== 0).map(([dx, dz]): [number, number] => [x + dx, z + dz * 0.36]),
      ),
    [],
  );

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    TABLE_POSITIONS.forEach(([x, z], i) => {
      tops.current!.setMatrixAt(i, m.makeTranslation(x, 0.76, z));
      legs.current!.setMatrixAt(i, m.makeTranslation(x, 0.37, z));
      holders.current!.setMatrixAt(i, m.makeTranslation(x, 0.87, z));
      STOOL_OFFSETS.forEach(([dx, dz], k) => {
        stools.current!.setMatrixAt(i * 4 + k, m.makeTranslation(x + dx, 0.23, z + dz));
      });
    });
    settings.forEach(([x, z], i) => {
      trays.current!.setMatrixAt(i, m.makeTranslation(x, 0.81, z));
      bowls.current!.setMatrixAt(i, m.makeTranslation(x, 0.88, z));
    });
    for (const mesh of [tops, legs, stools, holders, trays, bowls]) mesh.current!.instanceMatrix.needsUpdate = true;
  }, [settings]);

  const tables = TABLE_POSITIONS.length;
  return (
    <>
      <instancedMesh ref={tops} args={[undefined, undefined, tables]} castShadow>
        <boxGeometry args={[2.6, 0.08, 1.2]} />
        <meshLambertMaterial color="#E7C9A0" />
      </instancedMesh>
      <instancedMesh ref={legs} args={[undefined, undefined, tables]}>
        <boxGeometry args={[0.5, 0.74, 0.5]} />
        <meshLambertMaterial color={DARK_WOOD} />
      </instancedMesh>
      <instancedMesh ref={stools} args={[undefined, undefined, tables * 4]} castShadow>
        <cylinderGeometry args={[0.24, 0.2, 0.46, 12]} />
        <meshLambertMaterial color="#3C6E71" />
      </instancedMesh>
      {/* 桌子中间的纸巾盒 */}
      <instancedMesh ref={holders} args={[undefined, undefined, tables]}>
        <boxGeometry args={[0.3, 0.14, 0.2]} />
        <meshLambertMaterial color="#FBFAF6" />
      </instancedMesh>
      <instancedMesh ref={trays} args={[undefined, undefined, settings.length]}>
        <boxGeometry args={[0.62, 0.03, 0.42]} />
        <meshLambertMaterial color="#54807F" />
      </instancedMesh>
      <instancedMesh ref={bowls} args={[undefined, undefined, settings.length]}>
        <cylinderGeometry args={[0.14, 0.09, 0.12, 10]} />
        <meshLambertMaterial color="#FBFAF6" />
      </instancedMesh>
    </>
  );
}

/** 灯光只画在地上。吊灯和横梁会挡住招牌，所以不做 */
function TableLight() {
  return (
    <>
      {LIGHT_POOLS.map(([x, z]) => (
        <mesh key={`${x}:${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.016, z]} scale={[7, 7, 1]}>
          <planeGeometry />
          <meshBasicMaterial map={glowTexture()} color="#FFE3B0" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function Windows({ side }: { side: -1 | 1 }) {
  const x = side * (HALL.width / 2 - 0.02);
  return (
    <>
      {WINDOW_Z.map((z) => (
        <group key={z} position={[x, 5.05, z]} rotation={[0, -side * (Math.PI / 2), 0]}>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[7.4, 1.5]} />
            <meshLambertMaterial color={DARK_WOOD} />
          </mesh>
          <mesh>
            <planeGeometry args={[7.2, 1.3]} />
            <meshBasicMaterial map={windowTexture()} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Clock() {
  return (
    <group position={[15, 5.05, -13.97]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.6, 0.6, 0.06, 28]} />
        <meshLambertMaterial color={DARK_WOOD} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.52, 0.52, 0.03, 28]} />
        <meshBasicMaterial color="#FBFAF6" />
      </mesh>
      <mesh position={[0.14, 0.07, 0]}>
        <boxGeometry args={[0.3, 0.02, 0.04]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh position={[0, 0.07, -0.2]}>
        <boxGeometry args={[0.03, 0.02, 0.42]} />
        <meshBasicMaterial color={INK} />
      </mesh>
    </group>
  );
}

/** 餐具回收台 */
function ReturnStation() {
  return (
    <group position={[-18.6, 0, 12]}>
      <Box p={[0, 0.5, 0]} s={[2.2, 1, 3.4]} c="#D5D8DA" shadow />
      <Box p={[0, 1.03, 0]} s={[2.3, 0.06, 3.5]} c={STEEL} />
      {[-1, 0, 1].map((z, i) => (
        <Box key={z} p={[0.2, 1.1 + (i === 1 ? 0.14 : 0.07), z]} s={[0.9, i === 1 ? 0.28 : 0.14, 0.7]} c="#54807F" />
      ))}
      <Box p={[0.9, 0.42, 2.3]} s={[0.8, 0.84, 0.8]} c="#5C6B66" shadow />
      <Box p={[-0.5, 1.6, 0]} s={[0.08, 1.1, 0.08]} c={DARK_WOOD} />
      <Sign text="餐具回收" p={[-0.5, 2.4, 0]} ry={STATION_SIGN_YAW} width={3.4} />
    </group>
  );
}

/** 自助饮水台 */
function WaterStation() {
  return (
    <group position={[18.6, 0, 12]}>
      <Box p={[0, 0.5, 0]} s={[2.2, 1, 3.4]} c="#D5D8DA" shadow />
      <Box p={[0, 1.03, 0]} s={[2.3, 0.06, 3.5]} c={STEEL} />
      {[-0.9, 0.9].map((z) => (
        <group key={z} position={[0, 1.06, z]}>
          <Box p={[0, 0.45, 0]} s={[0.9, 0.9, 0.9]} c="#E8ECEE" />
          <mesh position={[0, 1.18, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.56, 14]} />
            <meshLambertMaterial color="#8FC4DC" transparent opacity={0.75} />
          </mesh>
        </group>
      ))}
      <Box p={[0.5, 2, 0]} s={[0.08, 1.9, 0.08]} c={DARK_WOOD} />
      <Sign text="自助饮水" p={[0.5, 3.2, 0]} ry={-STATION_SIGN_YAW} width={3.4} />
    </group>
  );
}

function Plant({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.3, 0.6, 12]} />
        <meshLambertMaterial color="#8A6A4A" />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <icosahedronGeometry args={[0.78, 0]} />
        <meshLambertMaterial color="#5E8F62" flatShading />
      </mesh>
      <mesh position={[0.32, 1.75, 0.12]}>
        <icosahedronGeometry args={[0.46, 0]} />
        <meshLambertMaterial color="#73A673" flatShading />
      </mesh>
    </group>
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
      {/* 底座：让大厅像放在桌上的建筑模型，而不是悬在空中 */}
      <Box p={[0, -0.4, 0.3]} s={[width + 2, 0.8, depth + 2.6]} c="#CFC6B8" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshLambertMaterial map={floorTexture()} />
      </mesh>
      {/* 就餐区 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.15]} receiveShadow>
        <planeGeometry args={[24, 12.9]} />
        <meshLambertMaterial map={woodFloorTexture()} />
      </mesh>

      {/* 南面敞开，留给镜头 */}
      <mesh position={[0, wallHeight / 2, -depth / 2 - 0.15]} receiveShadow>
        <boxGeometry args={[width + 0.6, wallHeight, 0.3]} />
        <meshLambertMaterial color="#F0E6D6" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2 + 0.15), wallHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[0.3, wallHeight, depth]} />
          <meshLambertMaterial color="#EADFCD" />
        </mesh>
      ))}
      {/* 墙顶收边和下半截瓷砖 */}
      <Box p={[0, wallHeight + 0.06, -depth / 2 - 0.15]} s={[width + 0.8, 0.12, 0.4]} c={DARK_WOOD} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box p={[side * (width / 2 + 0.15), wallHeight + 0.06, 0]} s={[0.4, 0.12, depth]} c={DARK_WOOD} />
          <mesh position={[side * (width / 2 - 0.02), 0.9, 12]} rotation={[0, -side * (Math.PI / 2), 0]}>
            <planeGeometry args={[4, 1.8]} />
            <meshLambertMaterial map={tileTexture(8, 4)} />
          </mesh>
        </group>
      ))}
      <Windows side={-1} />
      <Windows side={1} />

      <Sign text="家园食堂 · 二层" p={[-7, 5.05, -13.98]} width={8} />
      <Sign text="光盘行动 · 文明用餐" p={[5, 5.05, -13.98]} width={8} bg="#F0E6D6" ink="#6B4A2E" />
      <Clock />

      {PILLARS.map(([x, z]) => (
        <group key={`${x}:${z}`}>
          <Box p={[x, PILLAR_HEIGHT / 2, z]} s={[0.7, PILLAR_HEIGHT, 0.7]} c="#E4DACA" shadow />
          <Box p={[x, 0.5, z]} s={[0.84, 1, 0.84]} c={WOOD} />
          <Box p={[x, PILLAR_HEIGHT + 0.06, z]} s={[0.9, 0.12, 0.9]} c={DARK_WOOD} />
          <mesh position={[x, PILLAR_HEIGHT + 0.3, z]}>
            <sphereGeometry args={[0.24, 12, 10]} />
            <meshBasicMaterial color="#FFE8B8" />
          </mesh>
        </group>
      ))}

      <Tables />
      <TableLight />
      <Stairs />
      <ReturnStation />
      <WaterStation />
      {PLANTS.map(([x, z]) => (
        <Plant key={`${x}:${z}`} x={x} z={z} />
      ))}
    </>
  );
}
