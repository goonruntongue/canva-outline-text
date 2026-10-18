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
