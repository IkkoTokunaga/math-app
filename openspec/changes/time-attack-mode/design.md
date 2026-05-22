## Context

既存アプリは10問完走の通常クイズ（`PlayClient` + Server Actions + `lib/scoring.ts`）が中核。問題生成は `lib/questions.ts`、会員セッションは `sessions` / `question_logs` に保存。ゲストは localStorage で同ルールをクライアント完結。

タイムアタックは **別モード** として追加し、通常モードのレベル解放・星評価ロジックとは独立させる。

## Goals / Non-Goals

**Goals:**

- 会員向けタイムアタック（Lv1 スタート → Lv9 鬼 → Lv10 閻魔×10 → クリア）
- 10問ウェーブごとのサーバ生成・サーバ採点・鬼 HP 管理
- 1問1チャンス、3ミス/時間切れ即終了、視覚的警報（赤5秒/黄不正解）
- 鬼撃破ビーム演出、加点バー、HP 引き継ぎ、撃破ボーナス
- ゲストには入口を表示するがプレイ不可

**Non-Goals:**

- 通常モード Lv 解放への影響
- ゲスト localStorage セッション
- 閻魔 #10 以降の続行
- ランキング

## Decisions

### 1. セッション `mode` フィールド

**選択**: `sessions.mode = 'standard' | 'time_attack'`

**理由**: 進捗画面・履歴フィルタ・結果画面分岐に使える。既存セッションは `standard` デフォルト。

### 2. タイムアタック状態の保持

**選択**: `sessions` に JSONB `time_attack_state` を追加

**例**:

```typescript
type TimeAttackState = {
  currentLevel: Level;           // 1–10
  enmaNumber: number;            // 0 = 閻魔前, 1–10 = 閻魔フェーズ
  oniHpRemaining: number;
  oniHpMax: number;              // 現在ボスの HP 上限（再計算時更新）
  mistakeCount: number;          // 0–3, 3 で終了
  waveQuestionIndex: number;     // 0–9 現在ウェーブ内
  waveScoreAccumulated: number;  // 現在ウェーブの得点合計
  totalScore: number;            // セッション累計（撃破ボーナス込み）
  timeLimitSeconds: number;
  timeBonusMultiplier: number;
  defeatedEnmaCount: number;     // 撃破済み閻魔数（クリア判定用）
  status: 'wave_active' | 'wave_summary' | 'cleared' | 'failed';
};
```

**理由**: 10問バッチ・HP 引き継ぎ・閻魔段階を1レコードで追跡。`question_logs` は通常どおり1問ごとに保存。

### 3. 10問バッチは Server Action で生成

**選択**: ウェーブ開始時（セッション開始 / 撃破後 / HP 残で次ウェーブ）に `generateQuestions(level, 10)` をサーバ実行

**理由**: 既存パターン踏襲、改ざん防止。クライアントは `questions` 配列と `time_attack_state` を受け取る。

### 4. 得点計算は `lib/time-attack-scoring.ts` に分離

**選択**: 通常 `lib/scoring.ts` は触らず、タイムアタック専用モジュールを新設

**式**:

```
basePoints   = level × 10
timeBonus    = level × remainingSeconds × timeBonusMultiplier   // 制限内のみ
pointsEarned = basePoints + timeBonus                           // 正解時のみ
```

- 連続正解ボーナス（ストリーク）: **なし**
- 1秒猶予（`SCORE_TIME_GRACE_SECONDS`）: 通常モードと同様に適用

**ウェーブ理論最高**:

```
maxPerQuestion = level × 10 + level × timeLimitSeconds × timeBonusMultiplier
waveMaxScore   = maxPerQuestion × 10
oniMaxHp       = floor(waveMaxScore × 0.85)
```

### 5. 閻魔パラメータ

**選択**: Lv10 閻魔フェーズのみ `timeLimitSeconds` / `timeBonusMultiplier` を段階変更

| 閻魔 | 制限秒数 | 倍率 |
|------|---------|------|
| #1 | 10 | ×1 |
| #2 | 9 | ×2 |
| #3 | 8 | ×3 |
| #4 | 7 | ×4 |
| #5–#10 | 7 | ×5–×10（閻魔番号と同値） |

