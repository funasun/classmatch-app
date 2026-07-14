# 夏季クラスマッチ2026 ディスプレイシステム

体育祭の運営用表示システム。本部（体育館）のPCで管理画面を編集すると、各フロアのエルモ（電子黒板）のブラウザに開いた表示画面へ **即時に自動反映** されます（エルモ側の操作は不要）。

| 画面 | URL | 用途 |
|---|---|---|
| 表示画面 | `https://<ユーザー名>.github.io/<リポジトリ名>/` | エルモで開く。全画面・自動ローテーション |
| 管理画面 | `https://<ユーザー名>.github.io/<リポジトリ名>/#/admin` | 本部PCで開く。合言葉が必要 |

## スライドの種類

1. **現在の試合** … 6コートの「今の試合」を大きく表示。管理画面の「次へ →」で即切替（コートごとに進捗が違ってもOK）
2. **暑さ指数（WBGT）** … 環境省APIから高松（地点72086）の実況値を自動取得。※参考値。中止判断は保健室
3. **進行表・試合結果速報** … パンフレットの進行表を再現（時刻・予選/トーナメント/決勝の区分帯つき）。点数を更新すると表示側に「更新」マークが出る
4. **表（リーグ結果・確定試合順）** … 自由な表。行が多いと自動で「1/2」「2/2」にページ分割
5. **お知らせ** … 見出し＋本文の自由テキスト

表示画面は **右側タップで次のスライド、左側タップで前のスライド** に手動で送れます（ローテーションはその後も継続）。

## セットアップ（開発）

```bash
npm install
npm run dev
```

- `http://localhost:5173/` … 表示画面
- `http://localhost:5173/#/admin` … 管理画面（合言葉の初期値: `classmatch`）

`.env` が無い場合は **ローカルモード**（同一ブラウザ内でのみ同期）で動きます。実際に端末間で同期させるには `.env.example` をコピーして `.env` を作成し、Firebase の値を設定してください。

## Firebase の設定（本番の同期に必要）

同期には **Firebase Firestore** を使います（無料枠内・サーバ不要）。学校のネットワークでも通りやすい `firestore.googleapis.com`（Google Classroom / Drive と同系統のドメイン）への HTTPS 通信のみで、プロキシ環境では自動でロングポーリングに切り替わります。

1. [Firebase コンソール](https://console.firebase.google.com/) で新規プロジェクトを作成（Analytics は不要）
2. **Firestore Database** を作成（本番モード / ロケーション: asia-northeast1 など）
3. **Authentication → ログイン方法** で「メール / パスワード」を有効化
4. **Authentication → ユーザー** で管理者ユーザーを1人追加
   - メール: 例 `admin@classmatch.local`（実在しなくてよい）
   - パスワード: **これが管理画面の合言葉になる**（6文字以上）
5. **Firestore → ルール** を以下にする（誰でも読める・書けるのはログイン済み=本部のみ）:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /classmatch/{doc} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

6. **プロジェクトの設定 → 全般 → マイアプリ** でウェブアプリを追加し、`apiKey` と `projectId` を控える

使うドキュメントは `classmatch/state`（表示内容）と `classmatch/wbgt`（暑さ指数の共有値）の2つだけです。

## GitHub Pages デプロイ

1. GitHubにリポジトリを作って push
2. リポジトリの **Settings → Pages → Source** を「GitHub Actions」にする
3. **Settings → Secrets and variables → Actions → Variables** に設定:
   - `VITE_FIREBASE_API_KEY` … Firebase の apiKey（公開前提の識別子なので Variables でよい）
   - `VITE_FIREBASE_PROJECT_ID` … Firebase の projectId
   - `VITE_FIREBASE_ADMIN_EMAIL` … 手順4で作った管理者のメールアドレス
4. `main` に push すると `.github/workflows/deploy.yml` が自動でビルド・公開

公開されたURLをエルモのブラウザで開けば完了です（PWA対応なのでホーム画面追加も可）。

## 本部の使い方

- **編集は全て自動保存**。保存ボタンはありません。右上に「✓ 自動保存」と出ていれば反映済み
- **スライド一覧（左）** … ＋追加／🗑削除／ドラッグ（⠿）で並べ替え／「表示する」ON・OFF／表示秒数／「📌 今すぐ表示」で全エルモに固定
- **試合の進行** … 「現在の試合」または「進行表・試合結果速報」スライドを開くと上部に **全コートの進行パネル** が出る。各コートの「次へ →」を押すだけ
- **点数入力** … 表のセルをクリックしてそのまま入力。Excelからコピーして ⌘V / Ctrl+V で流し込みも可。更新した行は表示側で約5分間「更新」マークつきで強調される
- **試合状態（画面上部）**
  - 通常 … 何も出ない
  - 注意 … 全エルモの上部に黄色バナー（ローテーションは継続、文言は「文言設定」で変更可）
  - 中止 … 全エルモが赤い全画面表示になりローテーション停止（確認ダイアログあり）

## トラブル時

- **表示が更新されない** … ネットワーク断でも直前の内容を表示し続けます（真っ白にはなりません）。復旧すると自動で追いつきます
- **動作ログを見たい** … 表示画面のURL末尾に `?debug=1`（例: `.../#/?debug=1`）で右下に取得ログ（WBGT取得・同期・フォールバック）が出ます
- **WBGTが「取得できません」** … 保健室の判断を優先してください。本部PC（管理画面を開いた端末）が取得できていれば、その値が Firestore 経由で各エルモに共有されます
- **合言葉を変えたい** … Firebase コンソール → Authentication で管理者ユーザーのパスワードを変更（再デプロイ不要）

## 技術構成

- React + Vite + TypeScript + Tailwind CSS / HashRouter / PWA（vite-plugin-pwa）
- 同期: Firebase Firestore の onSnapshot によるリアルタイムプッシュ（ポーリングなし）。状態全体を `classmatch/state` に JSON 文字列で保存
- 認証: Firebase Authentication（メール/パスワード）。管理画面の合言葉 = 管理者ユーザーのパスワード
- WBGT: 環境省 熱中症予防情報サイト API（実測値 → 実況推定値 → 他端末が Firestore に共有した値、の順にフォールバック）
