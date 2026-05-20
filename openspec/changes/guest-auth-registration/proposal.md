## Why

現状はホームで DB 上のプレイヤーを選ばないと遊べず、履歴も端末の `playerId` に依存する。子どもはすぐ遊びたいが、保護者はクリア後に記録を残したい。初回はゲストで friction を下げ、価値を感じたタイミングで「おうちのひとと」登録する流れが必要。

## What Changes

- ゲストプレイ: 名前入力のみで開始。セッション・進捗は **localStorage のみ**（DB 書き込みなし）
- クイズ・採点・レベル解放は既存ロジックをクライアント側で再利用
- 結果画面（未ログイン）: 画面下部に控えめな「きろくを とうろくする（おうちのひとと）」リンク（親向け・任意・強制しない）
- ホーム: **ログイン** / **サインアップ** ボタンを表示。ログイン済みのときは両方非表示
- 1アカウント1子ども（`users` ↔ `players` 1:1）
- ログイン済み: 子どもの名前をそのまま表示（「ちゃん」等の敬称なし）、DB 経由で通常プレイ。次回以降はセッション Cookie で自動ログイン
- 既存の「プレイヤー一覧から選択」UI は廃止（ゲストは名前のみ、会員はアカウントに紐づく1名）

## Capabilities

### New Capabilities

- `guest-play`: 未ログイン時の名前入力、localStorage 上のセッション進行・完了記録
- `user-auth`: Email/パスワード登録・ログイン、セッション維持、会員登録時のデータ移行

### Modified Capabilities

- `addition-quiz`: ゲストはクライアント完結、会員は Server Actions + DB
- `score-tracking`: ゲスト結果は localStorage、登録時に DB へインポート
- `progress-dashboard`: 未ログインは localStorage 集計、ログイン後は DB

## Non-Goals

- パスワードリセットメール（初版は後回し）
- 1アカウント複数子ども
- OAuth / ソーシャルログイン
- ゲストデータのクラウド同期（登録まで端末ローカルのみ）
- 子ども本人の Email 登録（保護者 Email 想定）

## Impact

- **スキーマ**: `users` テーブル追加、`players` に `user_id` FK（nullable → 登録時に設定）
- **認証**: bcrypt + HTTP-only Cookie セッション（または Auth.js Credentials）
- **フロント**: `lib/guest-storage.ts`、ホーム/プレイ/結果/進捗の分岐
- **API**: `registerAndImportGuest`, `login`, `logout`, `getSession` Server Actions
- **既存**: `HomeClient` のプレイヤー一覧 UI 削除・置換
