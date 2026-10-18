import { useSelection } from "@canva/app-hooks";
import {
  Alert,
  Button,
  Column,
  Columns,
  FileInput,
  FormField,
  MultilineInput,
  Rows,
  SegmentedControl,
  Select,
  Slider,
  Swatch,
  Text,
  Title,
} from "@canva/app-ui-kit";
import type {
  Anchor,
  ColorSelectionEvent,
  ColorSelectionScope,
} from "@canva/asset";
import { openColorSelector, upload } from "@canva/asset";
import type { AppElementOptions, ImageRef } from "@canva/design";
import { initAppElement } from "@canva/design";
import { useEffect, useRef, useState } from "react";
import * as styles from "styles/components.css";
import type { FontDef } from "./fonts";
import {
  customFontLabel,
  ensureFont,
  FONTS,
  isCustomFont,
  isCustomFontLoaded,
  MissingCustomFontError,
  registerCustomFont,
} from "./fonts";
import type {
  LineJoin,
  OutlineLayer,
  OutlineSettings,
  TextAlign,
} from "./outline_render";
import { PRESETS, renderOutlineText } from "./outline_render";

const DEFAULT_FONT = FONTS[0]!;

const INITIAL: OutlineSettings = {
  text: "ふちどり\n文字",
  fontFamily: DEFAULT_FONT.family,
  fontWeight: DEFAULT_FONT.weight,
  fontSize: 140,
  tracking: 0,
  leading: 115,
  align: "center",
  fill: "#ffffff",
  join: "round",
  layers: PRESETS.pop!.layers.map((l) => ({ ...l })),
};

// 再編集用に App Element に保存するデータ（上限 5KB）
type ElementData = {
  /** OutlineSettings と画質を JSON 文字列で保存 */
  settings: string;
  imageRef: string;
  width: number;
  height: number;
  altText: string;
};

type SavedSettings = OutlineSettings & { exportScale: string };

const MAX_TEXT_LENGTH = 500;

// 要素の中身は、アップロード済み画像 1 枚
const appElementClient = initAppElement<ElementData>({
  render: (data) => [
    {
      type: "image",
      ref: data.imageRef as ImageRef,
      top: 0,
      left: 0,
      width: data.width,
      height: data.height,
      altText: { text: data.altText, decorative: false },
    },
  ],
});

type UpdateFn = (opts: AppElementOptions<ElementData>) => Promise<void>;

const pickColor = (anchor: Anchor, onPick: (hex: string) => void) => {
  openColorSelector(anchor, {
    scopes: ["solid"],
    onColorSelect: <T extends ColorSelectionScope>(e: ColorSelectionEvent<T>) => {
      if (e.selection.type === "solid") {
        onPick(e.selection.hexString);
      }
    },
  });
};

const SliderRow = (props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) => (
  <Rows spacing="0.5u">
    <Columns spacing="1u" alignY="center">
      <Column>
        <Text size="small">{props.label}</Text>
      </Column>
      <Column width="containedContent">
        <Text size="small" tone="tertiary">
          {props.value}
          {props.suffix ?? ""}
        </Text>
      </Column>
    </Columns>
    <Slider
      min={props.min}
      max={props.max}
      step={props.step ?? 1}
      value={props.value}
      onChange={props.onChange}
    />
  </Rows>
);

