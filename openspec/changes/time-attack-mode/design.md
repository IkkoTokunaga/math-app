## Context

既存アプリは10問完走の通常クイズ（`PlayClient` + Server Actions + `lib/scoring.ts`）が中核。問題生成は `lib/questions.ts`、会員セッションは `sessions` / `question_logs` に保存。ゲストは localStorage で同ルールをクライアント完結。

タイムアタックは **別モード** として追加し、通常モードのレベル解放・星評価ロジックとは独立させる。

## Goals / Non-Goals

**Goals:**

- 会員向けタイムアタック（Lv1 スタート → Lv8 鬼 → Lv9 紫閻魔 → Lv10 黒閻魔 → クリア）
- **5問ウェーブ**ごとのサーバ生成・サーバ採点・鬼 HP 管理
- 1問1チャンス、3ミスで終了（**時間切れはゲームオーバーにしない**）、不正解時の視覚的警報（黄）
- 鬼撃破ビーム演出、加点バー、HP 引き継ぎ、撃破ボーナス
- **途中離脱からの再開**（同一鬼・同一 HP）
- ゲストには入口を表示するがプレイ不可

**Non-Goals:**

- 通常モード Lv 解放への影響
- ゲスト localStorage セッション
- 閻魔 #10 以降の続行
- ランキング

## Playtest Targets

実装後の調整指標。プレイテストで大きく外れたら倍率テーブルを見直す。

