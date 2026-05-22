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

The system SHALL display each question as a horizontal addition expression ending with `= ?`, where the `?` position shows the player's current numeric input inline. When no digits are entered, `?` is shown.

- **2 operands** (levels 1–6, 8–9): `operandA + operandB = ?`
- **3 operands** (levels 7, 10): `operandA + operandB + operandC = ?`

#### Scenario: Empty input
- **WHEN** the player has not entered any digits for the current question
- **THEN** the equation shows operands joined by ` + ` and ends with `= ?`

#### Scenario: Partial input
- **WHEN** the player enters digits via the keypad or keyboard
- **THEN** the entered digits replace `?` inline in the equation (e.g. `3 + 5 = 8`, `12 + 34 + 56 = 102`)

### Requirement: Single-line equation display

The full equation (operands, plus signs, equals sign, and answer or `?`) SHALL remain on a **single horizontal line** without wrapping to a second line. This SHALL hold while the player is entering digits and after digits replace `?`. The system MAY reduce font size or apply horizontal fit (e.g. `nowrap`, scale-to-fit) so that longer expressions (such as three 3-digit operands) stay on one line on narrow viewports.

#### Scenario: Long equation stays on one line
- **WHEN** a level 10 question shows `123 + 456 + 789 = ?`
- **THEN** the entire expression is visible on one line without breaking between operands or around `=`

#### Scenario: Input does not cause wrap
- **WHEN** a player enters a multi-digit answer on a level with three operands
- **THEN** the equation including the entered digits still displays on a single line

### Requirement: No vertical scroll during quiz

During an active quiz session, the problem screen SHALL NOT cause vertical page scrolling. The existing layout structure (header, progress bar, equation, keypad) SHALL be preserved; the system MAY scale the quiz panel to fit the viewport when needed. On mobile browsers, the top of the quiz screen SHALL remain visible below the address bar and device safe areas (notch, home indicator).

#### Scenario: Mobile top inset
- **WHEN** a player opens the quiz on a phone browser with a visible address bar
- **THEN** the header and mascot are not hidden under the browser chrome

#### Scenario: Viewport fit on short screens
- **WHEN** a player is answering a question on a viewport shorter than the default layout height
- **THEN** the quiz content fits within the visible area without vertical scrolling

### Requirement: Numeric keypad input

The system SHALL provide an on-screen numeric keypad (0–9) with large touch-friendly buttons for entering answers. The keypad layout SHALL follow a calculator-style arrangement (7–8–9 / 4–5–6 / 1–2–3). The player SHALL submit their answer via an 「答える」 button. The system SHALL provide an on-screen backspace button that removes the last entered digit.

Input SHALL accept at most **4 digits** per answer. Levels 1–9 SHALL only generate questions whose correct sum fits in **3 digits** (≤ 999). Level 10 MAY generate sums up to **2997** (four digits).

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
| 0–9 | Append digit (up to 4 digits; levels 1–9 answers need at most 3) |
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

#### Scenario: Double-submit prevention
- **WHEN** a player taps 「答える」 or presses Enter multiple times in quick succession for the same submission
- **THEN** the system processes at most one answer validation for that attempt
- **AND** after a correct answer, 「答える」 and Enter remain disabled until feedback finishes and the next question is shown (or the session completes and redirects to results)

### Requirement: Quiz header navigation

During a quiz, the header SHALL show the mascot image at the top left, player name and question progress (`問題 N / 10`) and level (`LvN`) centered at the top, and the running score at the top right. The system SHALL NOT show a 「やめる」 quit button during the quiz. Tapping the mascot SHALL return the player to the level selection screen (home).

#### Scenario: Mascot returns home
- **WHEN** a player taps the mascot during a quiz
- **THEN** the current session is abandoned and the level selection screen is shown

#### Scenario: No quit button
- **WHEN** a player is answering questions during a quiz
- **THEN** no 「やめる」 button is visible

### Requirement: Mascot speech bubble on answer

When a player submits a correct answer during a quiz, the mascot SHALL show a random positive praise comment in a speech bubble to the right of the mascot (e.g. 「すごい！」). On an incorrect answer, the mascot SHALL NOT show a speech bubble. The bubble SHALL clear when feedback ends.

#### Scenario: Praise on correct answer
- **WHEN** a player submits a correct answer
- **THEN** the mascot shows a random praise comment in a speech bubble until the next question or feedback ends

#### Scenario: No bubble on incorrect answer
- **WHEN** a player submits an incorrect answer
- **THEN** the mascot does not show a speech bubble

#### Scenario: Completion message on final question
- **WHEN** a player answers the 10th question correctly and completes the session
- **THEN** the mascot shows 「おつかれさまでした」 in the speech bubble until redirect to the result screen

### Requirement: Level selection screen

The level selection screen SHALL show each level as `Lv1` through `Lv10` only, without level names or unlock status text. Levels SHALL be arranged in a single vertical column. Locked levels SHALL appear disabled (non-clickable) but SHALL NOT show additional labels such as 「まだ」. During a quiz, the header SHALL show the level number only (e.g. `Lv2`) without the level name.

