// 多重アウトライン文字の描画ロジック（プロトタイプ index.html から移植）

export type LineJoin = "round" | "miter" | "bevel";
export type TextAlign = "left" | "center" | "right";

export type OutlineLayer = {
  /** この層の太さ（px、等倍時） */
  width: number;
  /** #rrggbb */
  color: string;
};

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
  fill: string;
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
  const font = `${s.fontWeight} ${size}px "${s.fontFamily}"`;

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

  ctx.fillStyle = s.fill;
  eachLine((t, x, y) => ctx.fillText(t, x, y));

  return { width: W, height: H };
}

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
