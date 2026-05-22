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

### Requirement: Live score during quiz

During an active quiz session, the system SHALL display the player's accumulated score in the top-right of the quiz header. The displayed score SHALL be the sum of question `pointsEarned` plus any streak milestone bonuses earned so far during the session. Below the header, the system SHALL display a progress bar filled according to the running total score relative to the theoretical maximum. The bar SHALL NOT show a large star row or points-to-next-star text. Instead, the bar element SHALL include milestone markers at each star threshold (★1 through ★5). Each marker SHALL use a single horizontal anchor so the star sits directly above the vertical line on the track at that star's score threshold.

#### Scenario: Milestone markers on quiz bar
- **WHEN** a player is answering questions during an active quiz session
- **THEN** the quiz view shows a progress bar with five milestone markers positioned at star thresholds
- **AND** each marker shows a star directly above its vertical line; the line SHALL be positioned on the track at that star's score threshold (same percentage as the bar fill scale)
- **AND** earned milestones show a filled star (★) and unearned milestones show an empty star (☆)

#### Scenario: Score updates on correct answer
- **WHEN** a player submits a correct answer during a quiz
- **THEN** the top-right score increases by that question's `pointsEarned` and any streak milestone bonus awarded on that answer
- **AND** the progress bar fill and milestone stars update to reflect the new running total
- **AND** the bar fill animates smoothly from its current position to the new fill level after each score increment lands in the total
- **AND** while the bar is filling, its color transitions from light blue toward orange based on fill progress
- **AND** when a milestone star is newly earned during the fill animation, that star pops in with a brief scale animation

#### Scenario: Reduced motion for live progress bar
- **WHEN** the user prefers reduced motion
- **THEN** the live progress bar fill and milestone stars update immediately without fill or pop animations

#### Scenario: Perfect stars on final question
- **WHEN** a player submits a correct answer on the last question of a session and the resulting score earns 5 stars
- **THEN** after the final score increment lands in the total, the live progress bar animates to the right end of the track (100% fill) instead of stopping at the score ratio alone
- **AND** the bar switches to the rainbow appearance when the fill completes
- **AND** navigation to the result screen waits long enough for the completion fill animation to finish unless reduced motion is enabled

#### Scenario: Score resets on new session
- **WHEN** a player starts a new quiz session or returns to level selection
- **THEN** the displayed score resets to 0

#### Scenario: Points earned feedback
- **WHEN** a player submits a correct answer
- **THEN** the success feedback shows how many points were earned (e.g. "+15点")
- **AND** when a streak milestone bonus applies, the feedback also shows a streak bonus line (e.g. "+5 連続ボーナス!") that pops in immediately below the question points in a quick chained animation
- **AND** the question points and any streak bonus line animate sequentially into the top-right total score
- **AND** the total updates only after each merge animation completes

#### Scenario: Reduced motion for score animation
- **WHEN** the user prefers reduced motion
- **THEN** the earned points and any bonus lines are shown in feedback and added to the total immediately without a fly animation

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

### Requirement: Star progress on result screen

The session result screen SHALL show a progress bar from the current star rating toward the next star. When the player has fewer than 5 stars, the screen SHALL display how many more points are needed to reach the next star. When the player has 5 stars, the bar SHALL show full progress with a congratulatory message instead of a points-to-next target. Star acquisition and bar fill SHALL animate in sync on the result screen using a shared progress value. While the bar is filling, its color SHALL transition from light blue toward orange based on fill progress. When the animation completes with 5 stars, the bar SHALL switch to a rainbow appearance; for fewer than 5 stars, the bar SHALL remain in the blue-to-orange scheme after completion. The points-to-next message SHALL appear after the animation completes. Animations SHALL be disabled when the user prefers reduced motion.

#### Scenario: Synchronized star and bar animation
- **WHEN** a player views the result screen after completing a session
- **THEN** earned stars appear sequentially with a pop effect while the progress bar fills over the same duration
- **AND** the last earned star in the sequence plays a larger pop that settles back to normal size

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** the result screen shows final stars and bar width immediately without animation

#### Scenario: Points to next star
- **WHEN** a player completes a session with fewer than 5 stars
- **THEN** the result screen shows a bar filled according to progress within the current star tier and text such as "あと N 点で ★★★☆☆"

#### Scenario: Maximum stars
- **WHEN** a player completes a session with 5 stars
- **THEN** the result screen shows a full progress bar and a maximum-star congratulatory message without revealing the theoretical maximum score
- **AND** all five stars display a continuous sparkle effect after the reveal animation completes, following a short delay so the final star pop can settle

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

### Requirement: Score breakdown on result screen

The session result screen SHALL display a score breakdown with base points, time bonus, streak bonus (each bonus line only when greater than zero), session total, and per-question points earned. Per-question rows SHALL show the addition expression and a retry label when the first submission was incorrect.

#### Scenario: Result screen score details
- **WHEN** a player completes a session and views the result screen
- **THEN** the screen shows 配点の詳細 with base points, applicable bonuses, total score, and a per-question list with points earned

#### Scenario: Retry question in breakdown
- **WHEN** a question was answered correctly after one or more wrong attempts
- **THEN** the per-question row shows a retry label and still displays the points earned at the correct submission

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
