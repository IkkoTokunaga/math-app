import { getDb } from "@/lib/db";
import { players, questionLogs, sessions, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import type { GuestStoreSnapshot } from "@/lib/guest/types";
import type { AttemptCounts, Question } from "@/lib/db/schema";

function validateGuestSnapshot(snapshot: GuestStoreSnapshot): void {
  if (snapshot.version !== 1) {
    throw new Error("データ形式が正しくありません");
  }
}

export async function importGuestData(
  email: string,
  password: string,
  childName: string,
  snapshot: GuestStoreSnapshot,
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

    return { userId: user.id, playerId: player.id };
  });
}
