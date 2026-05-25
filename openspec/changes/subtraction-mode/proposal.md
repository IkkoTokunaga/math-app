## Why

足し算に続き、小学1〜2年生向けの引き算練習が必要。足し算と同じ「10問セッション・星評価・レベル解放」の学習体験を引き算にも提供し、演算ごとに独立した成長が見えるようにする。

## What Changes

- **引き算通常モード**を新規追加する（10問 × 10レベル、足し算と同じ UI・入力・得点ルール）
- プレイ画面に **演算選択**（足し算 / 引き算）を追加する
- 引き算専用の問題生成（繰り下がりあり/なし、2項・3項）を `lib/subtraction-questions.ts` に実装する
- セッション・レベル解放・解放演出を **演算ごとに独立** して管理する
- 進捗画面に引き算の履歴・レベル進行・苦手な組み合わせを表示する

## Capabilities

### New Capabilities

- `subtraction-quiz`: 引き算問題の出題、回答、10段階レベル、セッション進行

### Modified Capabilities

- `addition-quiz`: 演算選択（足し算 / 引き算）、引き算通常モードへの遷移
- `score-tracking`: 引き算セッションの保存（`operation` フィールド）、結果画面の引き算算式表示
- `progress-dashboard`: 演算別の履歴・週平均・レベル進行・苦手な組み合わせ

## Non-Goals

- 引き算タイムアタック（将来検討）
- 乗算・除算
- 足し算と引き算のレベル解放の共有（演算ごとに独立）
- タイムアタックへの引き算対応
- 負の答え（差が 0 未満になる問題は出題しない）

## Impact

- **スキーマ**: `sessions.operation`（`'addition' | 'subtraction'`）、`player_unlock_celebrations` に `operation` を追加
- **新規 lib**: `lib/subtraction-questions.ts`（繰り下がり判定、レベル別生成）
- **既存 lib 拡張**: `lib/levels.ts`（演算別解放）、`lib/progress.ts`（演算別集計）
- **UI**: `PlayClient` に演算タブ、`SubtractionPlayClient` または演算分岐
- **Server Actions**: 引き算セッション開始・回答・完了（既存 actions の `operation` 対応）
