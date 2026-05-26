import { getDb } from "@/lib/db";
import { players, questionLogs, sessions, users } from "@/lib/db/schema";
import type {
  AttemptCounts,
  Question,
  TimeAttackState as DbTimeAttackState,
} from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import type {
  GuestCompletedTimeAttackSession,
  GuestQuestionLog,
  GuestStoreSnapshot,
  GuestTimeAttackInProgress,
} from "@/lib/guest/types";
import type { Operation } from "@/lib/operations";
import { importMemberCelebratedLevels } from "@/lib/unlock-celebration-db";
import { MAX_MISTAKES, WAVE_QUESTION_COUNT } from "@/lib/time-attack-scoring";
import type { TimeAttackState } from "@/lib/time-attack";

export type CelebratedLevelsByOperation = Partial<Record<Operation, readonly number[]>>;

function validateGuestSnapshot(snapshot: GuestStoreSnapshot): void {
  if (snapshot.version !== 1) {
    throw new Error("データ形式が正しくありません");
  }
}

function questionsFromLogs(logs: GuestQuestionLog[]): Question[] {
  return logs.map((log) => ({
    operandA: log.operandA,
    operandB: log.operandB,
    ...(log.operandC != null ? { operandC: log.operandC } : {}),
  }));
}

function serializeTimeAttackState(state: TimeAttackState): DbTimeAttackState {
  return { ...state };
}

function isResumableTimeAttack(state: TimeAttackState): boolean {
  return state.phase === "wave_active" && state.mistakeCount < MAX_MISTAKES;
}

async function insertQuestionLogs(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  sessionId: string,
  logs: GuestQuestionLog[],
  answeredAt: Date,
) {
  if (logs.length === 0) {
    return;
  }

  await tx.insert(questionLogs).values(
    logs.map((log) => ({
      sessionId,
      questionIndex: log.questionIndex,
      operandA: log.operandA,
      operandB: log.operandB,
      operandC: log.operandC ?? null,
      userAnswer: log.userAnswer,
      correctAnswer: log.correctAnswer,
      incorrectCount: log.incorrectCount,
      pointsEarned: log.pointsEarned,
      isFirstAttemptCorrect: log.isFirstAttemptCorrect,
      answeredAt,
    })),
  );
}

async function importCompletedTimeAttackSession(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  playerId: string,
  completed: GuestCompletedTimeAttackSession,
) {
  const playedAt = new Date(completed.playedAt);
  const [session] = await tx
    .insert(sessions)
    .values({
      playerId,
      level: completed.level,
      operation: completed.operation,
      mode: "time_attack",
      status: "completed",
      questions: questionsFromLogs(completed.questionLogs),
      attemptCounts: {} as AttemptCounts,
      totalQuestions: WAVE_QUESTION_COUNT,
      totalScore: completed.totalScore,
      timeAttackState: serializeTimeAttackState(completed.timeAttackState),
      playedAt,
      completedAt: playedAt,
      stars: null,
      correctAnswers: null,
      accuracy: null,
      baseScore: null,
      bonusScore: null,
      bestStreak: null,
    })
    .returning();

  await insertQuestionLogs(tx, session.id, completed.questionLogs, playedAt);
}

async function importInProgressTimeAttackSession(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  playerId: string,
  inProgress: GuestTimeAttackInProgress,
) {
  const state = inProgress.timeAttackState;
  const resumable = isResumableTimeAttack(state);
  const playedAt = new Date(inProgress.startedAt);
  const finalizedState: TimeAttackState = resumable
    ? state
    : { ...state, phase: "failed" };

  const [session] = await tx
    .insert(sessions)
    .values({
      playerId,
      level: finalizedState.currentLevel,
      operation: inProgress.operation,
      mode: "time_attack",
      status: resumable ? "in_progress" : "completed",
      questions: inProgress.questions,
      attemptCounts: {} as AttemptCounts,
      totalQuestions: WAVE_QUESTION_COUNT,
      totalScore: finalizedState.totalScore,
      timeAttackState: serializeTimeAttackState(finalizedState),
      playedAt,
      completedAt: resumable ? null : playedAt,
      stars: null,
      correctAnswers: null,
      accuracy: null,
      baseScore: null,
      bonusScore: null,
      bestStreak: null,
    })
    .returning();

  await insertQuestionLogs(tx, session.id, inProgress.questionLogs, playedAt);
}

export async function importGuestData(
  email: string,
  password: string,
  childName: string,
  snapshot: GuestStoreSnapshot,
  celebratedLevels: CelebratedLevelsByOperation = {},
): Promise<{ userId: string; playerId: string }> {
  validateGuestSnapshot(snapshot);

  const displayName = childName.trim().slice(0, 50);
  if (!displayName) {
    throw new Error("名前を入力してください");
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    throw new Error("メールとパスワードを入力してください");
  }
  if (password.length < 8) {
    throw new Error("パスワードは8文字以上にしてください");
  }

  const passwordHash = await hashPassword(password);

  return getDb().transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: trimmedEmail, passwordHash })
      .returning();

    const [player] = await tx
      .insert(players)
      .values({ userId: user.id, name: displayName })
      .returning();

    for (const completed of snapshot.completedSessions) {
      const [session] = await tx
        .insert(sessions)
        .values({
          playerId: player.id,
          level: completed.level,
          operation: completed.operation ?? "addition",
          status: "completed",
          questions: completed.questionLogs.map((log) => ({
            operandA: log.operandA,
            operandB: log.operandB,
            ...(log.operandC != null ? { operandC: log.operandC } : {}),
          })) as Question[],
          attemptCounts: {} as AttemptCounts,
          totalQuestions: completed.questionLogs.length,
          correctAnswers: completed.correctAnswers,
          accuracy: completed.accuracy,
          stars: completed.stars,
          baseScore: completed.baseScore,
          bonusScore: completed.bonusScore,
          totalScore: completed.totalScore,
          bestStreak: completed.bestStreak,
          playedAt: new Date(completed.playedAt),
          completedAt: new Date(completed.playedAt),
        })
        .returning();

      if (completed.questionLogs.length > 0) {
        await tx.insert(questionLogs).values(
          completed.questionLogs.map((log) => ({
            sessionId: session.id,
            questionIndex: log.questionIndex,
            operandA: log.operandA,
            operandB: log.operandB,
            operandC: log.operandC ?? null,
            userAnswer: log.userAnswer,
            correctAnswer: log.correctAnswer,
            incorrectCount: log.incorrectCount,
            pointsEarned: log.pointsEarned,
            isFirstAttemptCorrect: log.isFirstAttemptCorrect,
            answeredAt: new Date(completed.playedAt),
          })),
        );
      }
    }

    for (const completed of snapshot.completedTimeAttackSessions ?? []) {
      await importCompletedTimeAttackSession(tx, player.id, completed);
    }

    for (const inProgress of Object.values(snapshot.timeAttackInProgress ?? {})) {
      if (inProgress) {
        await importInProgressTimeAttackSession(tx, player.id, inProgress);
      }
    }

    for (const operation of ["addition", "subtraction"] as Operation[]) {
      await importMemberCelebratedLevels(
        player.id,
        celebratedLevels[operation] ?? [],
        operation,
        tx,
      );
    }

    return { userId: user.id, playerId: player.id };
  });
}
