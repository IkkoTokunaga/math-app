## ADDED Requirements

### Requirement: Session consists of 20 addition questions

The system SHALL present exactly 20 addition questions per session.

#### Scenario: Start new session
- **WHEN** a player starts a quiz at their current level
- **THEN** the system generates 20 questions for that level

#### Scenario: Session completion
- **WHEN** the player answers the 20th question correctly
- **THEN** the system shows the session result screen

### Requirement: Numeric keypad input

The system SHALL provide an on-screen numeric keypad (0–9) with large touch-friendly buttons for entering answers. The player SHALL submit their answer via an 「答える」 button.

#### Scenario: Enter answer on tablet
- **WHEN** a player taps number buttons and then 「答える」
- **THEN** the system validates the submitted numeric answer

#### Scenario: Empty submission
- **WHEN** a player taps 「答える」 with no digits entered
- **THEN** the system does not submit and keeps the player on the current question

### Requirement: Answer validation

The system SHALL validate each answer immediately after submission.

#### Scenario: Correct answer
- **WHEN** the player submits the correct sum
- **THEN** the system shows positive feedback and advances to the next question

#### Scenario: Incorrect answer
- **WHEN** the player submits a wrong answer
- **THEN** the system shows encouraging feedback (e.g. 「もう一度考えてみよう！」), does NOT reveal the correct answer, clears or allows editing the input, and keeps the player on the same question

#### Scenario: Retry until correct
- **WHEN** a player submits a wrong answer and then submits again
- **THEN** the system re-validates the new answer without advancing until the correct sum is submitted

### Requirement: Four difficulty levels

The system SHALL support four difficulty levels with the following constraints:

| Level | Name | Rule |
|-------|------|------|
| 1 | はじめて | 1-digit + 1-digit, no carry |
| 2 | くりあがり | 1-digit + 1-digit, with carry |
| 3 | 2けた | 2-digit + 1-digit or 2-digit |
| 4 | 2けた+2けた | 2-digit + 2-digit |

#### Scenario: Level 1 question generation
- **WHEN** level is 1
- **THEN** each operand is 1–9 and the sum is at most 9

#### Scenario: Level 2 question generation
- **WHEN** level is 2
- **THEN** each operand is 1–9 and the sum is at least 10

### Requirement: Level unlock progression

The system SHALL unlock higher levels based on past performance.

#### Scenario: Unlock level 2
- **WHEN** a player achieves ★★ or above at level 1 for 3 sessions
- **THEN** level 2 becomes available

#### Scenario: Unlock level 3
- **WHEN** a player achieves ★★ or above at level 2 for 3 sessions
- **THEN** level 3 becomes available

#### Scenario: Unlock level 4
- **WHEN** a player achieves ★★ or above at level 3 for 5 sessions
- **THEN** level 4 becomes available

### Requirement: No duplicate questions in a session

The system SHALL NOT repeat the same operand pair (a, b) within a single session.

#### Scenario: Unique questions
- **WHEN** generating 20 questions for a session
- **THEN** no two questions have the same (operandA, operandB) pair
