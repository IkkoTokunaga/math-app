import { getSessionScoreDetails } from "@/lib/scoring";
import type { Level } from "@/lib/questions";

type QuestionLog = {
  questionIndex: number;
  operandA: number;
  operandB: number;
  pointsEarned: number;
  isFirstAttemptCorrect: boolean;
};

type SessionScoreBreakdownProps = {
  level: Level;
  questionLogs: QuestionLog[];
};

export function SessionScoreBreakdown({ level, questionLogs }: SessionScoreBreakdownProps) {
  const { baseScore, timeBonus, streakBonus, totalScore } = getSessionScoreDetails(
    level,
    questionLogs,
  );

  return (
    <section className="mt-2 text-left">
      <h2 className="mb-3 text-center text-lg font-bold">配点の詳細</h2>

      <dl className="flex flex-col gap-2">
        <div className="row-item flex items-center justify-between">
          <dt className="text-muted">基本点</dt>
          <dd>{baseScore}点</dd>
        </div>
        {timeBonus > 0 && (
          <div className="row-item flex items-center justify-between">
            <dt className="text-muted">時間ボーナス</dt>
            <dd className="text-success">+{timeBonus}点</dd>
          </div>
        )}
        {streakBonus > 0 && (
          <div className="row-item flex items-center justify-between">
            <dt className="text-muted">連続正解ボーナス</dt>
            <dd className="text-success">+{streakBonus}点</dd>
          </div>
        )}
        <div className="row-item flex items-center justify-between font-bold">
          <dt>合計</dt>
          <dd className="text-accent">{totalScore}点</dd>
        </div>
      </dl>

      <h3 className="mb-2 mt-6 text-center text-sm font-bold text-muted">問題ごと</h3>
      <ol className="flex flex-col gap-2">
        {questionLogs.map((log) => (
          <li
            key={log.questionIndex}
            className="row-item flex items-center justify-between gap-3 text-sm"
          >
            <span>
              {log.questionIndex + 1}問目 {log.operandA} + {log.operandB}
              {!log.isFirstAttemptCorrect && (
                <span className="ml-2 text-dim">（リトライ）</span>
              )}
            </span>
            <span>{log.pointsEarned}点</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
