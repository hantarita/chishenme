import { Canvas } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useCanteen } from "../store";
import { CameraRig } from "./CameraRig";
import { Hall } from "./Hall";
import { StallBooth } from "./StallBooth";

interface Props {
  onContextLost(): void;
}

export default function CanteenScene({ onContextLost }: Props) {
  const stalls = useCanteen((s) => s.stalls);
  const selectedId = useCanteen((s) => s.selectedId);
  const selectStall = useCanteen((s) => s.selectStall);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  // R3F 卸载 Canvas 时会主动释放上下文，这不算故障，所以要先移除监听
  useEffect(() => () => canvas.current?.removeEventListener("webglcontextlost", onContextLost), [onContextLost]);

  return (
    <Canvas
      flat
      shadows
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 40, near: 0.5, far: 300, position: [0, 36, 34] }}
      onCreated={({ gl }) => {
        canvas.current = gl.domElement;
        gl.domElement.addEventListener("webglcontextlost", onContextLost);
      }}
      aria-label="家园食堂二层 3D 空间"
    >
      <color attach="background" args={["#F6F2EC"]} />
      <ambientLight intensity={2.1} />
      <directionalLight
        position={[12, 30, 14]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-far={70}
      />
      <Hall />
      {stalls.map((stall) => (
        <StallBooth key={stall.id} stall={stall} selected={stall.id === selectedId} onSelect={(id) => void selectStall(id)} />
      ))}
      <CameraRig />
    </Canvas>
  );
}
