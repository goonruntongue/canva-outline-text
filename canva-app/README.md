# 多重アウトライン文字（Canvaアプリ）

Canvaのエディタ内で、多重アウトライン＋ラウンド結合の縁取り文字を作り、画像としてデザインに追加するアプリです。

## できること

- 文字を入力するか、デザイン上で選択中のテキストを読み込む
- 縁取りを何層でも追加し、層ごとの色（Canvaのカラーピッカー）と太さを変える
- 角の結合をラウンド／マイター／ベベルから選ぶ
- 日本語フォント7種（Google Fonts）、サイズ・字間・行間・揃えを指定する
- 「デザインに追加」で透過PNGとして挿入する（画質は標準・高・最高の3段階）

## 開発の始め方（Windows）

Node.js 22 以上が必要です。

```powershell
cd canva-app
npm install
npm start
```

開発サーバーが `http://localhost:8080` で起動します。

### Canvaでプレビューする

1. https://www.canva.com/developers/apps でアプリを作成する
2. 「Inside Canva」→「App source」→「Development URL」に `http://localhost:8080` を設定する
3. 「Preview」を押すと、Canvaのエディタでアプリが開く（初回は「Open」、Chromeでは「Allow」を押す）
4. 権限（Configure → Scopes）で、次の3つを有効にする
   - `canva:design:content:read`
   - `canva:design:content:write`
   - `canva:asset:private:write`

## 審査用の翻訳ファイル

画面の文言は英語が元の言語です（Canva のルール）。審査に出すときは、Developer Portal の「コードアップロード」→「Translations」に `translations/messages_en.json` をアップロードします。

文言を変えたら、次のコマンドで作り直してください。

```
npm run translations
```

公開されて Canva の公式翻訳が届くまでは、日本語環境では `src/i18n/ja.ts` の日本語訳が表示されます。文言を追加・変更したら、`ja.ts` にも同じ英語をキーにして日本語訳を追加してください。

## ファイル構成

- `src/intents/design_editor/app.tsx` … パネルのUI
- `src/intents/design_editor/outline_render.ts` … 縁取りの描画処理
- `src/intents/design_editor/fonts.ts` … Google Fonts と手持ちフォントファイルの読み込み
- `src/intents/design_editor/messages.ts` … 画面の文言（英語）
- `src/i18n/ja.ts` / `src/i18n/provider.tsx` … 公開前に使う日本語訳と、言語の切り替え
- `translations/messages_en.json` … 審査提出用の翻訳ファイル

## 今後の課題

- Google Fonts への外部通信があるため、一般公開の審査前に、フォントの同梱やライセンス表記を検討する
