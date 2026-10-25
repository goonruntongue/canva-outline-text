// 多重アウトライン文字の描画ロジック（プロトタイプ index.html から移植）

export type LineJoin = "round" | "miter" | "bevel";
export type TextAlign = "left" | "center" | "right";

export type OutlineLayer = {
  /** この層の太さ（px、等倍時） */
  width: number;
  /** #rrggbb */
  color: string;
};

export type GradientStop = {
  /** 位置（0〜100%） */
  offset: number;
  /** #rrggbb */
  color: string;
};

export type FillGradient = {
  type: "linear" | "radial";
  /** 線形のときの向き（度）。0° は左→右、90° は上→下 */
  angle: number;
  stops: GradientStop[];
};

export type FillMode = "solid" | "gradient";

export type OutlineSettings = {
  text: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  /** 字間（em の 1/100） */
  tracking: number;
  /** 行間（%） */
  leading: number;
  align: TextAlign;
  /** 単色の塗り（#rrggbb） */
  fill: string;
  /** 塗りの種類。古い保存データには無いので、無ければ単色として扱う */
  fillMode?: FillMode;
  fillGradient?: FillGradient;
  join: LineJoin;
  /** 内側→外側の順 */
  layers: OutlineLayer[];
};

/**
 * canvas に縁取り文字を描画して、等倍時の幅と高さを返す。
 * scale は書き出し倍率（プレビューでは devicePixelRatio など）。
 */
export function renderOutlineText(
  canvas: HTMLCanvasElement,
  s: OutlineSettings,
  scale: number,
): { width: number; height: number } {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is not available");
  }

  const lines = s.text.split("\n");
  const size = s.fontSize;
  const letterSpacing = `${(s.tracking / 100) * size}px`;
  const totalOutline = s.layers.reduce((sum, l) => sum + l.width, 0);
  const pad = totalOutline + Math.ceil(size * 0.1);
  // フォントが読み込めなかったときは、システムの太字ゴシックで代用する
  const font = `${s.fontWeight} ${size}px "${s.fontFamily}", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif`;

  const applyFont = () => {
    ctx.font = font;
    if ("letterSpacing" in ctx) {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
        letterSpacing;
    }
  };

  applyFont();
  const metrics = lines.map((t) => ctx.measureText(t || " "));
  const ascent = Math.max(
    ...metrics.map((m) => m.actualBoundingBoxAscent || size * 0.88),
    size * 0.5,
  );
  const descent = Math.max(
    ...metrics.map((m) => m.actualBoundingBoxDescent || size * 0.12),
    size * 0.1,
  );
  const lineH = size * (s.leading / 100);
  const maxW = Math.max(...metrics.map((m) => m.width), 1);

  const contentH = ascent + descent + lineH * (lines.length - 1);
  const W = Math.ceil(maxW + pad * 2);
  const H = Math.ceil(contentH + pad * 2);

  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W, H);
  applyFont();
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = s.join;
  ctx.lineCap = s.join === "round" ? "round" : "butt";
  ctx.miterLimit = 10;

  const xFor = (w: number) =>
    s.align === "left" ? pad : s.align === "right" ? W - pad - w : (W - w) / 2;

  const eachLine = (fn: (t: string, x: number, y: number) => void) =>
    lines.forEach((t, i) =>
      fn(t, xFor(metrics[i]?.width ?? 0), pad + ascent + lineH * i),
    );

  // 外側の層から順に描く。各層の線幅は「その層までの累計太さ×2」。
  for (let i = s.layers.length - 1; i >= 0; i--) {
    const layer = s.layers[i];
    if (!layer) continue;
    const cumulative = s.layers
      .slice(0, i + 1)
      .reduce((sum, l) => sum + l.width, 0);
    ctx.lineWidth = cumulative * 2;
    ctx.strokeStyle = layer.color;
    eachLine((t, x, y) => ctx.strokeText(t, x, y));
  }

  ctx.fillStyle =
    s.fillMode === "gradient" && s.fillGradient
      ? makeGradient(
          ctx,
          s.fillGradient,
          textBounds(lines.length, metrics, xFor, pad, contentH),
        )
      : s.fill;
  eachLine((t, x, y) => ctx.fillText(t, x, y));

  return { width: W, height: H };
}

