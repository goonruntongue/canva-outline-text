import { useFeatureSupport, useSelection } from "@canva/app-hooks";
import {
  Alert,
  Button,
  Column,
  Columns,
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
import { addElementAtCursor, addElementAtPoint } from "@canva/design";
import { useEffect, useRef, useState } from "react";
import * as styles from "styles/components.css";
import { ensureFont, FONTS } from "./fonts";
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

  const selection = useSelection("plaintext");
  const isSupported = useFeatureSupport();
  const addElement = [addElementAtPoint, addElementAtCursor].find((fn) =>
    isSupported(fn),
  );

  const update = (patch: Partial<OutlineSettings>) =>
    setS((prev) => ({ ...prev, ...patch }));

  const updateLayer = (index: number, patch: Partial<OutlineLayer>) =>
    setS((prev) => ({
      ...prev,
      layers: prev.layers.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }));

  const currentFont =
    FONTS.find(
      (f) => f.family === s.fontFamily && f.weight === s.fontWeight,
    ) ?? DEFAULT_FONT;

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
      } catch {
        if (!cancelled) {
          setError("フォントの読み込みに失敗しました。通信環境を確認してください。");
        }
      }
    };
    draw();
    return () => {
      cancelled = true;
    };
  }, [s, currentFont]);

  const loadSelection = async () => {
    const draft = await selection.read();
    const text = draft.contents.map((c) => c.text).join("\n");
    if (text) update({ text });
  };

  const insert = async () => {
    if (!addElement) return;
    setInserting(true);
    setError(undefined);
    try {
      await ensureFont(currentFont, s.text);
      const canvas = document.createElement("canvas");
      renderOutlineText(canvas, s, Number(exportScale));
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

      await addElement({
        type: "image",
        ref: asset.ref,
        altText: { text: s.text.replace(/\n/g, " "), decorative: false },
      });
      await asset.whenUploaded();
    } catch {
      setError("デザインへの追加に失敗しました。もう一度お試しください。");
    } finally {
      setInserting(false);
    }
  };

  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="2u">
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
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>

        {error && <Alert tone="critical">{error}</Alert>}

        <Button
          variant="primary"
          stretch
          onClick={insert}
          loading={inserting}
          disabled={!addElement || !s.text.trim()}
        >
          デザインに追加
        </Button>

        <Title size="small">テキスト</Title>
        <FormField
          label="文字"
          value={s.text}
          control={(props) => (
            <MultilineInput
              {...props}
              minRows={2}
              autoGrow
              onChange={(value) => update({ text: value })}
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
              options={FONTS.map((f) => ({
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
