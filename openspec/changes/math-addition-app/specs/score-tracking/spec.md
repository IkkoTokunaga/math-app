## ADDED Requirements

### Requirement: Per-question scoring

Each question SHALL award points when answered correctly. Incorrect submissions before the correct answer do NOT reduce the score; the player MUST answer correctly to advance.

When the player submits the correct answer, points are calculated as:

```
basePoints   = level × 10
timeBonus    = level × remainingSeconds   (if answered within 10 seconds, else 0)
pointsEarned = basePoints + timeBonus
```

Where `remainingSeconds = max(0, 10 - floor(elapsedSeconds))`.

#### Scenario: Correct on first attempt quickly
- **WHEN** a player submits the correct answer on the first attempt within 10 seconds at level 1
- **THEN** the question awards at least 10 base points plus a time bonus

#### Scenario: Correct after retries
- **WHEN** a player submits wrong answers and then the correct answer
- **THEN** the question awards points based only on level and elapsed time at the moment of the correct submission (retries do not deduct points)

#### Scenario: Slow answer
- **WHEN** a player submits the correct answer after 10 or more seconds
- **THEN** the question awards base points only (no time bonus)

### Requirement: Session score

The session score SHALL be the sum of all question points plus streak bonuses. The maximum possible score depends on level, question count (10), and achievable time bonuses.

#### Scenario: Session total
- **WHEN** a session completes
- **THEN** totalScore equals the sum of question points plus streak bonuses

### Requirement: Accuracy display

Accuracy SHALL be based on **first-attempt correctness** per question (whether the first submission was correct), independent of points earned after retries or response time.

#### Scenario: Accuracy calculation
- **WHEN** a session completes with 8 first-attempt correct out of 10
- **THEN** accuracy is displayed as 80%

### Requirement: Star rating (0–5)

Star rating SHALL be based on the ratio of total session score to the theoretical maximum possible score for that level and session length (10 questions).

| Stars | Score ratio (totalScore ÷ maxPossibleScore) |
|-------|---------------------------------------------|
| ★★★★★ (5) | ≥ 90% |
| ★★★★☆ (4) | 72–89% |
| ★★★☆☆ (3) | 54–71% |
| ★★☆☆☆ (2) | 36–53% |
| ★☆☆☆☆ (1) | 18–35% |
| ☆☆☆☆☆ (0) | < 18% |

The theoretical maximum score is NOT revealed to the player.

#### Scenario: Five stars
- **WHEN** a session ends with totalScore at or above 90% of the theoretical maximum
- **THEN** the star rating is ★★★★★

#### Scenario: Four stars
- **WHEN** a session ends with totalScore between 72% and 89% of the theoretical maximum
- **THEN** the star rating is ★★★★

### Requirement: Streak bonus

The system SHALL award bonus points for consecutive first-attempt correct answers within a session.

| Consecutive first-attempt correct | Bonus |
|-----------------------------------|-------|
| 3 | +5 |
| 5 | +10 |
| 7 | +15 |
| 10 | +20 |

#### Scenario: Streak bonus at 3
- **WHEN** a player answers 3 questions correctly on the first attempt in a row
- **THEN** a +5 bonus is added to the session score

#### Scenario: Streak bonus at 10
- **WHEN** a player answers all 10 questions correctly on the first attempt in a row
- **THEN** streak bonuses at milestones 3, 5, 7, and 10 are all applied

### Requirement: Perfect session for level unlock

A session SHALL be considered perfect for level unlock when the player earns ★★★★★ (5 stars) OR achieves the theoretical maximum total score.

#### Scenario: Perfect via five stars
- **WHEN** a session ends with ★★★★★
- **THEN** the session qualifies as perfect for instant next-level unlock

#### Scenario: Perfect via max score
- **WHEN** a session ends with totalScore equal to the theoretical maximum
- **THEN** the session qualifies as perfect for instant next-level unlock even if star calculation differs

### Requirement: Growth message

The system SHALL compare the current session to the player's most recent session at the same level and display an encouraging message. Comparison uses first-attempt correct count.

#### Scenario: Improvement in correct count
- **WHEN** the current session has more first-attempt correct answers than the previous session at the same level
- **THEN** the system displays "前回より +N 問 改善！"

#### Scenario: First session at level
- **WHEN** there is no previous session at the same level
- **THEN** the system displays "今日も がんばったね！"

### Requirement: Session persistence

The system SHALL save each completed session to Neon PostgreSQL with the following fields: playerId, level, totalQuestions, correctAnswers (first-attempt correct count), accuracy (first-attempt), stars, baseScore, bonusScore, totalScore, bestStreak, playedAt.

#### Scenario: Save session
- **WHEN** a session completes
- **THEN** the session record is persisted to the database

### Requirement: Question log persistence

The system SHALL save each question's operands, final user answer, correct answer, incorrect submission count, points earned, and first-attempt isCorrect flag linked to the session when the player answers the question correctly.

#### Scenario: Save question log on completion
- **WHEN** a player submits the correct answer for a question (after any number of retries)
- **THEN** a question_log record is created with incorrectCount, pointsEarned, and isFirstAttemptCorrect

#### Scenario: Retries before completion
- **WHEN** a player submits a wrong answer and has not yet answered correctly
- **THEN** no question_log record is created yet for that question

### Requirement: Player selection

The system SHALL allow selecting a player profile without authentication. Each player has a name and tracks their own sessions independently.

#### Scenario: Select player
- **WHEN** a user selects or creates a player profile
- **THEN** subsequent sessions are recorded under that player

#### Scenario: Create player
- **WHEN** a user enters a new player name
- **THEN** a new player record is created in the database
