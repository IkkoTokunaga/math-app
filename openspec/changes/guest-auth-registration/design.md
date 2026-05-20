## Context

足し算練習アプリ（math-addition-app）は実装済み。認証なし + プレイヤー名選択モデルを、ゲスト（localStorage）+ 任意ログイン + クリア後登録に置き換える。

## Goals / Non-Goals

**Goals:**

- 未ログイン: 名前入力 → 即プレイ。記録は localStorage のみ
- クリア後: 「きろくを とうろくする（おうちのひとと）」で Email + パスワード登録し DB へ移行
- 1アカウント1子ども。ログイン後は名前表示
- ログイン済み再訪問では Cookie セッションで自動継続（ログイン UI を極力非表示）

**Non-Goals:**

- 複数子どもプロフィール、OAuth、パスワードリセット（初版）

## Decisions

### 1. ゲストデータは localStorage のみ

**選択**: ゲスト中は `sessions` / `question_logs` へ INSERT しない。`GuestStore` JSON で名前・進行中セッション・完了セッション・問題ログを保持。

**理由**: ユーザー要件①。DB に匿名行が増えない。登録までサーバー不要でプレイ可能。

**代替案**: 匿名 `player` を DB に作る → 登録前からサーバー依存、却下。

### 2. ゲストプレイはクライアント完結

**選択**: `lib/questions.ts`, `lib/scoring.ts`, `lib/levels.ts` をゲスト用フック/サービスから呼び出し。既存 Server Actions は `authRequired` パスでのみ使用。

**理由**: DB なしで同一ルールを保証。既存ロジックの重複を最小化。

### 3. 会員登録 = 一括インポート

**選択**: `registerAndImportGuestAction(email, password, guestSnapshot)` で `users` 作成、`players` に名前+`user_id`、完了セッションと `question_logs` を順に INSERT。成功後 Cookie 発行し localStorage のゲストデータを削除。

**理由**: ①の「会員登録時にデータ保存」を満たす。クリア直後の結果画面から呼ぶ。

### 4. 1アカウント1子ども

**選択**: `users.id` → `players.user_id` UNIQUE。登録時にゲストの `displayName` を `players.name` に設定。ログイン後はプレイヤー選択 UI なし。

### 5. セッション維持（ログイン UI 最小化）

**選択**: HTTP-only Cookie（`session_token`）+ DB の `sessions_auth` または signed JWT（有効期限 30日）。`middleware` または layout でセッション検証し、有効なら登録名を表示（「ちゃん」などの敬称は付けない）+ 即「れんしゅうする」。ログアウトは設定用に非表示寄り。

**理由**: ユーザー要件「次回以降極力ログインUIにさせない」。

### 6. 未ログイン開始フロー

**選択**: ホームで名前入力 + 「はじめる」。`GuestStore.displayName` を保存。ログイン済みなら名前は DB の `players.name` を表示（入力不要）。

### 7. パスワード

**選択**: bcrypt（cost 10）。Email は UNIQUE。初版はリセットなし（Non-goal）。

## Data Model

```
users
├── id            UUID PK
├── email         VARCHAR UNIQUE NOT NULL
├── password_hash VARCHAR NOT NULL
├── created_at    TIMESTAMP

players (変更)
├── id            UUID PK
├── user_id       UUID FK → users UNIQUE NULL  -- 登録後に設定
├── name          VARCHAR(50) NOT NULL
├── created_at    TIMESTAMP

auth_sessions (新規、ログイン Cookie 用。クイズ sessions とは別)
├── id            UUID PK
├── user_id       UUID FK → users
├── token_hash    VARCHAR NOT NULL
├── expires_at    TIMESTAMP NOT NULL

-- 既存 sessions, question_logs は会員プレイ・インポート後のみ使用
```

### localStorage: `math-app-guest`

```ts
type GuestStore = {
  version: 1;
  displayName: string;
  completedSessions: Array<{
    localId: string;
    level: number;
    /* 採点結果フィールド */
    questionLogs: Array<{ /* operand, attempts, points, ... */ }>;
  }>;
  inProgress?: {
    localId: string;
    level: number;
    questions: Question[];
    attemptCounts: Record<string, number>;
    currentIndex: number;
  };
};
```

## UI Flow

| 状態 | ホーム | プレイ | 結果 | 進捗 |
|------|--------|--------|------|------|
| ゲスト（名前あり） | 名前表示 + はじめる + **ログイン / サインアップ** | レベル選択 | もう一度・記録（主）+ 下部に控えめ登録リンク | localStorage 集計 |
| ログイン済み | 名前表示 + はじめる（**ログイン/サインアップ非表示**） | レベル選択（DB） | もう一度 / 記録（登録リンクなし） | DB 集計 |
| 初回・名前なし | 名前入力 + ログイン / サインアップ | — | — | — |

### ホーム（未ログイン）

- メイン: 名前入力 or 名前表示 + 「れんしゅうする」
- サブ（目立たない位置でも可）: **ログイン** / **サインアップ** ボタン各1
- ログイン済み: 上記2ボタンは **非表示**（挨拶 + れんしゅうのみ）

### 結果画面（ゲスト・親向け・任意）

- **主アクション**: 「もう一度」「記録を見る」（大きいボタンのまま）
- **下部・こっそり**: テキストリンク程度で `きろくを とうろくする（おうちのひとと）`
  - 子ども向けフローを阻害しない。モーダル or `/signup` で Email + パスワード
  - スキップ可能。閉じてもゲストの localStorage 記録は残る
- サインアップ完了時: ゲストデータがあれば一括インポート（ホームからのサインアップも同様）

## API / Server Actions

| Action | 説明 |
|--------|------|
| `registerAndImportGuestAction` | Email/パスワード + GuestStore → user/player/sessions 作成 |
| `loginAction` | Cookie 発行 |
| `logoutAction` | Cookie 削除 |
| `getAuthStateAction` | ログイン済みなら `{ userId, playerName }` |

既存 `startSessionAction` 等は認証済み `playerId` 必須のまま。

## Risks / Trade-offs

| リスク | 対策 |
|--------|------|
| localStorage 削除でゲスト記録消失 | 進捗画面に注意文。登録は任意（結果画面下部の控えめリンク） |
| ゲストと会員でロジック二重 | 共有 lib を単一ソースに |
| Cookie 盗難 | HTTP-only, Secure, SameSite=Lax |
| 同一 Email 再登録 | UNIQUE 制約 + 分かりやすいエラー |

## Migration Plan

1. `users`, `auth_sessions` マイグレーション、`players.user_id` 追加
2. ゲストストレージ + クライアントプレイ実装
3. 認証 Actions + Cookie
4. ホーム/結果 UI 差し替え（旧プレイヤー一覧削除）
5. 進捗画面のゲスト/会員分岐
6. 既存 localStorage `math-app-player-id` は登録移行後に削除

## Open Questions

- Email 確認（verification）は初版不要でよいか → 仮: 不要
- ログアウト UI の置き場（フッター小リンク）→ 実装時に決定
