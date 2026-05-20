## 1. プロジェクトセットアップ

- [x] 1.1 Docker Compose 設定を作成する（docker-compose.yml, Dockerfile.dev, .dockerignore）
- [x] 1.2 `docker compose run --rm app npx create-next-app@latest .` で Next.js 15 + TypeScript + Tailwind CSS プロジェクトを作成する
- [x] 1.3 `docker compose run --rm app npm install` で Drizzle ORM, postgres (postgres.js), drizzle-kit をインストールする
- [x] 1.4 `.env.example` を作成し、Docker / 本番の DATABASE_URL を整理する
- [x] 1.5 `docker compose up` で app + db が起動することを確認する
- [x] 1.6 `docker compose exec app npm run lint` が通るよう ESLint / Prettier 設定を整える

## 2. データベース

- [x] 2.1 players, sessions, question_logs テーブルの Drizzle スキーマを定義する
- [x] 2.2 `docker compose exec app npm run db:generate` でマイグレーションを生成する
- [x] 2.3 Docker 内でマイグレーションを実行する（`docker compose exec app npm run db:migrate`）
- [x] 2.4 DB 接続ユーティリティ (lib/db.ts) を作成する

## 3. 足し算クイズ (addition-quiz)

- [x] 3.1 4レベルの問題生成ロジックを実装する (lib/questions.ts)
- [x] 3.2 セッション内での問題重複禁止を実装する
- [x] 3.3 レベル解放判定ロジックを実装する (lib/levels.ts)
- [x] 3.4 プレイヤー選択画面 (/) を作成する
- [x] 3.5 クイズ画面 (/play) を作成する（算式の ? 位置に入力表示・テンキー・Backspace/Delete/Enter・不正解時は再回答を促す・正解で次へ）
- [x] 3.6 startSession / submitAnswer Server Actions を実装する

## 4. スコアリング (score-tracking)

- [x] 4.1 得点計算ロジックを実装する (lib/scoring.ts) — level×10 + 時間ボーナス / 問
- [x] 4.2 星評価・連続正解ボーナス・完璧ボーナスを実装する
- [x] 4.3 前回比成長メッセージ生成を実装する
- [x] 4.4 completeSession Server Action（スコア計算 + DB 保存）を実装する
- [x] 4.5 結果画面 (/result/[sessionId]) を作成する

## 5. 進捗ダッシュボード (progress-dashboard)

- [x] 5.1 最近5セッション取得 API を実装する
- [x] 5.2 週平均正答率・連続学習日数の集計クエリを実装する
- [x] 5.3 よく間違える組み合わせ TOP 3 クエリを実装する
- [x] 5.4 レベル解放進捗表示を実装する
- [x] 5.5 進捗画面 (/progress) を作成する

## 6. UI / UX

- [x] 6.1 子ども向けの大きなボタン・読みやすいフォントの共通スタイルを整える
- [x] 6.2 正解・不正解のフィードバックアニメーションを追加する
- [x] 6.3 タブレット対応のレスポンシブレイアウトを確認する

## 7. デプロイ

- [ ] 7.1 Neon プロジェクトを作成し本番 DATABASE_URL を取得する
- [ ] 7.2 Vercel プロジェクトを作成し Git 連携する
- [ ] 7.3 DATABASE_URL を Vercel 環境変数に設定する
- [ ] 7.4 本番環境でマイグレーションを実行し動作確認する
