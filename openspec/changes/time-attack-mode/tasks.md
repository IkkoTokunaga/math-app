## 1. スキーマ・基盤

- [x] 1.1 `sessions.mode`（`'standard' | 'time_attack'`）と `time_attack_state`（JSONB）を Drizzle スキーマに追加する
- [x] 1.2 `docker compose exec app npm run db:generate` でマイグレーションを生成し、`docker compose exec app npm run db:migrate` を実行する
- [x] 1.3 `lib/time-attack.ts` を作成する（閻魔パラメータ、HP 計算、状態遷移ヘルパー）
- [x] 1.4 `lib/time-attack-scoring.ts` を作成する（得点・理論最高・撃破ボーナス、ストリーク除外）

## 2. Server Actions

- [x] 2.1 `startTimeAttackSessionAction` を実装する（Lv1 開始、第1ウェーブ10問生成、初期 HP）
- [x] 2.2 `submitTimeAttackAnswerAction` を実装する（正誤・得点・ミス/時間切れ・次問）
- [x] 2.3 ウェーブ完了処理を実装する（10問集計、HP 減算、撃破判定、Lv/閻魔進行、#10 クリア）
- [x] 2.4 タイムアタックセッション終了・結果保存処理を実装する

## 3. ルーティング・モード選択

- [x] 3.1 `/play` に通常 / タイムアタックのモード選択 UI を追加する
- [x] 3.2 ゲスト向けにタイムアタック入口を表示しつつロック状態にする
- [x] 3.3 `/play/time-attack` ルートと `TimeAttackClient` の骨格を作成する

## 4. タイムアタック UI（クイズ中）

- [x] 4.1 問題表示・テンキー・キーボード入力を既存コンポーネントから再利用する
- [x] 4.2 問題ごとのカウントダウンタイマーを表示する（1秒猶予込み）
- [x] 4.3 残5秒以下の赤警報エフェクトを実装する
- [x] 4.4 不正解時の黄警報エフェクトを実装する
- [x] 4.5 10問ウェーブ用加点バー（理論最高 = MAX）を実装する
- [x] 4.6 鬼 / 閻魔の背景画像・HP バーを実装する（Lv ごとの色変化、閻魔専用画像）
- [x] 4.7 ウェーブ完了時のビーム攻撃演出を実装する
- [x] 4.8 ミス3回・時間切れ・閻魔#10撃破時の画面遷移を実装する
- [x] 4.9 `prefers-reduced-motion` 向けに警報・ビーム演出を簡略化する

## 5. 結果画面

- [x] 5.1 `/result/time-attack/[sessionId]` と `TimeAttackResultClient` を作成する
- [x] 5.2 総得点・到達 Lv/閻魔・撃破数・クリア/ゲームオーバー表示を実装する
- [x] 5.3 星評価を表示しないことを確認する

## 6. テスト・検証

- [x] 6.1 `lib/time-attack-scoring.ts` のユニットテスト（Lv1–9、閻魔 #1–#10、HP85%、撃破ボーナス）
- [x] 6.2 `lib/time-attack.ts` の状態遷移テスト（HP 引き継ぎ、Lv 進行、#10 クリア）
- [x] 6.3 `docker compose exec app npm run lint` と `docker compose exec app npm test` が通ることを確認する

## 7. 手動確認

- [ ] 7.1 会員: Lv1 開始 → 鬼撃破 → Lv10 閻魔 → #10 クリアまで通しプレイ
- [ ] 7.2 会員: 3ミス終了、時間切れ終了、HP 引き継ぎ再開
- [ ] 7.3 ゲスト: タイムアタックが見えるがプレイ不可
- [ ] 7.4 通常モードの Lv 解放がタイムアタック結果で変わらないこと
