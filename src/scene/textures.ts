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

function seeded(seed: number): () => number {
  let x = seed;
  return () => {
    x = (x * 16807) % 2147483647;
    return x / 2147483647;
  };
}

const cache = new Map<string, THREE.CanvasTexture>();

/** 贴图只画一次。场景重建时直接复用 */
function cached(key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);
  const texture = makeTexture(canvas);
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  cache.set(key, texture);
  return texture;
}

/** 水磨石地砖 */
export function floorTexture(): THREE.CanvasTexture {
  return cached(
    "floor",
    256,
    256,
    (ctx) => {
      const rng = seeded(42);
      ctx.fillStyle = "#D8CFC1";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 420; i++) {
        ctx.fillStyle = ["#C5BAAA", "#E8E1D6", "#B3A796", "#F2EDE5"][i % 4];
        ctx.fillRect(rng() * 256, rng() * 256, 1 + rng() * 3, 1 + rng() * 3);
      }
      ctx.strokeStyle = "#B7AC9B";
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, 256, 256);
    },
    [20, 14],
  );
}

/** 就餐区的木地板 */
export function woodFloorTexture(): THREE.CanvasTexture {
  return cached(
    "wood-floor",
    256,
    256,
    (ctx) => {
      const rng = seeded(7);
      const rows = 4;
      const rowHeight = 256 / rows;
      for (let row = 0; row < rows; row++) {
        const offset = row % 2 ? -64 : 0;
        for (let i = 0; i < 3; i++) {
          const shade = 165 + Math.floor(rng() * 24);
          ctx.fillStyle = `rgb(${shade + 28},${shade - 4},${shade - 48})`;
          ctx.fillRect(offset + i * 128, row * rowHeight, 128, rowHeight);
          ctx.strokeStyle = "rgba(92,62,32,.45)";
          ctx.lineWidth = 2;
          ctx.strokeRect(offset + i * 128, row * rowHeight, 128, rowHeight);
        }
      }
    },
    [6, 3],
  );
}

export function tileTexture(repeatX: number, repeatY: number): THREE.CanvasTexture {
  return cached(
    `tile:${repeatX}:${repeatY}`,
    64,
    64,
    (ctx) => {
      ctx.fillStyle = "#F3F1EC";
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = "#C9C6BE";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, 64, 64);
    },
    [repeatX, repeatY],
  );
}

/** 雨棚条纹。灰度贴图乘上热力色，所以 0 分时仍然接近白色 */
export function awningTexture(): THREE.CanvasTexture {
  return cached("awning", 256, 16, (ctx) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? "#FFFFFF" : "#D9D9D9";
      ctx.fillRect(i * 32, 0, 32, 16);
    }
  });
}

export function windowTexture(): THREE.CanvasTexture {
  return cached("window", 512, 160, (ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, 160);
    sky.addColorStop(0, "#A9D6EE");
    sky.addColorStop(1, "#E9F6FB");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 160);
    const rng = seeded(11);
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 ? "#7FA87F" : "#6C9A76";
      ctx.beginPath();
      ctx.arc(i * 34 + rng() * 14, 150, 24 + rng() * 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#F7F4EE";
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, 512, 160);
    for (const x of [128, 256, 384]) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 160);
      ctx.stroke();
    }
  });
}

export function menuTexture(cuisine: string): THREE.CanvasTexture {
  return cached(`menu:${cuisine}`, 256, 340, (ctx) => {
    ctx.fillStyle = "#2F3A36";
    ctx.fillRect(0, 0, 256, 340);
    ctx.strokeStyle = "#B08A5A";
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 244, 328);
    ctx.fillStyle = "#F4EFE0";
    ctx.textAlign = "center";
    ctx.font = `800 44px ${FONT}`;
    ctx.fillText("今日供应", 128, 72);
    ctx.font = `700 34px ${FONT}`;
    ctx.fillStyle = "#F2D58A";
    ctx.fillText(cuisine, 128, 124);
    ctx.fillStyle = "rgba(244,239,224,.75)";
    for (let i = 0; i < 5; i++) ctx.fillRect(44, 160 + i * 32, i % 2 ? 130 : 168, 8);
  });
}

export function signTexture(text: string, background: string, ink: string): THREE.CanvasTexture {
  return cached(`sign:${text}:${background}`, 1024, 160, (ctx) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1024, 160);
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let size = 96;
    ctx.font = `800 ${size}px ${FONT}`;
    const width = ctx.measureText(text).width;
    if (width > 960) {
      size = Math.floor((size * 960) / width);
      ctx.font = `800 ${size}px ${FONT}`;
    }
    ctx.fillText(text, 512, 84);
  });
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
