// グラデーションの編集（カラーストップの追加・移動・色変更・削除、種類と角度）
import {
  Button,
  Column,
  Columns,
  Rows,
  SegmentedControl,
  Slider,
  Swatch,
  Text,
} from "@canva/app-ui-kit";
import type { Anchor } from "@canva/asset";
import type { KeyboardEvent, PointerEvent } from "react";
import { useRef, useState } from "react";
import { useIntl } from "react-intl";
import { messages } from "./messages";
import type { FillGradient, GradientStop } from "./outline_render";
import { colorAt, gradientCss, sortStops } from "./outline_render";

export const MAX_STOPS = 8;
const MIN_STOPS = 2;

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

export const GradientEditor = (props: {
  value: FillGradient;
  onChange: (g: FillGradient) => void;
  pickColor: (anchor: Anchor, onPick: (hex: string) => void) => void;
}) => {
  const { value: g, onChange, pickColor } = props;
  const t = useIntl().formatMessage;
  const barRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const [dragging, setDragging] = useState<number | undefined>();

  const sel = clamp(selected, 0, g.stops.length - 1);
  const selStop = g.stops[sel];

  const setStops = (stops: GradientStop[]) => onChange({ ...g, stops });
  const updateStop = (index: number, patch: Partial<GradientStop>) =>
    setStops(g.stops.map((st, i) => (i === index ? { ...st, ...patch } : st)));

  const offsetFromPointer = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.round(clamp(((clientX - rect.left) / rect.width) * 100, 0, 100));
  };

  const addStopAt = (offset: number) => {
    if (g.stops.length >= MAX_STOPS) return undefined;
    const stops = [...g.stops, { offset, color: colorAt(g.stops, offset) }];
    setStops(stops);
    const index = stops.length - 1;
    setSelected(index);
    return index;
  };

  // いちばん広いすき間の真ん中に追加する（ボタン・キーボード操作用）
  const addStopInGap = () => {
    const sorted = sortStops(g.stops);
    let best = { at: 50, gap: -1 };
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a && b && b.offset - a.offset > best.gap) {
        best = { at: Math.round((a.offset + b.offset) / 2), gap: b.offset - a.offset };
      }
    }
    addStopAt(best.at);
  };

  const removeStop = (index: number) => {
    if (g.stops.length <= MIN_STOPS) return;
    setStops(g.stops.filter((_, i) => i !== index));
    setSelected(clamp(index - 1, 0, g.stops.length - 2));
  };

  // バーの何もない所を押したら、その位置にストップを追加してそのままドラッグできるようにする
  const onBarPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const index = addStopAt(offsetFromPointer(e.clientX));
    if (index !== undefined) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(index);
    }
  };

  const onHandlePointerDown = (
    e: PointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    e.preventDefault();
    e.currentTarget.focus();
    barRef.current?.setPointerCapture(e.pointerId);
    setSelected(index);
    setDragging(index);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging === undefined) return;
    updateStop(dragging, { offset: offsetFromPointer(e.clientX) });
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging === undefined) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(undefined);
  };

  const onHandleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const stop = g.stops[index];
    if (!stop) return;
    const step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      updateStop(index, { offset: clamp(stop.offset - step, 0, 100) });
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      updateStop(index, { offset: clamp(stop.offset + step, 0, 100) });
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeStop(index);
    }
  };

  const HANDLE = 18;

  return (
    <Rows spacing="1.5u">
      <SegmentedControl
        value={g.type}
        onChange={(v: FillGradient["type"]) => onChange({ ...g, type: v })}
        options={[
          { value: "linear", label: t(messages.gradientLinear) },
          { value: "radial", label: t(messages.gradientRadial) },
        ]}
      />

      {/* グラデーションバーと、その下のカラーストップ */}
      <div
        style={{
          position: "relative",
          paddingBottom: HANDLE + 4,
          // つまみが端からはみ出さないよう、左右に半分ずつ余白をとる
          paddingLeft: HANDLE / 2,
          paddingRight: HANDLE / 2,
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <div
          ref={barRef}
          role="presentation"
          onPointerDown={onBarPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{
            position: "relative",
            height: 28,
            borderRadius: "var(--ui-kit-radius-element-standard)",
            border: "1px solid var(--ui-kit-color-control-border)",
            background: gradientCss(g.stops),
            cursor: g.stops.length < MAX_STOPS ? "copy" : "default",
          }}
        >
          {g.stops.map((stop, i) => {
            const isSel = i === sel;
            return (
              <button
                key={i}
                type="button"
                aria-label={t(messages.gradientStopAria, {
                  index: i + 1,
                  offset: stop.offset,
                })}
                aria-pressed={isSel}
                onPointerDown={(e) => onHandlePointerDown(e, i)}
                onKeyDown={(e) => onHandleKeyDown(e, i)}
                onFocus={() => setSelected(i)}
                style={{
                  position: "absolute",
                  // バーの下端から少し下に、つまみを置く
                  top: "calc(100% + 4px)",
                  left: `${stop.offset}%`,
                  transform: "translateX(-50%)",
                  width: HANDLE,
                  height: HANDLE,
                  padding: 0,
                  borderRadius: 4,
                  background: stop.color,
                  // 選択中は文字色（テーマに追従）の太枠、それ以外は細枠
                  border: isSel
                    ? "2px solid currentColor"
                    : "1px solid var(--ui-kit-color-control-border)",
                  boxShadow: "inset 0 0 0 2px var(--ui-kit-elevation-surface-bg)",
                  color: "inherit",
                  cursor: dragging === i ? "grabbing" : "grab",
                  zIndex: isSel ? 2 : 1,
                }}
              />
            );
          })}
        </div>
      </div>
      <Text size="small" tone="tertiary">
        {t(messages.gradientHint)}
      </Text>

      {selStop && (
        <Rows spacing="0.5u">
          <Columns spacing="1u" alignY="center">
            <Column width="containedContent">
              <Swatch
                fill={[selStop.color]}
                onClick={(e) =>
                  pickColor(e.currentTarget.getBoundingClientRect(), (hex) =>
                    updateStop(sel, { color: hex }),
                  )
                }
              />
            </Column>
            <Column>
              <Text size="small">
                {t(messages.gradientStopLabel, {
                  index: sel + 1,
                  offset: selStop.offset,
                })}
              </Text>
            </Column>
            <Column width="containedContent">
              <Button
                variant="tertiary"
                onClick={() => removeStop(sel)}
                disabled={g.stops.length <= MIN_STOPS}
              >
                {t(messages.gradientRemoveStop)}
              </Button>
            </Column>
          </Columns>
          <Slider
            min={0}
            max={100}
            step={1}
            value={selStop.offset}
            onChange={(v: number) => updateStop(sel, { offset: v })}
          />
        </Rows>
      )}

      <Columns spacing="1u">
        <Column>
          <Button
            variant="secondary"
            stretch
            onClick={addStopInGap}
            disabled={g.stops.length >= MAX_STOPS}
          >
            {t(messages.gradientAddStop)}
          </Button>
        </Column>
        <Column width="containedContent">
          <Button
            variant="secondary"
            onClick={() =>
              setStops(g.stops.map((st) => ({ ...st, offset: 100 - st.offset })))
            }
          >
            {t(messages.gradientReverse)}
          </Button>
        </Column>
      </Columns>

      {g.type === "linear" && (
        <Rows spacing="0.5u">
          <Columns spacing="1u" alignY="center">
            <Column>
              <Text size="small">{t(messages.gradientAngle)}</Text>
            </Column>
            <Column width="containedContent">
              <Text size="small" tone="tertiary">
                {g.angle}°
              </Text>
            </Column>
          </Columns>
          <Slider
            min={0}
            max={359}
            step={1}
            value={g.angle}
            onChange={(v: number) => onChange({ ...g, angle: v })}
          />
        </Rows>
      )}
    </Rows>
  );
};
