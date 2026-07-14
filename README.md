# 夏季クラスマッチ2026 ディスプレイシステム

体育祭の運営用表示システム。本部（体育館）のPCで管理画面を編集すると、各フロアのエルモ（電子黒板）のブラウザに開いた表示画面へ **1〜2秒で自動反映** されます。

| 画面 | URL | 用途 |
|---|---|---|
| 表示画面 | `https://<ユーザー名>.github.io/<リポジトリ名>/` | エルモで開く。全画面・自動ローテーション |
| 管理画面 | `https://<ユーザー名>.github.io/<リポジトリ名>/#/admin` | 本部PCで開く。合言葉が必要 |

## スライドの種類

1. **現在の試合** … 6コートの「今の試合」を大きく表示。管理画面の「次の試合へ」ボタンで即切替
2. **暑さ指数（WBGT）** … 環境省APIから高松（地点72086）の実況値を自動取得。※参考値。中止判断は保健室
3. **試合結果速報** … Excelの配色を再現した対戦表。コートを選んで表示
4. **表（リーグ結果・確定試合順）** … 自由な表。行が多いと自動で「1/2」「2/2」にページ分割
5. **お知らせ** … 見出し＋本文の自由テキスト

## セットアップ（開発）

```bash
npm install
npm run dev
```

- `http://localhost:5173/` … 表示画面
- `http://localhost:5173/#/admin` … 管理画面（合言葉の初期値: `classmatch`）

`.env` が無い場合は **ローカルモード**（同一ブラウザ内でのみ同期）で動きます。実際にサーバ同期させるには `.env.example` をコピーして `.env` を作成してください。

```bash
cp .env.example .env
# VITE_API_BASE と VITE_ADMIN_PASSCODE を編集
```

## Xserver への PHP 設置（本番の同期に必要）

1. `server-php/` の中身を Xserver にアップロードする
   （例: `public_html/classmatch/` → `https://funasun273.xsrv.jp/classmatch/state.php`）
2. `state.php` の先頭にある `$PASSCODE = 'classmatch';` を本番の合言葉に変更する
   （`.env` / GitHub Secrets の `VITE_ADMIN_PASSCODE` と同じ値にする）
3. ブラウザで `https://funasun273.xsrv.jp/classmatch/state.php` を開き、JSONが返ることを確認

- `state.php` … 表示内容の保存・配信（1.5秒間隔ポーリング）
- `wbgt.php` … 環境省APIのプロキシ。学校ネットワークで env.go.jp への直接アクセスが弾かれた場合、表示画面が自動でこちらに切り替える

## GitHub Pages デプロイ

1. GitHubにリポジトリを作って push
2. リポジトリの **Settings → Pages → Source** を「GitHub Actions」にする
3. **Settings → Secrets and variables → Actions** で設定:
   - Variables: `VITE_API_BASE` = `https://funasun273.xsrv.jp/classmatch`
   - Secrets: `VITE_ADMIN_PASSCODE` = 本番の合言葉
4. `main` に push すると `.github/workflows/deploy.yml` が自動でビルド・公開

公開されたURLをエルモのブラウザで開けば完了です（PWA対応なのでホーム画面追加も可）。

## 本部の使い方

- **編集は全て自動保存**。保存ボタンはありません。右上に「✓ 自動保存」と出ていれば反映済み
- **スライド一覧（左）** … ＋追加／🗑削除／ドラッグ（⠿）で並べ替え／「表示する」ON・OFF／表示秒数
- **試合の進行** … 「現在の試合」または「試合結果速報」スライドを開き、コートのタブを選んで「次の試合へ →」
- **点数入力** … 表のセルをクリックしてそのまま入力。Excelからコピーして ⌘V / Ctrl+V で流し込みも可
- **試合状態（画面上部）**
  - 通常 … 何も出ない
  - 注意 … 全エルモの上部に黄色バナー（ローテーションは継続）
  - 中止 … 全エルモが赤い全画面表示になりローテーション停止（確認ダイアログあり）

## トラブル時

- **表示が更新されない** … ネットワーク断でも直前の内容を表示し続けます（真っ白にはなりません）。復旧すると自動で追いつきます
- **動作ログを見たい** … 表示画面のURL末尾に `?debug=1`（例: `.../#/?debug=1`）で右下に取得ログ（WBGT取得・同期・フォールバック）が出ます
- **WBGTが「取得できません」** … 保健室の判断を優先してください。Xserverの `wbgt.php` 設置を確認
- **合言葉を変えたい** … `state.php` の `$PASSCODE` と GitHub Secrets の `VITE_ADMIN_PASSCODE` を両方変更して再デプロイ

## 技術構成

- React + Vite + TypeScript + Tailwind CSS / HashRouter / PWA（vite-plugin-pwa）
- 同期: Xserver 上の PHP + JSON ファイル（1.5秒ポーリング、`known` バージョンによる差分応答）
- WBGT: 環境省 熱中症予防情報サイト API（直接 → プロキシ自動フォールバック、実測値 → 実況推定値フォールバック）
