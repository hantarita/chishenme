import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { heatColor } from "../domain/heat";
import type { StallSummary } from "../domain/types";
import { BANNER_TURN, slotPose, STALL } from "./layout";
import { awningTexture, bannerTexture, glowTexture, menuTexture, tileTexture } from "./textures";

const DRAG_THRESHOLD_PX = 5;
const BANNER_TILT = -0.32;
/** 菜盘的颜色避开红色系，不和热力图混淆 */
const FOOD_COLORS = ["#D9A441", "#7FA65A", "#B9793F", "#EFE3C2"];
const TRAY_X = [-1.8, -0.6, 0.6, 1.8];

interface Props {
  stall: StallSummary;
  selected: boolean;
  onSelect(id: string): void;
}

export function StallBooth({ stall, selected, onSelect }: Props) {
  const [hovered, setHovered] = useState(false);
  const pose = slotPose(stall.slotIndex);
  const color = heatColor(stall.score);
  const { width: w, depth: d, height: h } = STALL;
  const bannerYaw = -pose.rotationY * BANNER_TURN;

  // 评分变化时颜色渐变过去，让“写完评论颜色变了”能被看见
  const heatMaterial = useMemo(() => new THREE.MeshLambertMaterial({ color }), []); // eslint-disable-line
  const glowMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color, map: glowTexture(), transparent: true, opacity: 0.75, depthWrite: false }),
    [], // eslint-disable-line
  );
  const awningMaterial = useMemo(() => new THREE.MeshLambertMaterial({ color, map: awningTexture() }), []); // eslint-disable-line
  const target = useRef(new THREE.Color(color));
  target.current.set(color);

  useFrame(({ invalidate }) => {
    if (heatMaterial.color.equals(target.current)) return;
    heatMaterial.color.lerp(target.current, 0.08);
    const c = heatMaterial.color;
    const t = target.current;
    if (Math.abs(c.r - t.r) + Math.abs(c.g - t.g) + Math.abs(c.b - t.b) < 0.004) c.copy(t);
    glowMaterial.color.copy(c);
    awningMaterial.color.copy(c);
    invalidate();
  });

  const banner = useMemo(() => bannerTexture(stall.name, stall.score, color), [stall.name, stall.score, color]);
  useEffect(() => () => banner.dispose(), [banner]);
  useEffect(
    () => () => {
      heatMaterial.dispose();
      glowMaterial.dispose();
      awningMaterial.dispose();
    },
    [heatMaterial, glowMaterial, awningMaterial],
  );

  const enter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const leave = () => {
    setHovered(false);
    document.body.style.cursor = "";
  };
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta <= DRAG_THRESHOLD_PX) onSelect(stall.id);
  };

  return (
    <group position={[pose.x, 0, pose.z]} rotation={[0, pose.rotationY, 0]}>
      {/* 地面热力光晕 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, d / 2 + 0.6]} scale={[w + 3, 6, 1]} material={glowMaterial}>
        <planeGeometry />
      </mesh>

      {(selected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0.1]}>
          <planeGeometry args={[w + 0.5, d + 0.8]} />
          <meshBasicMaterial color={selected ? "#0F5F5C" : "#241F1C"} transparent opacity={selected ? 0.95 : 0.45} />
        </mesh>
      )}

      <group onClick={click} onPointerOver={enter} onPointerOut={leave}>
        {/* 后墙和两侧 */}
        <mesh position={[0, h / 2, -d / 2 + 0.15]} material={heatMaterial} castShadow>
          <boxGeometry args={[w, h, 0.3]} />
        </mesh>
        <mesh position={[-w / 2 + 0.1, h / 2, 0]} material={heatMaterial} castShadow>
          <boxGeometry args={[0.2, h, d]} />
        </mesh>
        <mesh position={[w / 2 - 0.1, h / 2, 0]} material={heatMaterial} castShadow>
          <boxGeometry args={[0.2, h, d]} />
        </mesh>
        {/* 屋顶：俯视时最大的色块，热力图主要靠它 */}
        <mesh position={[0, h + 0.1, 0]} material={heatMaterial} castShadow>
          <boxGeometry args={[w, 0.2, d]} />
        </mesh>

        {/* 后厨的白瓷砖墙 */}
        <mesh position={[0, h / 2, -d / 2 + 0.31]}>
          <planeGeometry args={[w - 0.4, h - 0.1]} />
          <meshLambertMaterial map={tileTexture(5, 3)} />
        </mesh>

        {/* 后厨 */}
        <mesh position={[0, 0.5, -0.8]}>
          <boxGeometry args={[w - 0.6, 1, 0.8]} />
          <meshLambertMaterial color="#A9ADB0" />
        </mesh>
        {[-1.6, 0, 1.6].map((x) => (
          <mesh key={x} position={[x, 1.2, -0.8]}>
            <cylinderGeometry args={[0.3, 0.26, 0.4, 12]} />
            <meshLambertMaterial color="#6F7478" />
          </mesh>
        ))}

        {/* 打菜台 */}
        <mesh position={[0, 0.5, d / 2 - 0.45]} material={heatMaterial} castShadow>
          <boxGeometry args={[w - 0.4, 1, 0.9]} />
        </mesh>
        <mesh position={[0, 1.04, d / 2 - 0.45]}>
          <boxGeometry args={[w - 0.3, 0.08, 1]} />
          <meshLambertMaterial color="#D9DCDE" />
        </mesh>
        <mesh position={[0, 1.45, d / 2 - 0.5]}>
          <boxGeometry args={[w - 0.6, 0.7, 0.04]} />
          <meshLambertMaterial color="#DDF1F4" transparent opacity={0.35} />
        </mesh>
        {TRAY_X.map((x, i) => (
          <group key={x} position={[x, 1.12, d / 2 - 0.45]}>
            <mesh>
              <boxGeometry args={[0.98, 0.08, 0.68]} />
              <meshLambertMaterial color="#C4C8CB" />
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <boxGeometry args={[0.84, 0.05, 0.54]} />
              <meshLambertMaterial color={FOOD_COLORS[(i + stall.slotIndex) % FOOD_COLORS.length]} />
            </mesh>
          </group>
        ))}
        {/* 取餐滑轨、玻璃罩支架、碗 */}
        <mesh position={[0, 0.98, d / 2 + 0.1]}>
          <boxGeometry args={[w - 0.3, 0.05, 0.3]} />
          <meshLambertMaterial color="#AEB3B7" />
        </mesh>
        {[-2.6, 2.6].map((x) => (
          <mesh key={x} position={[x, 1.45, d / 2 - 0.5]}>
            <boxGeometry args={[0.06, 0.8, 0.06]} />
            <meshLambertMaterial color="#8E9498" />
          </mesh>
        ))}
        <mesh position={[2.52, 1.2, d / 2 - 0.45]}>
          <cylinderGeometry args={[0.17, 0.12, 0.26, 12]} />
          <meshLambertMaterial color="#FBFAF6" />
        </mesh>

        {/* 雨棚 */}
        <mesh position={[0, h - 0.18, d / 2 + 0.38]} rotation={[0.38, 0, 0]} material={awningMaterial} castShadow>
          <boxGeometry args={[w, 0.06, 0.95]} />
        </mesh>

        {/* 门口的菜单牌 */}
        <group position={[w / 2 - 0.55, 0, d / 2 + 0.85]}>
          <mesh position={[0, 0.58, 0]} rotation={[-0.2, 0, 0]} castShadow>
            <boxGeometry args={[0.82, 1.1, 0.04]} />
            <meshLambertMaterial map={menuTexture(stall.cuisine)} />
          </mesh>
          <mesh position={[0, 0.58, -0.22]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.82, 1.1, 0.04]} />
            <meshLambertMaterial color="#9A7650" />
          </mesh>
        </group>

        {/* 门头招牌：前倾；侧墙的招牌再转向入口，否则从全景看几乎是侧面 */}
        <group position={[0, h + 0.85, d / 2 - 0.05]} rotation={[0, bannerYaw, 0]}>
          <mesh rotation={[BANNER_TILT, 0, 0]}>
            <planeGeometry args={[w, (w * 200) / 1024]} />
            <meshBasicMaterial map={banner} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>

      {hovered && (
        <Html position={[0, h + 4.6, d / 2]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="scene-tip">
            <strong>{stall.name}</strong>
            <span>{stall.score > 0 ? `★ ${stall.score.toFixed(1)} · ${stall.reviewCount} 条点评` : "暂无评分"}</span>
            <small>点击查看菜品和点评</small>
          </div>
        </Html>
      )}
    </group>
  );
}
