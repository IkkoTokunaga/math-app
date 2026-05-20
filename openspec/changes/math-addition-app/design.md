## Context

空のプロジェクトから、小学生向け足し算練習 Web アプリを構築する。Vercel Hobby + Neon PostgreSQL Free でホストし、家族内の個人利用（非商用）を前提とする。認証は MVP では行わず、プレイヤー名による簡易プロファイル選択で複人利用に対応する。

## Goals / Non-Goals

**Goals:**
- 20問セッションの足し算クイズ（4レベル）を提供する
- 星・得点・連続正解ボーナス・前回比メッセージでモチベーションを維持する
- セッション結果を Neon PostgreSQL に永続化する
- 履歴・週平均・連続学習日数・苦手な組み合わせを表示する
- 日本語 UI、タブレットでも使いやすい大きなボタン

**Non-Goals:**
- 認証・ログイン
- 速度ボーナス・ランキング
- 足し算以外の演算
- 商用公開（将来 Vercel Pro + Neon Launch へ移行）

## Decisions

### 1. Next.js App Router + Server Actions / Route Handlers

**選択**: Next.js 15 (App Router) + TypeScript

**理由**: Vercel との相性が最良。Server Actions で DB 書き込み、Route Handlers で集計 API を提供。

**代替案**: Vite + React SPA → API サーバーが別途必要になり、Vercel との統合が弱い。

### 2. Drizzle ORM + PostgreSQL

**選択**: Drizzle ORM + `postgres` (postgres.js)

**理由**: 型安全、マイグレーション管理が容易。標準 PostgreSQL 接続文字列で **Docker ローカル DB** と **Neon 本番** の両方に対応できる。

**代替案**: `@neondatabase/serverless` のみ → ローカル Docker PostgreSQL との二重管理が必要になる。

### 3. Docker Compose によるローカル開発

**選択**: `docker compose up` で Next.js (app) + PostgreSQL (db) を起動

**理由**:
- Node.js / PostgreSQL のローカルインストール不要
- チーム・端末間で開発環境を統一できる
- WSL2 + Windows でも同じ手順で動く

**構成**:
```
docker compose
├── db   … PostgreSQL 16（ローカル開発専用）
└── app  … Next.js dev server (port 3000)
```

**環境別 DB**:
| 環境 | DATABASE_URL |
|------|--------------|
| ローカル (Docker) | `postgresql://mathapp:mathapp@db:5432/mathapp` |
| 本番 (Vercel + Neon) | Neon の接続文字列 |

**代替案**: ローカルでも Neon を直接使う → スリープ・レイテンシ・無料枠消費の問題。

### 4. 認証なしのプレイヤー選択

**選択**: localStorage に `playerId` を保存し、初回は名前入力で `players` テーブルに INSERT

**理由**: 家族利用 MVP では認証のコストが見合わない。Neon Free の MAU 制限も回避。

**代替案**: NextAuth → MVP には過剰。

### 5. スコア計算はサーバーサイド

**選択**: セッション完了時に Server Action でスコア計算・DB 保存

**理由**: クライアント改ざん防止。得点ロジックを1箇所に集約。

### 6. Tailwind CSS

**選択**: Tailwind CSS v4

**理由**: ユーティリティファーストで子ども向け UI を素早く構築。追加 CSS フレームワーク不要。

## Data Model

```
players
├── id          UUID PK
├── name        VARCHAR(50)
└── created_at  TIMESTAMP

sessions
├── id            UUID PK
├── player_id     UUID FK → players
├── level         SMALLINT (1–4)
├── total_questions SMALLINT (default 20)
├── correct_answers SMALLINT
├── accuracy      SMALLINT (0–100)
├── stars         SMALLINT (0–3)
├── base_score    SMALLINT
├── bonus_score   SMALLINT
├── total_score   SMALLINT
├── best_streak   SMALLINT
└── played_at     TIMESTAMP

question_logs
├── id            UUID PK
├── session_id    UUID FK → sessions
├── operand_a     SMALLINT
├── operand_b     SMALLINT
├── user_answer   SMALLINT
├── correct_answer SMALLINT
├── incorrect_count SMALLINT   -- 正解までの不正解回数
├── points_earned SMALLINT   -- max(0, 10 - incorrect_count)
├── is_first_attempt_correct BOOLEAN
└── answered_at   TIMESTAMP
```

