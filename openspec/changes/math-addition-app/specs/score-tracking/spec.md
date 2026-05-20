## ADDED Requirements

### Requirement: Per-question scoring

Each question SHALL award up to 10 points. The player MUST answer correctly to advance; each incorrect submission before the correct answer deducts 1 point from that question's score. The minimum score per question is 0 points.

Formula: `questionPoints = max(0, 10 - incorrectSubmissionCount)`

#### Scenario: Correct on first attempt
- **WHEN** a player submits the correct answer on the first attempt
- **THEN** the question awards 10 points

#### Scenario: One incorrect then correct
- **WHEN** a player submits one wrong answer and then the correct answer
- **THEN** the question awards 9 points

#### Scenario: Two incorrect then correct
- **WHEN** a player submits two wrong answers and then the correct answer
- **THEN** the question awards 8 points

#### Scenario: Score floor at zero
- **WHEN** a player submits 10 or more wrong answers and then the correct answer
- **THEN** the question awards 0 points (not negative)

### Requirement: Session score

The session score SHALL be the sum of all question points plus any streak bonuses. The maximum base score (before streak bonuses) is 200 points (20 questions × 10 points).

#### Scenario: Session total
- **WHEN** a session completes
- **THEN** totalScore equals the sum of question points plus streak bonuses

### Requirement: Accuracy and stars

Star rating and accuracy SHALL be based on **first-attempt correctness** per question (whether the first submission was correct), independent of points earned after retries.

| Stars | First-attempt accuracy |
|-------|------------------------|
| ★★★ (3) | 90–100% |
| ★★☆ (2) | 70–89% |
| ★☆☆ (1) | 50–69% |
| ☆☆☆ (0) | 0–49% |

#### Scenario: Three stars
- **WHEN** a session ends with 18 or more first-attempt correct out of 20
- **THEN** the star rating is ★★★

#### Scenario: Two stars
- **WHEN** a session ends with 14 to 17 first-attempt correct out of 20
- **THEN** the star rating is ★★☆

### Requirement: Streak bonus

The system SHALL award bonus points for consecutive correct answers within a session.

| Consecutive correct | Bonus |
|---------------------|-------|
| 3 | +5 |
| 5 | +10 |
| 7 | +15 |
| 10 | +20 |
| 15 | +25 |
| 20 (perfect) | +30 |

#### Scenario: Streak bonus at 3
- **WHEN** a player answers 3 questions correctly on the first attempt in a row
- **THEN** a +5 bonus is added to the session score

#### Scenario: Perfect session bonus
- **WHEN** a player answers all 20 questions correctly on the first attempt
- **THEN** a +30 perfect bonus is added in addition to other streak bonuses

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
- **THEN** a question_log record is created with incorrectSubmissionCount, pointsEarned, and isFirstAttemptCorrect

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
