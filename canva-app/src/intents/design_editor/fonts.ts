// Google Fonts の日本語フォントを読み込む。
// Canva アプリの iframe では外部 CSS（<link rel="stylesheet">）を読めないため、
// CSS を fetch して @font-face を解析し、FontFace API で登録する。
// 日本語フォントは unicode-range ごとに分割されているので、
// document.fonts.load() で実際に使う文字の分だけがダウンロードされる。

export type FontDef = {
  label: string;
  family: string;
  weight: number;
};

export const FONTS: FontDef[] = [
  { label: "Dela Gothic One", family: "Dela Gothic One", weight: 400 },
  { label: "M PLUS Rounded 1c", family: "M PLUS Rounded 1c", weight: 800 },
  { label: "Zen Maru Gothic", family: "Zen Maru Gothic", weight: 900 },
  { label: "Noto Sans JP", family: "Noto Sans JP", weight: 900 },
  { label: "RocknRoll One", family: "RocknRoll One", weight: 400 },
  { label: "Mochiy Pop One", family: "Mochiy Pop One", weight: 400 },
  { label: "Kosugi Maru", family: "Kosugi Maru", weight: 400 },
];

const registered = new Map<string, Promise<void>>();

async function registerFontFaces(f: FontDef): Promise<void> {
  const familyParam = f.family.split(" ").map(encodeURIComponent).join("+");
  const url = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${f.weight}&display=swap`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load font CSS: ${res.status}`);
  }
  const css = await res.text();
  const blocks = css.match(/@font-face\s*{[^}]*}/g) ?? [];
  for (const block of blocks) {
    const src = /src:\s*url\(([^)]+)\)/.exec(block)?.[1];
    if (!src) continue;
    const unicodeRange = /unicode-range:\s*([^;]+);/.exec(block)?.[1]?.trim();
    const face = new FontFace(f.family, `url(${src})`, {
      weight: String(f.weight),
      ...(unicodeRange ? { unicodeRange } : {}),
    });
    document.fonts.add(face);
  }
}

/** フォントを登録し、text の描画に必要な分を読み込み終えるまで待つ */
export async function ensureFont(f: FontDef, text: string): Promise<void> {
  if (isCustomFont(f.family)) {
    if (!customFaces.has(f.family)) {
      throw new MissingCustomFontError(f.family);
    }
    return;
  }
  const key = `${f.family}:${f.weight}`;
  let p = registered.get(key);
  if (!p) {
    p = registerFontFaces(f);
    registered.set(key, p);
    p.catch(() => registered.delete(key));
  }
  await p;
  await document.fonts.load(`${f.weight} 40px "${f.family}"`, text || "あ");
}

// ---- 手持ちのフォントファイル（.ttf / .otf / .woff / .woff2）----
// フォントのデータは要素に保存できない（上限 5KB）ため、
// 再編集時には同じファイルをもう一度読み込んでもらう。

export const CUSTOM_PREFIX = "custom:";
const customFaces = new Map<string, FontFace>();

export class MissingCustomFontError extends Error {}

export const isCustomFont = (family: string) =>
  family.startsWith(CUSTOM_PREFIX);

export const customFontLabel = (family: string) =>
  family.slice(CUSTOM_PREFIX.length);

export const isCustomFontLoaded = (family: string) => customFaces.has(family);

export async function registerCustomFont(file: File): Promise<FontDef> {
  const base = file.name
    .replace(/\.(ttf|otf|woff2?)$/i, "")
    .replace(/[|"\\]/g, "_");
  const family = `${CUSTOM_PREFIX}${base}`;
  const face = new FontFace(family, await file.arrayBuffer(), {
    weight: "400",
  });
  await face.load();
  const old = customFaces.get(family);
  if (old) document.fonts.delete(old);
  document.fonts.add(face);
  customFaces.set(family, face);
  return { label: base, family, weight: 400 };
}