#### Scenario: Locked level display
- **WHEN** a player has not unlocked level 3
- **THEN** the level 3 button shows `Lv3` only and is disabled

### Requirement: First-time level unlock celebration

When a player unlocks a new level for the first time and returns to the level selection screen, the system SHALL scroll the newly unlocked level button into view first, then play a one-time reveal animation contained within the level row (without expanding page layout). The celebration SHALL NOT repeat on later visits to the level selection screen for the same level. The system SHALL record that the level was shown when the animation starts (or immediately when reduced motion is preferred). When the user prefers reduced motion, the animation SHALL be skipped while still recording that the level was shown. For guest players, celebration state SHALL be stored in browser localStorage. For registered members, celebration state SHALL be stored in the database per player so it persists across browsers and survives localStorage clears.

#### Scenario: Unlock animation on level select
- **WHEN** a player unlocks level 2 for the first time and opens the level selection screen
- **THEN** the view scrolls to show the `Lv2` button
- **AND** the `Lv2` button plays a reveal animation

#### Scenario: Celebration not repeated
- **WHEN** a player has already seen the unlock animation for level 2
- **THEN** returning to the level selection screen does not play the animation again for level 2

#### Scenario: Reduced motion for unlock celebration
- **WHEN** the user prefers reduced motion and unlocks a new level
- **THEN** the level selection screen appears without unlock animation

#### Scenario: Member celebration persists across devices
- **WHEN** a registered member has already seen the unlock animation for level 2
- **AND** the member opens the level selection screen on another browser or after clearing localStorage
- **THEN** the unlock animation does not play again for level 2

#### Scenario: Guest celebration migrates on signup
- **WHEN** a guest has already seen unlock celebrations and completes member registration
- **THEN** those celebration records are imported to the member account in the database
- **AND** the member does not see those celebrations again after login

### Requirement: Ten difficulty levels

The system SHALL support ten difficulty levels with the following constraints:

| Level | Rule |
|-------|------|
| 1 | 1-digit + 1-digit, no carry |
| 2 | 1-digit + 1-digit, with carry |
| 3 | 1-digit + 2-digit, no carry |
| 4 | 1-digit + 2-digit, with carry |
| 5 | 2-digit + 2-digit, no carry |
| 6 | 2-digit + 2-digit, with carry |
| 7 | 2-digit + 2-digit + 2-digit (answer ≤ 999) |
| 8 | 3-digit + 3-digit, no carry |
| 9 | 3-digit + 3-digit, with carry |
| 10 | 3-digit + 3-digit + 3-digit |

**Operand ranges**

- 1-digit: 1–9
- 2-digit: 10–99
- 3-digit: 100–999

**Carry rules**

- **No carry**: at every digit position (ones, tens, hundreds), the sum of the digits in that column is less than 10.
- **With carry**: at least one digit column has a sum of 10 or more.
- For mixed-width operands (levels 3–4), either operand may be 1-digit or 2-digit.

#### Scenario: Level 1 question generation
- **WHEN** level is 1
- **THEN** each operand is 1–9 and the sum is at most 9

#### Scenario: Level 2 question generation
- **WHEN** level is 2
- **THEN** each operand is 1–9 and the sum is at least 10

#### Scenario: Level 3 question generation
- **WHEN** level is 3
- **THEN** one operand is 1–9, the other is 10–99, and the addition has no carry in any column

#### Scenario: Level 4 question generation
- **WHEN** level is 4
- **THEN** one operand is 1–9, the other is 10–99, and the addition has at least one carry

#### Scenario: Level 5 question generation
- **WHEN** level is 5
- **THEN** both operands are 10–99 and the addition has no carry in any column

#### Scenario: Level 6 question generation
- **WHEN** level is 6
- **THEN** both operands are 10–99 and the addition has at least one carry

#### Scenario: Level 7 question generation
- **WHEN** level is 7
- **THEN** three operands are each 10–99, the sum is at most 999, and the question displays as three terms joined by ` + `

#### Scenario: Level 8 question generation
- **WHEN** level is 8
- **THEN** both operands are 100–999 and the addition has no carry in any column

#### Scenario: Level 9 question generation
- **WHEN** level is 9
- **THEN** both operands are 100–999 and the addition has at least one carry

#### Scenario: Level 10 question generation
- **WHEN** level is 10
- **THEN** three operands are each 100–999 and the question displays as three terms joined by ` + `

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

#### Scenario: Unlock levels 5 through 10
- **WHEN** a player meets the unlock condition at level N (where 4 ≤ N ≤ 9)
- **THEN** level N + 1 becomes available

### Requirement: No duplicate questions in a session

The system SHALL NOT repeat the same operand combination within a single session. For two-operand questions, uniqueness is the unordered pair `{a, b}`. For three-operand questions, uniqueness is the sorted triple of operands.

#### Scenario: Unique two-operand questions
- **WHEN** generating 10 questions for a two-operand level
- **THEN** no two questions have the same unordered operand pair

#### Scenario: Unique three-operand questions
- **WHEN** generating 10 questions for level 7 or 10
- **THEN** no two questions have the same sorted triple of operands
