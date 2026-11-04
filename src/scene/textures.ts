import * as THREE from "three";
import { readableTextColor } from "../domain/heat";

const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Noto Sans SC",sans-serif';

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function bannerTexture(name: string, score: number, color: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 200;
  const ctx = canvas.getContext("2d")!;
  const text = readableTextColor(color);

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#241F1C";
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  ctx.fillStyle = text;
  ctx.textBaseline = "middle";
  const scoreText = score > 0 ? `★${score.toFixed(1)}` : "暂无评分";
  ctx.font = `700 ${score > 0 ? 76 : 50}px ${FONT}`;
  const scoreWidth = ctx.measureText(scoreText).width;
  ctx.textAlign = "right";
  ctx.fillText(scoreText, canvas.width - 40, 104);

  // 名字按可用宽度缩放，长名字也不会压到分数
  const available = canvas.width - scoreWidth - 110;
  let size = 112;
  ctx.font = `800 ${size}px ${FONT}`;
  const width = ctx.measureText(name).width;
  if (width > available) {
    size = Math.floor((size * available) / width);
    ctx.font = `800 ${size}px ${FONT}`;
  }
  ctx.textAlign = "left";
  ctx.fillText(name, 40, 104);

  return makeTexture(canvas);
}

let floor: THREE.CanvasTexture | null = null;
export function floorTexture(): THREE.CanvasTexture {
  if (floor) return floor;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#B9B1A7";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#A69D92";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 128, 128);
  floor = makeTexture(canvas);
  floor.wrapS = floor.wrapT = THREE.RepeatWrapping;
  floor.repeat.set(20, 14);
  return floor;
}

let glow: THREE.CanvasTexture | null = null;
export function glowTexture(): THREE.CanvasTexture {
  if (glow) return glow;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  glow = makeTexture(canvas);
  return glow;
}

export function floorLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#241F1C";
  ctx.font = `700 60px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 50);
  return makeTexture(canvas);
}
