type Rgb = [number, number, number];

const STOPS: [number, Rgb][] = [
  [0, [255, 255, 255]],
  [2.5, [253, 187, 132]],
  [4, [239, 74, 50]],
  [5, [179, 0, 0]],
];

function toHex([r, g, b]: Rgb): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function heatColor(score: number): string {
  const s = Math.min(5, Math.max(0, score));
  for (let i = 1; i < STOPS.length; i++) {
    const [s0, c0] = STOPS[i - 1];
    const [s1, c1] = STOPS[i];
    if (s <= s1) {
      const t = (s - s0) / (s1 - s0);
      return toHex([c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t]);
    }
  }
  return toHex(STOPS[STOPS.length - 1][1]);
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

const INK = "#241F1C";
const PAPER = "#FFFFFF";

export function readableTextColor(background: string): string {
  const bg = luminance(background);
  const onPaper = (luminance(PAPER) + 0.05) / (bg + 0.05);
  const onInk = (bg + 0.05) / (luminance(INK) + 0.05);
  return onPaper > onInk ? PAPER : INK;
}

export const HEAT_GRADIENT_CSS = `linear-gradient(90deg, ${STOPS.map(
  ([s, c]) => `${toHex(c)} ${(s / 5) * 100}%`,
).join(", ")})`;