export const App = () => {
  const [s, setS] = useState<OutlineSettings>(INITIAL);
  const [exportScale, setExportScale] = useState<string>("2");
  const [error, setError] = useState<string | undefined>();
  const [inserting, setInserting] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  // 既存の要素を選択中なら、その要素を更新する関数が入る
  const [updateElement, setUpdateElement] = useState<UpdateFn | undefined>();

  const selection = useSelection("plaintext");

  // デザイン上で、このアプリで作った要素が選ばれたら設定を読み込む
  useEffect(() => {
    appElementClient.registerOnElementChange((appElement) => {
      if (!appElement) {
        setUpdateElement(undefined);
        return;
      }
      try {
        const saved = JSON.parse(appElement.data.settings) as SavedSettings;
        const { exportScale: savedScale, ...settings } = saved;
        setS(settings);
        setExportScale(savedScale || "2");
      } catch {
        // 読めないデータは無視して、現在の設定のまま更新できるようにする
      }
      setUpdateElement(() => appElement.update);
    });
  }, []);

  const update = (patch: Partial<OutlineSettings>) =>
    setS((prev) => ({ ...prev, ...patch }));

  const updateLayer = (index: number, patch: Partial<OutlineLayer>) =>
    setS((prev) => ({
      ...prev,
      layers: prev.layers.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }));

  // 読み込んだフォントファイル（このセッション中だけ有効）
  const [customFonts, setCustomFonts] = useState<FontDef[]>([]);

  const fontOptions: FontDef[] = [...FONTS, ...customFonts];
  // 再編集で、まだ読み込まれていない手持ちフォントが指定されている場合
  const missingCustom =
    isCustomFont(s.fontFamily) && !isCustomFontLoaded(s.fontFamily);
  if (missingCustom) {
    fontOptions.push({
      label: `${customFontLabel(s.fontFamily)}（未読み込み）`,
      family: s.fontFamily,
      weight: s.fontWeight,
    });
  }

  const currentFont =
    fontOptions.find(
      (f) => f.family === s.fontFamily && f.weight === s.fontWeight,
    ) ?? DEFAULT_FONT;

  const fontErrorMessage = (e: unknown) =>
    e instanceof MissingCustomFontError
      ? `フォント「${customFontLabel(s.fontFamily)}」が読み込まれていません。同じフォントファイルをもう一度読み込んでください。`
      : "フォントの読み込みに失敗しました。通信環境を確認してください。";

  const loadFontFile = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      const font = await registerCustomFont(file);
      setCustomFonts((prev) => [
        ...prev.filter((f) => f.family !== font.family),
        font,
      ]);
      update({ fontFamily: font.family, fontWeight: font.weight });
      setError(undefined);
    } catch {
      setError("このフォントファイルは読み込めませんでした。");
    }
  };

  // プレビュー描画
  useEffect(() => {
    let cancelled = false;
    const draw = async () => {
      try {
        await ensureFont(currentFont, s.text);
        if (cancelled || !previewRef.current) return;
        renderOutlineText(
          previewRef.current,
          s,
          Math.min(window.devicePixelRatio || 1, 2),
        );
        setError(undefined);
      } catch (e) {
        if (!cancelled) {
          setError(fontErrorMessage(e));
        }
      }
    };
    draw();
    return () => {
      cancelled = true;
    };
    // customFonts: フォント読み込み後に描き直すため
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, currentFont.family, currentFont.weight, customFonts]);

  const loadSelection = async () => {
    const draft = await selection.read();
    const text = draft.contents.map((c) => c.text).join("\n");
    if (text) update({ text });
  };

  const insert = async () => {
    setInserting(true);
    setError(undefined);
    try {
      await ensureFont(currentFont, s.text);
      const canvas = document.createElement("canvas");
      const { width, height } = renderOutlineText(
        canvas,
        s,
        Number(exportScale),
      );
      const dataUrl = canvas.toDataURL("image/png");

      const asset = await upload({
        type: "image",
        mimeType: "image/png",
        url: dataUrl,
        thumbnailUrl: dataUrl,
        width: canvas.width,
        height: canvas.height,
        aiDisclosure: "none",
      });

      const saved: SavedSettings = { ...s, exportScale };
      const data: ElementData = {
        settings: JSON.stringify(saved),
        imageRef: asset.ref,
        width,
        height,
        altText: s.text.replace(/\n/g, " ").slice(0, 100),
      };

      if (updateElement) {
        await updateElement({ data });
      } else {
        await appElementClient.addElement({ data });
      }
      await asset.whenUploaded();
    } catch (e) {
      setError(
        e instanceof MissingCustomFontError
          ? fontErrorMessage(e)
          : updateElement
          ? "要素の更新に失敗しました。もう一度お試しください。"
          : "デザインへの追加に失敗しました。もう一度お試しください。",
      );
    } finally {
      setInserting(false);
    }
  };

  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="2u">
        {/* プレビューとボタンは、スクロールしても上に固定 */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "var(--ui-kit-elevation-surface-bg)",
            paddingBottom: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
        <div
          style={{
            borderRadius: 8,
            padding: 8,
            backgroundColor: "#e9e7e2",
            backgroundImage:
              "linear-gradient(45deg,#d6d3cc 25%,transparent 25%),linear-gradient(-45deg,#d6d3cc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d6d3cc 75%),linear-gradient(-45deg,transparent 75%,#d6d3cc 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <canvas
            ref={previewRef}
            style={{
              maxWidth: "100%",
              maxHeight: 180,
              width: "auto",
              height: "auto",
            }}
          />
        </div>

        {error && <Alert tone="critical">{error}</Alert>}

        {updateElement && (
          <Alert tone="info">
            選択中の縁取り文字を編集しています。変更したら「更新」を押してください。
          </Alert>
        )}
        <Button
          variant="primary"
          stretch
          onClick={insert}
          loading={inserting}
          disabled={!s.text.trim()}
        >
          {updateElement ? "選択中の要素を更新" : "デザインに追加"}
        </Button>
        </div>

        <Title size="small">テキスト</Title>
        <FormField
          label="文字"
          value={s.text}
          control={(props) => (
            <MultilineInput
              {...props}
              minRows={2}
              autoGrow
              maxLength={MAX_TEXT_LENGTH}
              onChange={(value) => update({ text: value.slice(0, MAX_TEXT_LENGTH) })}
            />
          )}
        />
        <Button
          variant="secondary"
          stretch
          onClick={loadSelection}
          disabled={selection.count === 0}
        >
          選択中のテキストを読み込む
        </Button>

        <FormField
          label="フォント"
          value={`${s.fontFamily}|${s.fontWeight}`}
          control={(props) => (
            <Select
              {...props}
              stretch
              options={fontOptions.map((f) => ({
                value: `${f.family}|${f.weight}`,
                label: f.label,
              }))}
              onChange={(v: string) => {
                const [family, weight] = v.split("|");
                update({ fontFamily: family, fontWeight: Number(weight) });
              }}
            />
          )}
        />
        <Text size="small" tone="tertiary">
          手持ちのフォントファイル（.ttf / .otf / .woff / .woff2）も使えます。
          読み込んだフォントは、アプリを開いている間だけ有効です。
        </Text>
        <FileInput
          accept={[".ttf", ".otf", ".woff", ".woff2"]}
          stretchButton
          onDropAcceptedFiles={loadFontFile}
          onDropRejectedFiles={() =>
            setError("フォントファイル（.ttf / .otf / .woff / .woff2）を選んでください。")
          }
        />
        <SliderRow
          label="サイズ"
          value={s.fontSize}
          min={24}
          max={300}
          onChange={(v) => update({ fontSize: v })}
        />
        <SliderRow
          label="字間"
          value={s.tracking}
          min={-40}
          max={80}
          onChange={(v) => update({ tracking: v })}
        />
        <SliderRow
          label="行間"
          value={s.leading}
          min={80}
          max={200}
          suffix="%"
          onChange={(v) => update({ leading: v })}
        />
        <SegmentedControl
          value={s.align}
          onChange={(v: TextAlign) => update({ align: v })}
          options={[
            { value: "left", label: "左" },
            { value: "center", label: "中央" },
            { value: "right", label: "右" },
          ]}
        />
        <Columns spacing="1u" alignY="center">
          <Column>
            <Text size="small">文字色</Text>
          </Column>
          <Column width="containedContent">
            <Swatch
              fill={[s.fill]}
              onClick={(e) =>
                pickColor(e.currentTarget.getBoundingClientRect(), (hex) =>
                  update({ fill: hex }),
                )
              }
            />
          </Column>
        </Columns>

        <Title size="small">角の結合</Title>
        <SegmentedControl
          value={s.join}
          onChange={(v: LineJoin) => update({ join: v })}
          options={[
            { value: "round", label: "ラウンド" },
            { value: "miter", label: "マイター" },
            { value: "bevel", label: "ベベル" },
          ]}
        />

        <Title size="small">アウトライン（上が内側）</Title>
        {s.layers.map((layer, i) => (
          <Rows spacing="0.5u" key={i}>
            <Columns spacing="1u" alignY="center">
              <Column width="containedContent">
                <Swatch
                  fill={[layer.color]}
                  onClick={(e) =>
                    pickColor(e.currentTarget.getBoundingClientRect(), (hex) =>
                      updateLayer(i, { color: hex }),
                    )
                  }
                />
              </Column>
              <Column>
                <Text size="small">
                  {i + 1}層目 · 太さ {layer.width}
                </Text>
              </Column>
              <Column width="containedContent">
                <Button
                  variant="tertiary"
                  onClick={() =>
                    setS((prev) => ({
                      ...prev,
                      layers: prev.layers.filter((_, j) => j !== i),
                    }))
                  }
                >
                  削除
                </Button>
              </Column>
            </Columns>
            <Slider
              min={1}
              max={60}
              step={1}
              value={layer.width}
              onChange={(v: number) => updateLayer(i, { width: v })}
            />
          </Rows>
        ))}
        <Button
          variant="secondary"
          stretch
          onClick={() =>
            setS((prev) => {
              const last = prev.layers[prev.layers.length - 1];
              return {
                ...prev,
                layers: [
                  ...prev.layers,
                  { width: last ? last.width : 8, color: "#000000" },
                ],
              };
            })
          }
        >
          ＋ 外側に追加
        </Button>
        <Columns spacing="1u">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <Column key={key}>
              <Button
                variant="secondary"
                stretch
                onClick={() =>
                  update({ layers: preset.layers.map((l) => ({ ...l })) })
                }
              >
                {preset.label}
              </Button>
            </Column>
          ))}
        </Columns>

        <Title size="small">画質</Title>
        <SegmentedControl
          value={exportScale}
          onChange={(v: string) => setExportScale(v)}
          options={[
            { value: "1", label: "標準" },
            { value: "2", label: "高" },
            { value: "3", label: "最高" },
          ]}
        />
      </Rows>
    </div>
  );
};
