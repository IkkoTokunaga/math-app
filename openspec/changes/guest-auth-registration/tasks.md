## 1. データベース・認証基盤

- [x] 1.1 `users`, `auth_sessions` スキーマを追加し `players.user_id` (UNIQUE FK) を追加する
- [x] 1.2 マイグレーション生成・適用（`docker compose exec app npm run db:generate` / `db:push`）
- [x] 1.3 `lib/auth.ts` — bcrypt ハッシュ、Cookie 発行・検証、セッション CRUD
- [x] 1.4 `registerAndImportGuestAction`, `loginAction`, `logoutAction`, `getAuthStateAction` を実装する

## 2. ゲスト localStorage

- [x] 2.1 `lib/guest-storage.ts` — GuestStore 型、読み書き、クリア、スナップショット export
- [x] 2.2 `lib/guest-session.ts` — クライアント側 start / submit / finalize（既存 lib 再利用）
- [x] 2.3 ゲスト用レベル解放を localStorage 完了セッションから算出する

## 3. ホーム・ナビゲーション

- [x] 3.1 旧 `HomeClient` プレイヤー一覧を削除し、ゲスト名前入力 / ログイン済み名前表示に差し替える
- [x] 3.2 未ログイン時のみ **ログイン** / **サインアップ** ボタンをホームに表示（`/login`, `/signup`）
- [x] 3.3 ログイン済みはログイン・サインアップボタンを非表示にする
- [x] 3.4 サーバーで Cookie 検証しログイン状態を渡す（各ページ `getAuthState`）
- [x] 3.5 ログイン済み再訪問は名前表示 + れんしゅうするのみ（認証フォームなし）

## 4. プレイ画面

- [x] 4.1 `PlayClient` をゲスト / 会員で分岐（ゲストは `guest-session`、会員は既存 Server Actions）
- [x] 4.2 ゲスト時は名前があればプレイ可能にする
- [x] 4.3 ログイン済み時はプレイ画面に名前を表示する

## 5. 結果・登録（任意・親向け）

- [x] 5.1 結果画面下部に控えめなテキストリンク「きろくを とうろくする（おうちのひとと）」
- [x] 5.2 登録フォーム（Email + パスワード）+ `registerAndImportGuestAction` 連携
- [x] 5.3 登録成功後: Cookie 設定、guest localStorage 削除
- [x] 5.4 ログイン済み結果画面は登録リンクなし

## 6. 進捗ダッシュボード

- [x] 6.1 ゲストは localStorage から進捗をクライアント計算
- [x] 6.2 ログイン済みは既存 `/api/progress` を継続利用
- [x] 6.3 ゲスト向け「記録はこの端末だけ」注意文

## 7. クリーンアップ・テスト

- [x] 7.1 旧 `math-app-player-id` / プレイヤー一覧 API の削除
- [x] 7.2 `docker compose exec app npm run lint` / `npm run build` 通過
- [x] 7.3 `math-addition-app` の Player selection は本変更で置き換え（archive 時に supersede）