| 目標 | 目安 |
|------|------|
| Lv1 鬼撃破 | **10〜15分** |
| 閻魔 #1 到達 | **30分以内**（再開含む累計でも可） |
| 全クリア | **複数セッション前提**（再開 UI で継続） |

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
  waveQuestionIndex: number;     // 0–4 現在ウェーブ内
  waveScoreAccumulated: number;  // 現在ウェーブの得点合計
  totalScore: number;            // セッション累計（撃破ボーナス込み）
  timeLimitSeconds: number;
  timeBonusMultiplier: number;
  defeatedEnmaCount: number;     // 撃破済み閻魔数（クリア判定用）
  status: 'wave_active' | 'wave_summary' | 'cleared' | 'failed';
};
```

**理由**: 5問バッチ・HP 引き継ぎ・閻魔段階を1レコードで追跡。`question_logs` は通常どおり1問ごとに保存。`status = 'wave_active'` のセッションは再開対象。

### 3. 5問バッチは Server Action で生成

**選択**: ウェーブ開始時（セッション開始 / 撃破後 / HP 残で次ウェーブ）に `generateQuestions(level, WAVE_QUESTION_COUNT)` をサーバ実行

```
WAVE_QUESTION_COUNT = 5
```

**理由**: 1ウェーブを短くし攻撃サイクルの回転を上げつつ、HP 倍率で撃破までの総ウェーブ数は確保する。既存パターン踏襲、改ざん防止。

### 4. 得点計算は `lib/time-attack-scoring.ts` に分離

**選択**: 通常 `lib/scoring.ts` は触らず、タイムアタック専用モジュールを新設

**式**:

```
basePoints   = level × 10
timeBonus    = level × remainingSeconds × timeBonusMultiplier   // 制限内のみ（remainingSeconds > 0）
pointsEarned = basePoints + timeBonus                           // 正解時のみ
```

- 連続正解ボーナス（ストリーク）: **なし**
- 1秒猶予（`SCORE_TIME_GRACE_SECONDS`）: 通常モードと同様に適用

**ウェーブ理論最高**:

```
maxPerQuestion = level × 10 + level × timeLimitSeconds × timeBonusMultiplier
waveMaxScore   = maxPerQuestion × WAVE_QUESTION_COUNT
oniMaxHp       = floor(waveMaxScore × getOniHpRatio(level, enmaNumber) × ONI_HP_MULTIPLIER)
```

**定数**:

```
WAVE_QUESTION_COUNT = 5
ONI_HP_MULTIPLIER = 0.85
```

**レベル別 HP 倍率（攻撃スパン）**:

```typescript
function getOniHpRatio(level: Level, enmaNumber: number): number {
  if (level >= 10 && enmaNumber === 2) return 4; // Lv10 黒い閻魔
  if (level >= 9) return 2;                      // Lv9 閻魔
  if (level <= 3) return 5;                        // Lv1–3
  if (level <= 7) return 3;                        // Lv4–7
  return 2;                                        // Lv8
}
```

| ボス | 倍率 | 例 |
|------|------|-----|
| Lv1–3 鬼 | ×5 | Lv1: waveMax 100 → HP 425 |
| Lv4–7 鬼 | ×3 | Lv5: waveMax 2,750 → HP 7,012 |
| Lv8 鬼 | ×2 | Lv8: waveMax 2,750 → HP 4,675 |
| Lv9 閻魔 | ×2 | Lv9: waveMax 4,950 → HP 8,415 |
| Lv10 黒い閻魔 | ×4 | Lv10: waveMax 4,000 → HP 13,600 |

**意図**: 序盤は長めに慣れさせ、中盤以降はテンポを上げて全クリア時間を抑える。攻撃ゲージの理論最大（`waveMaxScore`）は5問分。ゲージ満タンでも HP が残るのが通常。

**タイムボーナス**: 得点式・閻魔倍率・猶予1秒は **変更なし**。制限時間はタイムボーナスの上限計算にのみ使う（残り時間は UI に表示しない）。

### 5. 鬼 HP バーの区切り表示

**選択**: HP バーを **`getOniHpRatio` と同数のセグメント** に分割して表示する

- 各セグメント ≒ 理論1ウェーブ分のダメージ目安
- 削られたセグメントは暗く／空にし、**「あと N 回の攻撃で撃破」** が視覚的に分かるようにする
- 数値（HP 値）は引き続き非表示

**理由**: 攻撃ゲージ満タンでも HP が少ししか減らない体感ギャップを、セグメントで「1チャンク削れた」と伝える。

### 6. レベル別問題生成（タイムアタック専用）

**選択**: Lv1–6 は通常モードと同じ生成ルール。Lv7–10 はタイムアタック専用（`lib/time-attack-questions.ts`）。

| Lv | 内容 |
|----|------|
| 1 | 一桁、繰り上がりなし |
| 2 | 一桁、繰り上がりあり |
| 3 | 一桁+二桁、繰り上がりなし |
| 4 | 一桁+二桁、繰り上がりあり |
| 5 | 二桁+二桁、繰り上がりなし |
| 6 | 二桁+二桁、繰り上がりあり |
| 7 | 二桁+二桁、100の位への繰り上がりあり |
| 8 | 1–999 + 1–99 |
| 9 | 1–999 + 1–999（閻魔） |
| 10 | 1–999 + 1–999（黒い閻魔） |

### 7. 閻魔パラメータ

**選択**: Lv9 閻魔は Lv1–8 鬼と同じ 10秒/×1。Lv10 黒い閻魔は 7秒/×10。UI 表記はどちらも「閻魔大王」のみ。

Lv1–9: `timeLimitSeconds = 10`, `timeBonusMultiplier = 1`
Lv10 黒い閻魔: `timeLimitSeconds = 7`, `timeBonusMultiplier = 10`

### 8. 終了条件

| 条件 | 結果 |
|------|------|
| ミス3回（不正解3回） | `failed` → 結果画面 |
| Lv10 黒い閻魔撃破 | `cleared` → 結果画面 |
| プレイヤー離脱 | セッション **保持**（`wave_active` のまま再開可能） |

**制限時間超過（ゲームオーバー廃止）**:

| 項目 | 挙動 |
|------|------|
| セッション | **継続**（`failed` にしない） |
| 回答 | **継続可能**（制限時間後も送信可） |
| 得点（制限内・正解） | `basePoints + timeBonus`（従来どおり） |
| 得点（制限後・正解） | **`basePoints` のみ**（`timeBonus = 0`） |
| 得点（不正解） | 0点（従来どおり） |
| ミス | **加算しない**（時間切れ自体はミスではない） |
| 進行 | 正解/不正解の **回答送信後** に次問へ（自動スキップなし） |
| 残り時間 UI | **表示しない**（採点は内部で従来どおり） |

サーバ: `isQuestionTimedOut` による `finalizeTimeAttackFailure(..., "timeout")` を **削除**。採点時は `remainingSeconds <= 0` なら `timeBonus = 0` とするだけ。開発用 `TIME_ATTACK_COUNTDOWN_DISABLED` フラグは **削除**。

不正解: 0点、ミス+1、**次の問題へ**（リトライなし）

### 9. ウェーブ完了フローと攻撃ポップアップ

1. **5問目**回答処理後、サーバがウェーブ得点を集計
2. 攻撃演出（ゲージ drain → 光が先生へ → 光弾 → 鬼シェイク → HP 更新）は **従来どおり実行**
3. **HP > 0（撃破なし）**: **攻撃ポップアップは出さない**。演出完了後、次ウェーブの第1問へ
4. **HP ≤ 0（撃破）**:
   - 問題進行・キーパッド入力を **停止**
   - 攻撃演出の前段（ゲージ反映〜光弾〜シェイク）の間、**ロード中と同様のぐるぐる + 「読み込み中...」** を全画面表示
   - **「鬼撃破！」** ポップアップを表示
   - **Lv10 黒い閻魔撃破（全クリア）時**: 通常より **長めの撃破エフェクト** を再生し、ポップアップ文言を **「鬼、すべて撃破！」** とする
   - 撃破ボーナス `floor(waveScore × 0.5)` を `totalScore` に加算
   - 爆発 → 次ボス登場演出 → ポップアップ dismiss → 次ウェーブ開始
   - Lv < 9: `currentLevel++`, HP リセット
   - Lv = 9 撃破: Lv10 黒い閻魔へ, HP リセット
   - Lv10 黒い閻魔撃破: **長め撃破エフェクト** → **「鬼、すべて撃破！」** → `cleared` → 結果画面
5. HP > 0: HP 引き継ぎ、同 Lv/同閻魔で次5問生成

**廃止**: 非撃破ウェーブでの **「鬼へ攻撃！」** ポップアップ

### 9. セッション再開

**選択**: 進行中（`time_attack_state.status = 'wave_active'`）のタイムアタックセッションを **1件だけ** 保持し、再開できるようにする

| 項目 | 挙動 |
|------|------|
| 保存 | 各回答・ウェーブ完了ごとに `time_attack_state` と `questions` を DB 更新 |
| 入口 | `/play` のタイムアタック選択時、進行中セッションがあれば **「続きから」** を優先表示 |
| 再開 | 同一 `sessionId`・同一鬼・同一 HP・同一ウェーブ内インデックスから再開 |
| 新規開始 | 「タイムアタックを新しく始める」選択時は確認なしで abandon して新規 |
| 終了後 | `cleared` / `failed` セッションは再開不可 |

**Server Action**: `resumeTimeAttackSessionAction(playerId)` — 進行中セッションと問題配列を返す

### 10. ゲストはロック表示のみ

**選択**: `/play` モード選択でタイムアタックボタンを表示。未ログイン時は disabled + ロック UI。「ログインすると遊べる」等の短い説明。

**理由**: 登録動機の提示。localStorage 実装を避け、サーバ権威を一本化。

### 11. UI コンポーネント構成

```
/play
  └── ModeSelect（通常 / タイムアタック / 続きから）