## API / Server Actions

| Endpoint / Action | Method | Purpose |
|-------------------|--------|---------|
| `createPlayer(name)` | Server Action | プレイヤー作成 |
| `startSession(playerId, level)` | Server Action | セッション開始、問題生成 |
| `submitAnswer(sessionId, questionIndex, answer)` | Server Action | 正誤判定・初回回答の記録（不正解時は再回答を促し次へ進まない） |
| `completeSession(sessionId)` | Server Action | スコア計算・保存 |
| `GET /api/progress?playerId=` | Route Handler | 進捗ダッシュボードデータ |

## Page Structure

```
/                     → プレイヤー選択
/play                 → クイズ画面（テンキー入力・不正解時は再回答）
/result/[sessionId]   → セッション結果（星・得点・成長メッセージ）
/progress             → 進捗ダッシュボード
```

## Scoring Logic (Reference)

```
questionPoints     = max(0, 10 - incorrectSubmissionCount)  // 正解時に確定
baseScore          = sum of all questionPoints              // 最大 200
streakBonus        = sum of bonuses at streak milestones (初回正解のみ連続、3→+5, 5→+10, ...)
perfectBonus       = all first-attempt correct ? +30 : 0
totalScore         = baseScore + streakBonus + perfectBonus
stars              = first-attempt accuracy thresholds (90%→3, 70%→2, 50%→1, else 0)
```

### 得点例（1問あたり）

| 不正解回数（正解前） | 得点 |
|----------------------|------|
| 0回 | 10点 |
| 1回 | 9点 |
| 2回 | 8点 |
| … | … |
| 10回以上 | 0点 |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Neon Free がスリープし初回アクセスが遅い | 許容範囲（家族利用）。将来 Neon Launch へ移行 |
| 認証なしで playerId を localStorage 依存 | 端末変更で履歴が見えなくなる → 将来認証追加 |
| Vercel Hobby は非商用限定 | ユーザー増加時に Pro へ移行（計画済み） |
| 問題生成の偏り | セッション内で重複禁止、ランダムシード管理 |

## Docker Development

**原則: npm / npx / マイグレーション / テスト等はすべて `app` コンテナ内で実行する。**

### 起動

```bash
docker compose up
```

- App: http://localhost:3000
- DB: localhost:5432（ホストから直接接続する場合）

### コマンド実行

| 状況 | コマンド |
|------|----------|
| コンテナ起動中 | `docker compose exec app <command>` |
| ワンショット | `docker compose run --rm app <command>` |

```bash
# 依存関係インストール
docker compose run --rm app npm install

# Next.js プロジェクト作成
docker compose run --rm app npx create-next-app@latest . --typescript --tailwind --app --no-git

# マイグレーション
docker compose exec app npm run db:migrate

# Lint / テスト
docker compose exec app npm run lint
```

### ホストで実行してよいもの

- `docker compose` 操作
- Git 操作
- ファイル編集
- OpenSpec CLI (`openspec`)

### 主要ファイル

| ファイル | 用途 |
|----------|------|
| `docker-compose.yml` | app + db サービス定義 |
| `Dockerfile.dev` | Next.js 開発用イメージ |
| `.env.example` | 環境変数テンプレート |
| `.cursor/rules/docker-development.mdc` | AI 向け Docker 実行ルール |

### ボリューム

- `postgres_data` … DB データ永続化
- `node_modules` … コンテナ内 node_modules（ホストとの競合回避）

## Migration Plan

1. ローカル: `docker compose up` → Drizzle マイグレーション実行
2. 本番: Neon プロジェクト作成 → `DATABASE_URL` を Vercel 環境変数に設定
3. Vercel にデプロイ（Git 連携）
4. 本番環境でマイグレーション実行
5. ロールバック: Vercel の前デプロイに revert、DB は破壊的変更を避ける

## Open Questions

- プレイヤーアイコン・色のカスタマイズは MVP に含めるか？ → **含めない**（名前のみ）
- 効果音・BGM は必要か？ → **MVP では不要**（将来追加可能）
