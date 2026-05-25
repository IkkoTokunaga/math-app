## 1. 問題生成

- [x] 1.1 `lib/subtraction-time-attack-questions.ts` を作成（Lv1–6 は通常引き算生成器再利用、Lv7–10 TA 専用、減数 0 禁止）
- [x] 1.2 `lib/subtraction-time-attack-questions.test.ts` を追加（全レベル制約、非重複）

## 2. Server Actions

- [x] 2.1 `findInProgressTimeAttackSession` / abandon を `operation` 対応にする
- [x] 2.2 `startTimeAttackSessionAction(playerId, operation?)` — 引き算問題生成・`operation` 保存
- [x] 2.3 `resumeTimeAttackSessionAction` / `getTimeAttackResumeInfoAction` を演算別に
- [x] 2.4 `submitTimeAttackAnswerAction` — 正答判定を `getCorrectAnswerForOperation` に

## 3. ルーティング・Play 画面

- [x] 3.1 引き算タブにタイムアタック入口・続きから・新規開始を追加
- [x] 3.2 `/play/time-attack?operation=subtraction` で `TimeAttackClient` に operation を渡す
- [x] 3.3 ゲスト向け引き算 TA ロック表示
- [x] 3.4 `app/play/page.tsx` — 演算別 resume info を取得

## 4. TimeAttackClient

- [x] 4.1 `operation` prop 追加（算式 `-`、maxDigits=3、水色マスコット）
- [x] 4.2 問題生成・再開 API に operation を渡す
- [x] 4.3 結果画面遷移は既存 `/result/time-attack/[sessionId]`（operation は session から）

## 5. 結果画面

- [x] 5.1 引き算 TA 結果で算式を `-` 表示
- [x] 5.2 必要なら「引き算」ラベルを表示

## 6. テスト・検証

- [x] 6.1 `lib/subtraction-time-attack-questions.test.ts` 全レベル
- [x] 6.2 既存 `lib/time-attack*.test.ts` が通ること（addition デフォルト）
- [x] 6.3 `docker compose exec app npm run lint` / `npm test`

## 7. 手動確認

- [ ] 7.1 会員: 引き算 TA Lv1 開始 → 撃破 → Lv10 クリア（または dev ショートカット）
- [ ] 7.2 足し算 TA 進行中 + 引き算 TA 進行中を同時保持・再開
- [ ] 7.3 ゲスト: 引き算 TA が見えるがプレイ不可
- [ ] 7.4 水色マスコット・`-` 算式・減数 0 なし
- [ ] 7.5 足し算 TA が回帰していないこと
