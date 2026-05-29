import {
  boolean,
  jsonb,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export type Question = {
  operandA: number;
  operandB: number;
  operandC?: number;
};

export type AttemptCounts = Record<string, number>;

export type SessionMode = "standard" | "time_attack";

export type SessionOperation = "addition" | "subtraction";

export type TimeAttackPhase = "wave_active" | "cleared" | "failed";

export type TimeAttackState = {
  currentLevel: number;
  enmaNumber: number;
  oniHpRemaining: number;
  oniHpMax: number;
  mistakeCount: number;
  waveQuestionIndex: number;
  globalQuestionIndex: number;
  waveScoreAccumulated: number;
  totalScore: number;
  timeLimitSeconds: number;
  timeBonusMultiplier: number;
  bossesDefeated: number;
  phase: TimeAttackPhase;
  failReason?: "timeout" | "mistakes";
  timeMagicPenaltyAtQuestionIndex?: number;
  specialGaugeCharge: number;
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const players = pgTable(
  "players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("players_user_id_unique").on(table.userId)],
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id")
    .references(() => players.id)
    .notNull(),
  level: smallint("level").notNull(),
  operation: varchar("operation", { length: 20 }).notNull().default("addition"),
  mode: varchar("mode", { length: 20 }).notNull().default("standard"),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"),
  questions: jsonb("questions").$type<Question[]>().notNull(),
  timeAttackState: jsonb("time_attack_state").$type<TimeAttackState>(),
  attemptCounts: jsonb("attempt_counts")
    .$type<AttemptCounts>()
    .notNull()
    .default({}),
  totalQuestions: smallint("total_questions").notNull().default(10),
  correctAnswers: smallint("correct_answers"),
  accuracy: smallint("accuracy"),
  stars: smallint("stars"),
  baseScore: smallint("base_score"),
  bonusScore: smallint("bonus_score"),
  totalScore: smallint("total_score"),
  bestStreak: smallint("best_streak"),
  playedAt: timestamp("played_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const playerUnlockCelebrations = pgTable(
  "player_unlock_celebrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id")
      .references(() => players.id, { onDelete: "cascade" })
      .notNull(),
    level: smallint("level").notNull(),
    operation: varchar("operation", { length: 20 }).notNull().default("addition"),
    celebratedAt: timestamp("celebrated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("player_unlock_celebrations_player_operation_level").on(
      table.playerId,
      table.operation,
      table.level,
    ),
  ],
);

export const questionLogs = pgTable("question_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => sessions.id)
    .notNull(),
  questionIndex: smallint("question_index").notNull(),
  operandA: smallint("operand_a").notNull(),
  operandB: smallint("operand_b").notNull(),
  operandC: smallint("operand_c"),
  userAnswer: smallint("user_answer").notNull(),
  correctAnswer: smallint("correct_answer").notNull(),
  incorrectCount: smallint("incorrect_count").notNull().default(0),
  pointsEarned: smallint("points_earned").notNull(),
  isFirstAttemptCorrect: boolean("is_first_attempt_correct").notNull(),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
});

export const accessLogs = pgTable("access_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 1024 }),
  path: varchar("path", { length: 255 }).notNull(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
  guestSessionId: varchar("guest_session_id", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