```
timeLimitSeconds    = max(7, 11 - enmaNumber)
timeBonusMultiplier = enmaNumber
```

Lv1–9 鬼: `timeLimitSeconds = 10`, `timeBonusMultiplier = 1`

### 6. 終了条件

| 条件 | 結果 |
|------|------|
| 1問の制限時間超過 | `failed` → 結果画面 |
| ミス3回（不正解3回） | `failed` → 結果画面 |
| 閻魔 #10 撃破 | `cleared` → 結果画面 |
| プレイヤー離脱 | セッション abandon（既存パターン） |

不正解: 0点、ミス+1、**次の問題へ**（リトライなし）

### 7. ウェーブ完了フロー

1. 10問目回答処理後、サーバがウェーブ得点を集計
2. `oniHpRemaining -= waveScore`
3. HP ≤ 0: 撃破ボーナス `floor(waveScore × 0.5)` を `totalScore` に加算
   - Lv < 10: `currentLevel++`, HP リセット（新 Lv の oniMaxHp）
   - Lv = 10 かつ enmaNumber < 10: `enmaNumber++`, 閻魔パラメータ更新, HP リセット
   - enmaNumber = 10 撃破: `cleared`
4. HP > 0: HP 引き継ぎ、同 Lv/同閻魔で次10問生成

### 8. ゲストはロック表示のみ

**選択**: `/play` モード選択でタイムアタックボタンを表示。未ログイン時は disabled + ロック UI。「ログインすると遊べる」等の短い説明。

**理由**: 登録動機の提示。localStorage 実装を避け、サーバ権威を一本化。

### 9. UI コンポーネント構成

```
/play
  └── ModeSelect（通常 / タイムアタック）
/play/time-attack
  └── TimeAttackClient
        ├── OniBossDisplay（背景透過鬼/閻魔 + HP バー）
        ├── TimeAttackScoreBar（10問理論最高 = MAX）
        ├── QuestionTimer（カウントダウン、5秒以下赤）
        ├── AlertOverlay（黄=不正解）
        ├── BeamAttackAnimation（ウェーブ完了時）
        └── Keypad（既存再利用）
/result/time-attack/[sessionId]
  └── TimeAttackResultClient
```

### 10. 鬼のビジュアル

**選択**: Lv1–9 は CSS filter/tint で色変化 + 1 ベース SVG/PNG。Lv10 閻魔は専用画像。背景 opacity 30–50% 程度。

## Data Model Changes

### `sessions` テーブル追加カラム

| Column | Type | Notes |
|--------|------|-------|
| `mode` | varchar | `'standard'` \| `'time_attack'`, default `'standard'` |
| `time_attack_state` | jsonb | nullable, time_attack 時のみ |

既存カラム（`level`, `total_score`, `status` 等）はタイムアタックでも利用。星評価（`stars`）はタイムアタックでは null または非表示。

## API / Server Actions

| Action | 用途 |
|--------|------|
| `startTimeAttackSessionAction(playerId)` | Lv1・鬼#0・HP 初期化・第1ウェーブ10問生成 |
| `submitTimeAttackAnswerAction(sessionId, index, answer, elapsedSeconds)` | 採点・ミス/時間切れ判定・次問 or ウェーブ完了 |
| `finalizeTimeAttackWaveAction(sessionId)` | ウェーブ集計・HP 更新・撃破/継続/クリア判定（10問目 submit 内から呼び出し可） |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 演出中の待ち時間 | 次ウェーブ問題をサーバ側で先行生成 |
| 閻魔後半の HP が高い | 85% 設計意図どおり。加点バーで進捗可視化 |
| `elapsedSeconds` 改ざん | 将来 `answeredAt` サーバ時刻で検証（初版は既存と同様クライアント送信） |
| モバイル演出負荷 | `prefers-reduced-motion` で警報・ビーム簡略化 |

## Migration Plan

1. Drizzle マイグレーション: `mode`, `time_attack_state`
2. 新 lib + Server Actions + UI
3. `/play` モード選択追加
4. 進捗画面にタイムアタック履歴セクション（任意・初版は結果画面のみでも可）

## Open Questions

- タイムアタック履歴を進捗ダッシュボードに載せるか（初版 scope 外でも可）
- 鬼画像アセットの用意方法（プレースホルダ → 後差し替え）
