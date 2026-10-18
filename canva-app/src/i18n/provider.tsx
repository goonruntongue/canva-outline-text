// 言語の切り替え
//
// 通常は Canva 公式の AppI18nProvider を使う（Canva の翻訳を自動で読み込む）。
// ただし Canva の翻訳は「審査を通過して公開されたあと」に届くため、それまでの間、
// 日本語環境では同梱の日本語訳（ja.ts）を表示する。
// 公式翻訳が届いた時点で、自動的に公式側へ切り替わる。
//
// 同梱の日本語訳をやめる場合は USE_BUNDLED_JA を false にする。

import { AppI18nProvider } from "@canva/app-i18n-kit";
import type { PropsWithChildren } from "react";
import { createIntl, createIntlCache, RawIntlProvider } from "react-intl";
import { JA } from "./ja";

const USE_BUNDLED_JA = true;

type CanvaI18n = {
  getLocalizedMessages?: () => { messages?: Record<string, unknown> };
};

// Canva から届いた翻訳に日本語が含まれているか
// （公開前は空、または英語のままのことがあるため、中身で判定する）
const canvaHasJapaneseTranslations = (): boolean => {
  try {
    const i18n = (
      window as unknown as {
        canva_sdk?: { platform?: { v2?: { i18n?: CanvaI18n } } };
      }
    ).canva_sdk?.platform?.v2?.i18n;
    const messages = i18n?.getLocalizedMessages?.().messages ?? {};
    return /[\u3040-\u30ff\u4e00-\u9fff]/.test(JSON.stringify(messages));
  } catch {
    return false;
  }
};

const startsWithJa = (v: string | undefined | null) =>
  (v || "").toLowerCase().startsWith("ja");

// Canva が伝える言語（公開前のアプリでは英語扱いになることがある）
const canvaLocaleIsJa = () => startsWithJa(document.documentElement.lang);

// ブラウザの言語設定（Canva が言語を伝えない場合の手がかり）
const browserPrefersJa = () =>
  startsWithJa(navigator.language) ||
  (navigator.languages || []).slice(0, 1).some(startsWithJa);

/**
 * 同梱の日本語訳を使うか。
 * - Canva から日本語の公式翻訳が届いている → 公式を使う
 * - それ以外で、Canva かブラウザの言語が日本語 → 同梱の日本語訳を使う
 */
const shouldUseBundledJa = () => {
  if (!USE_BUNDLED_JA) return false;
  if (canvaHasJapaneseTranslations()) return false;
  return canvaLocaleIsJa() || browserPrefersJa();
};

const buildBundledJaIntl = () => {
  const intl = createIntl(
    { locale: "ja", defaultLocale: "en", messages: {}, onError: () => {} },
    createIntlCache(),
  );
  const base = intl.formatMessage;
  // 元の英語文言をキーに日本語訳へ差し替えてから整形する
  intl.formatMessage = ((descriptor, values, opts) => {
    const source = descriptor.defaultMessage;
    const ja = typeof source === "string" ? JA[source] : undefined;
    return base(
      ja ? { ...descriptor, defaultMessage: ja } : descriptor,
      values,
      opts,
    );
  }) as typeof base;
  return intl;
};

let bundledJaIntl: ReturnType<typeof buildBundledJaIntl> | undefined;

export const I18nProvider = ({ children }: PropsWithChildren) => {
  if (shouldUseBundledJa()) {
    bundledJaIntl ??= buildBundledJaIntl();
    return <RawIntlProvider value={bundledJaIntl}>{children}</RawIntlProvider>;
  }
  return <AppI18nProvider>{children}</AppI18nProvider>;
};
