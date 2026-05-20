## Why

小学生（1〜2年生）向けの足し算練習アプリを作り、正答率や星評価を記録することで「上達が見える」学習体験を提供する。紙のドリルでは履歴が残らず、子どもも保護者も成長を実感しにくいため、Web アプリとして手軽に繰り返し練習できる環境が必要。

## What Changes

- 10問構成の足し算クイズ（4段階の難易度レベル）を新規作成する
- 星評価・得点・連続正解ボーナス・前回比メッセージによるスコアリングを導入する
- セッション結果と問題ごとの正誤を Neon PostgreSQL に保存する
- 最近の結果・週平均正答率・連続学習日数を表示する進捗画面を追加する
- 家族利用向けにプレイヤー（子ども）選択機能を追加する（認証なし）

## Capabilities

### New Capabilities

- `addition-quiz`: 足し算問題の出題、回答、レベル管理、セッション進行
- `score-tracking`: 得点・星・連続正解ボーナスの計算とセッション結果の保存
- `progress-dashboard`: 履歴一覧、週次統計、連続学習日数、成長メッセージの表示

### Modified Capabilities

（既存 spec なし）

## Non-Goals

- ユーザー認証・ログイン（MVP ではプレイヤー選択のみ）
- 商用公開・有料化（Vercel Hobby / Neon Free の範囲内）
- 速度を点数に含める競争要素
- 他者とのランキング比較
- 引き算・乗算など足し算以外の演算

## Impact

- **新規コード**: Next.js プロジェクト全体（フロント、API Routes、DB スキーマ）
- **外部サービス**: Vercel（ホスティング）、Neon（本番 PostgreSQL）
- **ローカル開発**: Docker Compose（Next.js + PostgreSQL）
- **依存関係**: Next.js, Drizzle ORM, postgres (postgres.js), Tailwind CSS
- **データ**: `players`, `sessions`, `question_logs` テーブル
