## Context

足し算タイムアタック（`time-attack-mode`）が実装済み。引き算通常モード（`subtraction-mode`）も `operation='subtraction'` で独立。タイムアタックは現在 `operation='addition'`（デフォルト）のみ。

引き算 TA は **足し算 TA のコピー** をベースに、問題生成・算式表示・マスコット・セッション分離だけ差し替える。

## Goals / Non-Goals

**Goals:**

- 引き算 TA（Lv1 → 鬼 → Lv9 閻魔 → Lv10 黒閻魔 → クリア）
- 5問ウェーブ、得点=ダメージ、1問1チャンス、3ミス終了
- 制限時間超過は base のみ（セッション継続）
- 演算別再開（足し算 TA 進行中 + 引き算 TA 進行中を同時に保持可）
- 水色スーツのマスコット
- ゲストは見えるがロック

**Non-Goals:**

- 通常モード Lv 解放への影響
- 3項引き算・減数 0
- 新しいボスアセット（鬼/閻魔画像は足し算 TA と共用）

## Playtest Targets

足し算 TA と同目安。初版は同倍率テーブルを流用し、プレイテストで調整。

| 目標 | 目安 |
|------|------|
| Lv1 鬼撃破 | **10〜15分** |
| 閻魔 #1 到達 | **30分以内** |
| 全クリア | **複数セッション前提** |

## Decisions

### 1. セッション識別

**選択**: `sessions.operation = 'subtraction'` かつ `sessions.mode = 'time_attack'`

**理由**: 既存カラムで足し算 TA と直交。再開・履歴・結果画面を演算別にフィルタ可能。

### 2. 再開は演算ごとに独立

**選択**: プレイヤーあたり **足し算 TA 進行中 1件** + **引き算 TA 進行中 1件** まで

```typescript
findInProgressTimeAttackSession(playerId, operation)
```

**理由**: 演算切替で進行が消えない。同一演算内では従来どおり1件のみ。

### 3. 得点・HP・ボス

**選択**: `lib/time-attack-scoring.ts` / `lib/time-attack.ts` を **演算非依存で共用**

```
basePoints   = level × 10
timeBonus    = level × remainingSeconds × timeBonusMultiplier
getOniHpRatio(level, enmaNumber)  // 足し算 TA と同一
WAVE_QUESTION_COUNT = 5
```

**理由**: 難易度曲線・プレイ時間目標を揃える。

### 4. 問題生成

**選択**: `lib/subtraction-time-attack-questions.ts` を新設。Lv1–6 は `lib/subtraction-questions.ts` の生成器を再利用。Lv7–10 は TA 専用（**2項のみ**）。

| Lv | 引き算 TA ルール |
|----|------------------|
| 1 | 一桁 − 一桁、繰り下がりなし（減数 1–9） |
| 2 | 二桁 − 一桁、繰り下がりあり |
| 3 | 二桁 − 一桁、繰り下がりなし |
| 4 | 二桁 − 二桁、繰り下がりなし |
| 5 | 二桁 − 二桁、繰り下がりあり |
| 6 | 三桁 − 二桁、繰り下がりなし |
| 7 | 三桁 − 二桁、繰り下がりあり（百の位への借り） |
| 8 | 三桁 − 三桁、繰り下がりなし |
| 9 | 三桁 − 三桁、繰り下がりあり（閻魔） |
| 10 | 三桁 − 三桁、繰り下がりあり（黒い閻魔） |

**共通制約**:

- 被減数 ≥ 減数、答え ≥ 0
- 減数（operandB）に **0 禁止**
- ウェーブ内重複禁止（順序付きペア）

**回答桁数**: 全レベル **最大3桁**（引き算 TA では 999 まで）

### 5. 算式表示

**選択**: `formatSubtractionExpression` — `A - B = ?`

正答: `getSubtractionCorrectAnswer` / `getCorrectAnswerForOperation('subtraction', q)`

### 6. マスコット

**選択**: 引き算 TA 中は `/mascot-subtraction.png`（水色スーツ）

**理由**: 引き算通常モードと統一。

### 7. UI / ルーティング

**選択**: 既存 `TimeAttackClient` を `operation` prop で共用

```
/play?operation=subtraction
  ├── 通常モード（既存）
  └── タイムアタック（新規入口）
/play/time-attack?operation=subtraction
/result/time-attack/[sessionId]  // session.operation で算式分岐
```

**PlayClient 変更**:

```
[引き算] 
  ├── 通常モード
  └── タイムアタック（鬼退治） / 続きから
```

ゲスト: 両方ロック。

### 8. Server Actions 変更概要

| Action | 変更 |
|--------|------|
| `startTimeAttackSessionAction(playerId, operation?)` | 引き算問題生成、`operation` 保存 |
| `resumeTimeAttackSessionAction(playerId, operation?)` | 演算別再開 |
| `getTimeAttackResumeInfoAction(playerId, operation?)` | 演算別続きから表示 |
| `submitTimeAttackAnswerAction` | 正答を演算別に |
| `findInProgressTimeAttackSession` | `operation` フィルタ追加 |

### 9. 開発ショートカット

**選択**: `?devStart=<Lv>&operation=subtraction`（development のみ）

## Data Model

**変更なし** — 既存:

```typescript
sessions: {
  operation: 'addition' | 'subtraction',
  mode: 'standard' | 'time_attack',
  timeAttackState: TimeAttackState | null,
  // ...
}
```

## API / Server Actions

足し算 TA と同一セット。全 Action に optional `operation`（default `'addition'`）。

## Page Structure

```
/play?operation=subtraction
  └── 引き算: 通常 / タイムアタック / 続きから（引き算 TA）
/play/time-attack?operation=subtraction
  └── TimeAttackClient(operation="subtraction")
/result/time-attack/[sessionId]
  └── 算式 `-`、operation ラベル（任意）
```

## Component Reuse

| コンポーネント | 引き算 TA |
|----------------|-----------|
| TimeAttackClient | operation prop |
| TimeAttackArena / Oni / HP bar | 共用 |
| Keypad | 共用 |
| QuizMascot | operation=subtraction → 水色 |
| MascotLightOrb / Beam | 共用 |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| TimeAttackClient が肥大化 | operation を hook に集約 |
| 2つの TA 再開 UI が複雑 | 現在の演算タブ内だけに続きからを表示 |
| Lv7 百の位借り生成失敗 | 試行上限 + テスト |
| 足し算 TA 回帰 | operation デフォルト addition、既存テスト維持 |

## Migration Plan

1. `lib/subtraction-time-attack-questions.ts` + テスト
2. time-attack actions に operation 対応
3. PlayClient 引き算 TA 入口
4. TimeAttackClient / result 画面の operation 分岐
5. 手動: 足し算 TA 回帰 + 引き算 TA 通し

## Open Questions

- 進捗画面に TA 履歴（演算別）を載せるか → **初版は結果画面のみ**（足し算 TA と同様）
- 引き算 TA 専用 BGM/SE → **なし**（足し算 TA と同じ）
