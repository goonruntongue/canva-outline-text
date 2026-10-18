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

## ファイル構成

- `src/intents/design_editor/app.tsx` … パネルのUI
- `src/intents/design_editor/outline_render.ts` … 縁取りの描画処理
- `src/intents/design_editor/fonts.ts` … Google Fonts の読み込み（unicode-range 分割に対応）

## 今後の課題

- 挿入した画像はあとから文字を編集できない。App Element を使えば、設定を要素に保存して再編集できるようにできる
- Google Fonts への外部通信があるため、一般公開の審査前に、フォントの同梱やライセンス表記を検討する
