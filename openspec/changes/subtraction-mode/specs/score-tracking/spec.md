## ADDED Requirements

### Requirement: Subtraction session persistence

The system SHALL save each completed subtraction session with `operation = 'subtraction'` and `mode = 'standard'`, using the same score fields as addition standard sessions (stars, baseScore, bonusScore, totalScore, bestStreak, accuracy, correctAnswers).

#### Scenario: Save subtraction session
- **WHEN** a subtraction session completes
- **THEN** the session record is persisted with `operation = 'subtraction'`

#### Scenario: Addition sessions unchanged
- **WHEN** an addition session completes
- **THEN** the session record is persisted with `operation = 'addition'` (or default)

### Requirement: Subtraction question log persistence

The system SHALL save subtraction question logs using the same schema as addition. `operandA` SHALL store the minuend, `operandB` and optional `operandC` SHALL store subtrahends. `correctAnswer` SHALL store the non-negative difference.

#### Scenario: Save subtraction question log
- **WHEN** a player submits the correct answer for a subtraction question
- **THEN** a question_log record is created with operands and correct difference

### Requirement: Subtraction score breakdown on result screen

The session result screen SHALL display subtraction expressions in the per-question breakdown using `-` (e.g. `45 - 12 = 33`, `50 - 12 - 8 = 30`). Scoring breakdown rules (base points, time bonus, streak bonus) SHALL match addition standard mode.

#### Scenario: Subtraction result breakdown
- **WHEN** a player completes a subtraction session and views the result screen
- **THEN** each per-question row shows the subtraction expression and points earned

### Requirement: Subtraction growth message

The system SHALL compare the current subtraction session to the player's most recent subtraction session at the same level (same operation and level), using first-attempt correct count.

#### Scenario: Subtraction improvement message
- **WHEN** the current subtraction session has more first-attempt correct answers than the previous subtraction session at the same level
- **THEN** the system displays "前回より +N 問 改善！"

#### Scenario: First subtraction session at level
- **WHEN** there is no previous subtraction session at the same level
- **THEN** the system displays "今日も がんばったね！"

## MODIFIED Requirements

### Requirement: Score breakdown on result screen

The session result screen SHALL display a score breakdown with base points, time bonus, streak bonus (each bonus line only when greater than zero), session total, and per-question points earned. Per-question rows SHALL show the expression using `+` for addition sessions and `-` for subtraction sessions (two or three operands as applicable), and a retry label when the first submission was incorrect.

#### Scenario: Result screen score details
- **WHEN** a player completes a session and views the result screen
- **THEN** the screen shows 配点の詳細 with base points, applicable bonuses, total score, and a per-question list with points earned

#### Scenario: Retry question in breakdown
- **WHEN** a question was answered correctly after one or more wrong attempts
- **THEN** the per-question row shows a retry label and still displays the points earned at the correct submission

### Requirement: Growth message

The system SHALL compare the current session to the player's most recent session at the **same operation and level** and display an encouraging message. Comparison uses first-attempt correct count.

#### Scenario: Improvement in correct count
- **WHEN** the current session has more first-attempt correct answers than the previous session at the same operation and level
- **THEN** the system displays "前回より +N 問 改善！"

#### Scenario: First session at level
- **WHEN** there is no previous session at the same operation and level
- **THEN** the system displays "今日も がんばったね！"

### Requirement: Session persistence

The system SHALL save each completed session to Neon PostgreSQL with the following fields: playerId, **operation**, level, totalQuestions, correctAnswers (first-attempt correct count), accuracy (first-attempt), stars, baseScore, bonusScore, totalScore, bestStreak, playedAt.

#### Scenario: Save session
- **WHEN** a session completes
- **THEN** the session record is persisted to the database including the operation field