/play/time-attack
  └── TimeAttackClient
        ├── OniBossDisplay（背景透過鬼/閻魔 + セグメント HP バー）
        ├── TimeAttackScoreBar（5問理論最高 = MAX）
        ├── AlertOverlay（黄=不正解）
        ├── BeamAttackAnimation（ウェーブ完了時、非撃破はポップアップなし）
        ├── DefeatPopup（撃破時「鬼撃破！」／全クリア時「鬼、すべて撃破！」+ 長演出）
        └── Keypad（既存再利用）
/result/time-attack/[sessionId]
  └── TimeAttackResultClient
```

### 12. 鬼のビジュアル

**選択**: Lv1–8 は `/oni.png` ベース + **CSS filter で Lv ごとに色変化**。Lv9 閻魔は **`/enma.png`（フィルターなし）**。Lv10 閻魔は **`/enma-lv10.png`（フィルターなし）**。

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
| `startTimeAttackSessionAction(playerId)` | Lv1・鬼#0・HP 初期化・第1ウェーブ5問生成（`new=1` 時は進行中を abandon） |
| `resumeTimeAttackSessionAction(playerId)` | 進行中セッション・問題配列・状態を返す |
| `submitTimeAttackAnswerAction(sessionId, index, answer, elapsedSeconds)` | 採点（制限後は base のみ）・ミス判定・次問 or ウェーブ完了 |
| `finalizeTimeAttackWaveAction(sessionId)` | ウェーブ集計・HP 更新・撃破/継続/クリア判定（5問目 submit 内から呼び出し可） |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 演出中の待ち時間 | 非撃破はポップアップ省略。次ウェーブ問題をサーバ側で先行生成 |
| 序盤 Lv1–3 が長い | 倍率 ×5 は Lv1–3 のみ。Playtest Targets で 10–15分を確認 |
| 制限後も回答可能 | グレータイマー + ラベルでルール明示。ミス3回が主な終了要因 |
| 5問ウェーブは攻撃演出が頻繁 | 非撃破ポップアップ廃止でテンポ改善 |
| 再開セッションの整合性 | サーバ権威の state + questions。1プレイヤー1進行中 |
| `elapsedSeconds` 改ざん | 将来 `answeredAt` サーバ時刻で検証（初版は既存と同様クライアント送信） |
| モバイル演出負荷 | `prefers-reduced-motion` で警報・ビーム簡略化 |

## Migration Plan

1. Drizzle マイグレーション: `mode`, `time_attack_state`
2. 新 lib + Server Actions + UI
3. `/play` モード選択追加（続きから）
4. 進捗画面にタイムアタック履歴セクション（任意・初版は結果画面のみでも可）

## Open Questions

- タイムアタック履歴を進捗ダッシュボードに載せるか（初版 scope 外でも可）
- 鬼画像アセットの用意方法（プレースホルダ → 後差し替え）
