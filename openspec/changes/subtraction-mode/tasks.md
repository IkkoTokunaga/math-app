## 1. スキーマ・基盤

- [x] 1.1 `sessions.operation`（`'addition' | 'subtraction'`、デフォルト `'addition'`）を Drizzle スキーマに追加する
- [x] 1.2 `player_unlock_celebrations.operation` を追加し、ユニークインデックスを `(player_id, operation, level)` に更新する
- [x] 1.3 `docker compose exec app npm run db:generate` でマイグレーションを生成し、`docker compose exec app npm run db:migrate` を実行する
- [x] 1.4 `lib/subtraction-questions.ts` を作成する（繰り下がり判定、Lv1–10 生成、順序付きユニークキー、正答計算）
- [x] 1.5 `lib/subtraction-questions.test.ts` を作成する（各レベルの制約、非負答え、重複禁止）

## 2. レベル解放・ゲスト対応

- [x] 2.1 `lib/levels.ts` を演算別に拡張する（`getUnlockedLevel(sessions, operation)` 等）
- [x] 2.2 ゲスト localStorage の解放状態・解放演出を演算別キーで管理する
- [x] 2.3 `unlock-celebration` 関連 actions / DB を `operation` 対応にする

## 3. Server Actions

- [x] 3.1 `startSessionAction` に `operation` 引数を追加し、引き算時は `generateSubtractionQuestions` を使う
- [x] 3.2 `submitAnswerAction` の正答判定を演算に応じて分岐する
- [x] 3.3 `getPlayerUnlockedLevelAction` を演算別にする
- [x] 3.4 ゲストセッション（`lib/guest-session.ts`）を引き算対応にする

## 4. プレイ画面 UI

- [x] 4.1 `/play` に足し算 / 引き算の演算選択タブを追加する
- [x] 4.2 引き算選択時はレベル選択のみ表示（タイムアタック非表示）
- [x] 4.3 引き算クイズ画面で算式を `-` 表示にする（`formatSubtractionExpression`）
- [x] 4.4 既存コンポーネント（Keypad, QuizMascot, LiveScoreProgressBar 等）を引き算セッションで再利用する

## 5. 結果・進捗画面

- [x] 5.1 結果画面の per-question 行を演算に応じて `+` / `-` 表示に分岐する
- [x] 5.2 進捗画面に足し算 / 引き算タブを追加する
- [x] 5.3 `GET /api/progress` と `lib/progress.ts` を演算別集計に対応する
- [x] 5.4 苦手な組み合わせを引き算形式（`13 - 7`）で表示する

## 6. テスト・検証

- [x] 6.1 `lib/subtraction-questions.test.ts` で全レベルの生成制約を検証する
- [x] 6.2 `lib/levels.ts` の演算別解放ロジックのテストを追加する
- [x] 6.3 `docker compose exec app npm run lint` と `docker compose exec app npm test` が通ることを確認する

## 7. 手動確認

- [ ] 7.1 引き算 Lv1–10 で10問セッションが完走できること
- [ ] 7.2 繰り下がりあり/なし、2項/3項の算式表示が正しいこと
- [ ] 7.3 足し算のレベル解放が引き算に影響しないこと（逆も同様）
- [ ] 7.4 ゲスト・会員ともに引き算プレイ・結果保存・進捗表示が動くこと
- [ ] 7.5 足し算タイムアタックが引き算追加後も変わらないこと
