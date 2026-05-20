## ADDED Requirements

### Requirement: Session consists of 10 addition questions

The system SHALL present exactly 10 addition questions per session.

#### Scenario: Start new session
- **WHEN** a player starts a quiz at their current level
- **THEN** the system generates 10 questions for that level

#### Scenario: Session completion
- **WHEN** the player answers the 10th question correctly
- **THEN** the system shows the session result screen

### Requirement: Inline answer display

The system SHALL display each question as `operandA + operandB = ?`, where the `?` position shows the player's current numeric input inline. When no digits are entered, `?` is shown.

#### Scenario: Empty input
- **WHEN** the player has not entered any digits for the current question
- **THEN** the equation shows `operandA + operandB = ?`

#### Scenario: Partial input
- **WHEN** the player enters digits via the keypad or keyboard
- **THEN** the entered digits replace `?` inline in the equation (e.g. `3 + 5 = 8`)

### Requirement: Numeric keypad input

The system SHALL provide an on-screen numeric keypad (0–9) with large touch-friendly buttons for entering answers. The keypad layout SHALL follow a calculator-style arrangement (7–8–9 / 4–5–6 / 1–2–3). The player SHALL submit their answer via an 「答える」 button. The system SHALL provide an on-screen backspace button that removes the last entered digit.

Input SHALL accept at most 3 digits per answer.

#### Scenario: Enter answer on tablet
- **WHEN** a player taps number buttons and then 「答える」
- **THEN** the system validates the submitted numeric answer

#### Scenario: Empty submission
- **WHEN** a player taps 「答える」 with no digits entered
- **THEN** the system does not submit and keeps the player on the current question

#### Scenario: Backspace on screen
- **WHEN** a player taps the backspace button after entering digits
- **THEN** the last entered digit is removed from the inline answer display

### Requirement: Keyboard shortcuts

When playing on a device with a physical keyboard, the system SHALL support the following shortcuts during a quiz:

| Key | Action |
|-----|--------|
| 0–9 | Append digit (up to 3 digits) |
| Backspace | Remove last digit |
| Delete | Remove last digit (same as Backspace) |
| Enter | Submit answer (same as 「答える」) |

#### Scenario: Delete key removes digit
- **WHEN** a player presses Delete with digits entered
- **THEN** the last entered digit is removed, same as Backspace

#### Scenario: Enter submits answer
- **WHEN** a player presses Enter with at least one digit entered
- **THEN** the system validates the submitted numeric answer

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

The system SHALL unlock higher levels based on past performance at the current level. A level unlocks when **either**:

1. The player completes a **perfect session** (★★★★★ or theoretical maximum total score), OR
2. The player achieves **★★★★ (4 stars)** at that level for **3 sessions**

#### Scenario: Instant unlock via perfect session
- **WHEN** a player completes a perfect session (5 stars or theoretical max score) at level 1
- **THEN** level 2 becomes available immediately

#### Scenario: Unlock level 2 via star 4 sessions
- **WHEN** a player achieves ★★★★ at level 1 for 3 sessions
- **THEN** level 2 becomes available

#### Scenario: Unlock level 3
- **WHEN** a player meets the unlock condition at level 2 (perfect session or 3 × ★★★★)
- **THEN** level 3 becomes available

#### Scenario: Unlock level 4
- **WHEN** a player meets the unlock condition at level 3 (perfect session or 3 × ★★★★)
- **THEN** level 4 becomes available

### Requirement: No duplicate questions in a session

The system SHALL NOT repeat the same operand pair (a, b) within a single session.

#### Scenario: Unique questions
- **WHEN** generating 10 questions for a session
- **THEN** no two questions have the same (operandA, operandB) pair
