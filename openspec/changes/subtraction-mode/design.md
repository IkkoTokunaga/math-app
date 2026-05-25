## Context

既存アプリは足し算の通常モード（10問 × Lv1–10）と足し算タイムアタックが中核。問題生成は `lib/questions.ts`、得点は `lib/scoring.ts`、レベル解放は `lib/levels.ts` が担当。ゲストは localStorage、会員は PostgreSQL に保存。

引き算は **別演算** として追加し、UI・得点・星評価ロジックは足し算通常モードを最大限再利用する。レベル解放・履歴・解放演出は演算ごとに独立させる。

## Goals / Non-Goals

**Goals:**

- 引き算通常モード（10問 × Lv1–10、繰り下がりあり/なし、2項・3項）
- 足し算と同じ入力 UI（テンキー、キーボード、インライン `?`、再回答、マスコット）
- 同じ得点・星・連続正解ボーナス・前回比メッセージ
- 演算別レベル解放（足し算 Lv3 解放 ≠ 引き算 Lv3 解放）
- ゲスト・会員ともに引き算通常モードをプレイ可能

**Non-Goals:**

- 引き算タイムアタック → **`subtraction-time-attack-mode` change で別途追加予定**
- 負の答え、小数、分数
- 演算横断の統合レベル

## Decisions

### 1. `sessions.operation` フィールド

**選択**: `sessions.operation = 'addition' | 'subtraction'`（デフォルト `'addition'`）

**理由**: 既存 `mode`（`standard` / `time_attack`）と直交する。引き算 MVP は `operation='subtraction', mode='standard'` のみ。履歴・解放・進捗のフィルタに使う。

### 2. 問題生成は `lib/subtraction-questions.ts` に分離

**選択**: 足し算の `lib/questions.ts` は触らず、引き算専用モジュールを新設

**理由**: 繰り下がり判定・被減数 ≥ 減算結果・順序付きユニークキーは足し算と異なる。共通型 `Question`（operandA/B/C）は再利用。

**算式表示**:

```
2項: operandA - operandB = ?
3項: operandA - operandB - operandC = ?
```

**正答**: `operandA - operandB - (operandC ?? 0)`（常に ≥ 0）

### 3. 繰り下がり（borrow）判定

**選択**: 右から左へ各桁について、被減数の桁 ≥ 減数の桁（前桁からの借りを考慮）なら繰り下がりなし

```typescript
function hasNoBorrow(minuend: number, ...subtrahends: number[]): boolean
function hasBorrow(minuend: number, ...subtrahends: number[]): boolean
```

3項の場合は `minuend - sub1 - sub2` を筆算と同様に1パスで判定する。

### 4. レベル定義（10段階）

| Lv | 内容 |
|----|------|
| 1 | 一桁 − 一桁、繰り下がりなし |
| 2 | 二桁 − 一桁、繰り下がりあり |
| 3 | 二桁 − 一桁、繰り下がりなし |
| 4 | 二桁 − 二桁、繰り下がりなし |
| 5 | 二桁 − 二桁、繰り下がりあり |
| 6 | 三桁 − 二桁、繰り下がりなし |
| 7 | 二桁 − 二桁 − 二桁（答え ≤ 999） |
| 8 | 三桁 − 三桁、繰り下がりなし |
| 9 | 三桁 − 三桁、繰り下がりあり |
| 10 | 三桁 − 三桁 − 三桁 |

**被減数・減数の範囲**

- 一桁（被減数）: 1–9（Lv1 では被減数 ≥ 減数）
- 一桁（減数）: 1–9（減数に 0 は使わない。例: `8 - 0` は出題しない）
- 二桁: 10–99
- 三桁: 100–999

**重複禁止**: 2項は順序付きペア `(minuend, subtrahend)`。3項は順序付き triple `(a, b, c)`。

### 5. 得点は `lib/scoring.ts` を共用

**選択**: 引き算も `level × 10` 基本点、時間ボーナス、ストリークボーナス、星閾値は同一

**理由**: 難易度曲線が足し算と対称。別モジュール不要。

### 6. レベル解放は演算別

**選択**: `getUnlockedLevel(sessions, operation)`、`player_unlock_celebrations` に `operation` カラム追加

**理由**: 足し算 Lv5 到達でも引き算は Lv1 から。演算切替時に正しい解放状態を表示。

### 7. プレイ画面の演算選択

**選択**: `/play` 最上段に **足し算 / 引き算** タブ。足し算選択時は既存の通常 / タイムアタック選択。引き算選択時は通常モードのレベル選択のみ（タイムアタック非表示）。

```
/play
├── OperationSelect（足し算 / 引き算）
├── [足し算] ModeSelect（通常 / タイムアタック）
└── [引き算] LevelSelect（Lv1–10）
```

### 8. ルーティング

**選択**: 引き算も `/play?operation=subtraction` または同一 `PlayClient` 内 state で完結（MVP）。結果は既存 `/result/[sessionId]` を共用（算式表示が `-` になる）。

## Data Model

```typescript
// sessions 追加
operation: varchar('operation', { length: 20 }).notNull().default('addition')
// 'addition' | 'subtraction'

// player_unlock_celebrations 追加
operation: varchar('operation', { length: 20 }).notNull().default('addition')
// unique index: (player_id, operation, level)
```

`question_logs` は既存カラムをそのまま使用（operandA = 被減数、operandB/C = 減数）。

## API / Server Actions

| Action | 変更 |
|--------|------|
| `startSession(playerId, level, operation)` | `operation` 引数追加、引き算時は `generateSubtractionQuestions` |
| `submitAnswer(...)` | 正答計算を演算に応じて分岐 |
| `completeSession(...)` | 変更なし（得点ロジック共通） |
| `getPlayerUnlockedLevel(playerId, operation)` | 演算別解放 |
| `GET /api/progress?playerId=&operation=` | 演算別進捗（省略時は足し算） |

## Page Structure

```
/play?operation=addition     → 既存（足し算）
/play?operation=subtraction  → 引き算レベル選択 → クイズ
/result/[sessionId]          → 算式は session.operation に応じて + / -
/progress                    → 足し算 / 引き算タブで切替
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 3項引き算の生成失敗（答え < 0） | 生成ループで `a - b - c >= 0` を保証、試行上限 |
| 演算追加で PlayClient が肥大化 | 演算分岐を hooks / 小コンポーネントに切り出し |
| 既存セッションの `operation` NULL | マイグレーションで `'addition'` デフォルト |

## Open Questions

- 引き算の苦手な組み合わせ表示形式 → **`13 - 7` 形式（被減数 − 減数）**
- 進捗画面のデフォルトタブ → **足し算**（既存ユーザー体験維持）
