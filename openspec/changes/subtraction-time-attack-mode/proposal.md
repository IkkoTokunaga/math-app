## Why

引き算通常モードは追加済みだが、足し算と同様の「鬼退治」タイムアタックがなく、速度・没入感のある引き算練習が不足している。足し算タイムアタックと同じゲーム体験を引き算にも提供し、演算ごとに独立した再挑戦動機を持たせる。

## What Changes

- **引き算タイムアタック**を新規追加（会員のみ、ゲストはロック表示）
- 足し算 TA と同じルール（5問ウェーブ、鬼/閻魔、3ミス終了、HP 倍率、撃破ボーナス、再開）
- 問題生成は **引き算専用**（Lv1–6 は通常引き算ルール、Lv7–10 は TA 専用）
- マスコットは **水色スーツ**（引き算通常と同じ）
- セッションは `operation='subtraction', mode='time_attack'` で保存
- 足し算 TA とは **進行中セッションを独立**（演算ごとに最大1件ずつ再開可）
- 引き算通常モードのレベル解放には影響しない

## Capabilities

### New Capabilities

（新 capability なし — 既存 `time-attack` を演算対応に拡張）

### Modified Capabilities

- `time-attack`: 引き算 TA セッション、問題生成、再開、結果画面
- `subtraction-quiz`: 引き算タブにタイムアタック入口を追加
- `guest-play`: 引き算 TA もゲスト不可（ロック表示）
- `score-tracking`: 引き算 TA 結果（算式 `-` 表示）

## Non-Goals

- 引き算 TA 結果による通常モード Lv 解放
- ゲスト localStorage での引き算 TA
- 足し算と引き算 TA の統合セッション（同時進行の1セッション）
- ランキング・他者比較
- 3項引き算（TA 中は **2項のみ**、通常モード Lv7/10 の3項は TA では使わない）
- 減数 0（`8 - 0` 等）の出題

## Impact

- **既存 lib 拡張**: `lib/time-attack-questions.ts` → 演算引数、`lib/subtraction-time-attack-questions.ts` 新設
- **Server Actions**: `time-attack.ts` に `operation` 対応、再開クエリを演算別に
- **UI**: `PlayClient` 引き算タブに TA 入口、`TimeAttackClient` に operation 分岐
- **ルート**: `/play/time-attack?operation=subtraction`
- **DB**: スキーマ変更なし（既存 `operation` + `mode` + `time_attack_state` を利用）