type Box = { x: number; y: number; w: number; h: number };

/** 文字が占める範囲（グラデーションをこの範囲に合わせて掛ける） */
function textBounds(
  count: number,
  metrics: TextMetrics[],
  xFor: (w: number) => number,
  pad: number,
  contentH: number,
): Box {
  let left = Infinity;
  let right = -Infinity;
  for (let i = 0; i < count; i++) {
    const w = metrics[i]?.width ?? 0;
    const x = xFor(w);
    left = Math.min(left, x);
    right = Math.max(right, x + w);
  }
  if (!Number.isFinite(left) || right <= left) {
    left = pad;
    right = pad + 1;
  }
  return { x: left, y: pad, w: right - left, h: Math.max(contentH, 1) };
}

function makeGradient(
  ctx: CanvasRenderingContext2D,
  g: FillGradient,
  b: Box,
): CanvasGradient {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  let grad: CanvasGradient;
  if (g.type === "radial") {
    // CSS の farthest-corner と同じく、中心から角までを半径にする
    const r = Math.hypot(b.w / 2, b.h / 2);
    grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  } else {
    // CSS の linear-gradient と同じく、角度に応じて範囲全体を覆う長さにする
    const rad = (g.angle * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const half = (Math.abs(b.w * dx) + Math.abs(b.h * dy)) / 2;
    grad = ctx.createLinearGradient(
      cx - dx * half,
      cy - dy * half,
      cx + dx * half,
      cy + dy * half,
    );
  }
  for (const stop of sortStops(g.stops)) {
    grad.addColorStop(Math.min(Math.max(stop.offset, 0), 100) / 100, stop.color);
  }
  return grad;
}

export const sortStops = (stops: GradientStop[]): GradientStop[] =>
  [...stops].sort((a, b) => a.offset - b.offset);

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m?.[1] ? parseInt(m[1], 16) : 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbToHex = (r: number, g: number, b: number) =>
  "#" +
  [r, g, b]
    .map((v) => Math.round(v).toString(16).padStart(2, "0"))
    .join("");

/** グラデーションの、ある位置（0〜100）の色を求める（中間点の追加用） */
export function colorAt(stops: GradientStop[], offset: number): string {
  const sorted = sortStops(stops);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return "#000000";
  if (offset <= first.offset) return first.color;
  if (offset >= last.offset) return last.color;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (!a || !b) continue;
    if (offset >= a.offset && offset <= b.offset) {
      const t = b.offset === a.offset ? 0 : (offset - a.offset) / (b.offset - a.offset);
      const ca = hexToRgb(a.color);
      const cb = hexToRgb(b.color);
      return rgbToHex(
        ca[0] + (cb[0] - ca[0]) * t,
        ca[1] + (cb[1] - ca[1]) * t,
        ca[2] + (cb[2] - ca[2]) * t,
      );
    }
  }
  return last.color;
}

/** プレビュー用の CSS（グラデーションバーに使う。常に左→右） */
export const gradientCss = (stops: GradientStop[]) =>
  `linear-gradient(90deg, ${sortStops(stops)
    .map((st) => `${st.color} ${st.offset}%`)
    .join(", ")})`;

export const DEFAULT_GRADIENT: FillGradient = {
  type: "linear",
  angle: 90,
  stops: [
    { offset: 0, color: "#fff27a" },
    { offset: 100, color: "#ff7ab6" },
  ],
};

export const PRESETS: Record<"pop" | "candy" | "mono", { layers: OutlineLayer[] }> =
  {
    pop: {
      layers: [
        { width: 10, color: "#ff3d7f" },
        { width: 8, color: "#ffffff" },
        { width: 10, color: "#2b2b8f" },
      ],
    },
    candy: {
      layers: [
        { width: 8, color: "#ff8fb1" },
        { width: 6, color: "#fff3a6" },
        { width: 6, color: "#8fd6ff" },
        { width: 8, color: "#5b3b8c" },
      ],
    },
    mono: {
      layers: [
        { width: 12, color: "#111111" },
        { width: 6, color: "#ffffff" },
        { width: 4, color: "#111111" },
      ],
    },
  };
