## ADDED Requirements

### Requirement: Session consists of 10 subtraction questions

The system SHALL present exactly 10 subtraction questions per session.

#### Scenario: Start new subtraction session
- **WHEN** a player starts a quiz at their current subtraction level
- **THEN** the system generates 10 subtraction questions for that level

#### Scenario: Subtraction session completion
- **WHEN** the player answers the 10th subtraction question correctly
- **THEN** the system shows the session result screen

### Requirement: Inline answer display for subtraction

The system SHALL display each question as a horizontal subtraction expression ending with `= ?`, where the `?` position shows the player's current numeric input inline. When no digits are entered, `?` is shown.

- **2 operands** (levels 1–6, 8–9): `operandA - operandB = ?`
- **3 operands** (levels 7, 10): `operandA - operandB - operandC = ?`

`operandA` is always the minuend. Operands SHALL NOT be reordered.

#### Scenario: Empty input
- **WHEN** the player has not entered any digits for the current subtraction question
- **THEN** the equation shows operands joined by ` - ` and ends with `= ?`

#### Scenario: Partial input
- **WHEN** the player enters digits via the keypad or keyboard
- **THEN** the entered digits replace `?` inline in the equation (e.g. `8 - 3 = 5`, `45 - 12 - 8 = 25`)

### Requirement: Single-line equation display

The full subtraction equation (operands, minus signs, equals sign, and answer or `?`) SHALL remain on a **single horizontal line** without wrapping to a second line. This SHALL hold while the player is entering digits and after digits replace `?`. The system MAY reduce font size or apply horizontal fit so that longer expressions stay on one line on narrow viewports.

#### Scenario: Long subtraction equation stays on one line
- **WHEN** a level 10 question shows `500 - 123 - 456 = ?`
- **THEN** the entire expression is visible on one line without breaking between operands or around `=`

### Requirement: No vertical scroll during quiz

During an active subtraction quiz session, the problem screen SHALL NOT cause vertical page scrolling. The layout structure (header, progress bar, equation, keypad) SHALL match the addition standard quiz.

#### Scenario: Viewport fit on short screens
- **WHEN** a player is answering a subtraction question on a viewport shorter than the default layout height
- **THEN** the quiz content fits within the visible area without vertical scrolling

### Requirement: Numeric keypad input

The system SHALL use the same on-screen numeric keypad, 「答える」 button, and backspace behavior as the addition standard quiz. Input SHALL accept at most **4 digits** per answer. Levels 1–9 SHALL only generate questions whose correct difference fits in **3 digits** (≤ 999). Level 10 MAY generate differences up to **999** (three digits).

#### Scenario: Enter subtraction answer on tablet
- **WHEN** a player taps number buttons and then 「答える」
- **THEN** the system validates the submitted numeric answer against the correct difference

#### Scenario: Empty submission
- **WHEN** a player taps 「答える」 with no digits entered
- **THEN** the system does not submit and keeps the player on the current question

### Requirement: Keyboard shortcuts

When playing on a device with a physical keyboard, the system SHALL support the same shortcuts as the addition standard quiz (0–9 append, Backspace/Delete remove last digit, Enter submit).

#### Scenario: Enter submits subtraction answer
- **WHEN** a player presses Enter with at least one digit entered
- **THEN** the system validates the submitted numeric answer

### Requirement: Answer validation

The system SHALL validate each subtraction answer immediately after submission using the same feedback rules as the addition standard quiz (positive feedback on correct, encouraging retry on incorrect without revealing the answer).

#### Scenario: Correct subtraction answer
- **WHEN** the player submits the correct difference
- **THEN** the system shows positive feedback and advances to the next question

#### Scenario: Incorrect subtraction answer
- **WHEN** the player submits a wrong answer
- **THEN** the system shows encouraging feedback, does NOT reveal the correct answer, and keeps the player on the same question

#### Scenario: Retry until correct
- **WHEN** a player submits a wrong subtraction answer and then submits again
- **THEN** the system re-validates without advancing until the correct difference is submitted

### Requirement: Quiz header navigation

During a subtraction quiz, the header SHALL show the mascot, player name, question progress (`問題 N / 10`), level (`LvN`), and running score. Tapping the mascot SHALL return the player to the subtraction level selection screen. No 「やめる」 button SHALL be shown.

#### Scenario: Mascot returns to subtraction level select
- **WHEN** a player taps the mascot during a subtraction quiz
- **THEN** the current session is abandoned and the subtraction level selection screen is shown

### Requirement: Mascot speech bubble on answer

The mascot speech bubble behavior SHALL match the addition standard quiz (praise on correct, no bubble on incorrect, 「おつかれさまでした」 on session completion).

#### Scenario: Praise on correct subtraction answer
- **WHEN** a player submits a correct subtraction answer
- **THEN** the mascot shows a random praise comment in a speech bubble until feedback ends

### Requirement: Subtraction level selection screen

The subtraction level selection screen SHALL show `Lv1` through `Lv10` in a single vertical column with the same locked/unlocked visual rules as addition. Unlock progress SHALL be computed independently from addition levels. The level list SHALL be hidden until the player taps **通常モード（10問チャレンジ）**; tapping the same button again SHALL hide the level list.

#### Scenario: Subtraction level list hidden initially
- **WHEN** a player selects 引き算 on the play screen
- **THEN** the subtraction level list is not shown until **通常モード（10問チャレンジ）** is tapped

#### Scenario: Subtraction locked level display
- **WHEN** a player has not unlocked subtraction level 3
- **THEN** the level 3 button shows `Lv3` only and is disabled

#### Scenario: Addition progress does not unlock subtraction
- **WHEN** a player has unlocked addition level 5
- **AND** has never played subtraction
- **THEN** only subtraction level 1 is available

### Requirement: Mascot appearance for subtraction

When the subtraction operation is selected or during a subtraction quiz, the mascot SHALL display with **light blue (水色) clothing** instead of the default red suit used for addition.

#### Scenario: Subtraction level select mascot
- **WHEN** a player selects 引き算 on the play screen
- **THEN** the mascot image shows light blue clothing

#### Scenario: Subtraction quiz mascot
- **WHEN** a player is answering questions in a subtraction session
- **THEN** the quiz header mascot shows light blue clothing

#### Scenario: Addition mascot unchanged
- **WHEN** a player selects 足し算 or plays an addition session
- **THEN** the mascot shows the default red clothing

### Requirement: First-time level unlock celebration

Subtraction level unlock celebration SHALL follow the same animation, reduced-motion, guest localStorage, and member database rules as addition, scoped per `operation`.

#### Scenario: Subtraction unlock animation
- **WHEN** a player unlocks subtraction level 2 for the first time and opens the subtraction level selection screen
- **THEN** the view scrolls to show the `Lv2` button and plays the reveal animation once

#### Scenario: Addition celebration does not affect subtraction
- **WHEN** a player has already seen the unlock animation for addition level 2
- **AND** unlocks subtraction level 2 for the first time
- **THEN** the subtraction level 2 unlock animation plays

### Requirement: Ten subtraction difficulty levels

The system SHALL support ten subtraction difficulty levels with the following constraints:

| Level | Rule |
|-------|------|
| 1 | 1-digit − 1-digit, no borrow |
| 2 | 2-digit − 1-digit, with borrow |
| 3 | 2-digit − 1-digit, no borrow |
| 4 | 2-digit − 2-digit, no borrow |
| 5 | 2-digit − 2-digit, with borrow |
| 6 | 3-digit − 2-digit, no borrow |
| 7 | 2-digit − 2-digit − 2-digit (answer ≤ 999) |
| 8 | 3-digit − 3-digit, no borrow |
| 9 | 3-digit − 3-digit, with borrow |
| 10 | 3-digit − 3-digit − 3-digit (answer ≥ 0) |

**Operand ranges**

- 1-digit minuend: 1–9 (level 1: minuend ≥ subtrahend)
- 1-digit subtrahend: 1–9 (subtrahend SHALL NOT be 0; e.g. `8 - 0` is excluded)
- 2-digit: 10–99
- 3-digit: 100–999

**Borrow rules**

- **No borrow**: at every digit position (ones, tens, hundreds), the minuend digit is greater than or equal to the corresponding subtrahend digit when subtracting right to left without requiring a borrow from a higher place.
- **With borrow**: at least one digit position requires borrowing from a higher place.
- For mixed-width operands (levels 2–3, 6), the minuend has more digits than the subtrahend(s) as specified.

**Non-negative answers**

- The correct answer SHALL always be **≥ 0**. The generator SHALL NOT produce questions where `operandA - operandB - (operandC ?? 0) < 0`.

**No zero subtrahend**

- Subtrahends (`operandB`, `operandC`) SHALL NOT be 0. Problems such as `8 - 0 = ?` SHALL NOT appear.

#### Scenario: Level 1 subtraction generation
- **WHEN** level is 1
- **THEN** the minuend is 1–9, the subtrahend is 1–9, the minuend is greater than or equal to the subtrahend, and subtraction has no borrow

#### Scenario: No zero subtrahend
- **WHEN** generating subtraction questions at any level
- **THEN** no question uses 0 as `operandB` or `operandC` (e.g. `8 - 0` does not appear)

#### Scenario: Level 2 subtraction generation
- **WHEN** level is 2
- **THEN** the minuend is 10–99, the subtrahend is 1–9, and subtraction requires at least one borrow

#### Scenario: Level 3 subtraction generation
- **WHEN** level is 3
- **THEN** the minuend is 10–99, the subtrahend is 1–9, and subtraction has no borrow in any column

#### Scenario: Level 4 subtraction generation
- **WHEN** level is 4
- **THEN** both operands are 10–99 and subtraction has no borrow in any column

#### Scenario: Level 5 subtraction generation
- **WHEN** level is 5
- **THEN** both operands are 10–99 and subtraction requires at least one borrow

#### Scenario: Level 6 subtraction generation
- **WHEN** level is 6
- **THEN** the minuend is 100–999, the subtrahend is 10–99, and subtraction has no borrow in any column

#### Scenario: Level 7 subtraction generation
- **WHEN** level is 7
- **THEN** three operands are each 10–99, the difference is at most 999 and at least 0, and the question displays as three terms joined by ` - `

#### Scenario: Level 8 subtraction generation
- **WHEN** level is 8
- **THEN** both operands are 100–999 and subtraction has no borrow in any column

#### Scenario: Level 9 subtraction generation
- **WHEN** level is 9
- **THEN** both operands are 100–999 and subtraction requires at least one borrow

#### Scenario: Level 10 subtraction generation
- **WHEN** level is 10
- **THEN** three operands are each 100–999, the difference is at least 0, and the question displays as three terms joined by ` - `

### Requirement: Subtraction level unlock progression

Subtraction level unlock rules SHALL match addition: a level unlocks when **either** a perfect session (★★★★★ or theoretical maximum score) **or** ★★★★ for **3 sessions** at the current level. Unlock state SHALL be tracked separately per operation.

#### Scenario: Instant unlock via perfect subtraction session
- **WHEN** a player completes a perfect session at subtraction level 1
- **THEN** subtraction level 2 becomes available immediately

#### Scenario: Unlock subtraction level 2 via star 4 sessions
- **WHEN** a player achieves ★★★★ at subtraction level 1 for 3 sessions
- **THEN** subtraction level 2 becomes available

### Requirement: No duplicate questions in a subtraction session

The system SHALL NOT repeat the same operand combination within a single subtraction session. For two-operand questions, uniqueness is the **ordered** pair `(minuend, subtrahend)`. For three-operand questions, uniqueness is the **ordered** triple `(a, b, c)`.

#### Scenario: Unique two-operand subtraction questions
- **WHEN** generating 10 questions for a two-operand subtraction level
- **THEN** no two questions have the same ordered operand pair

#### Scenario: Unique three-operand subtraction questions
- **WHEN** generating 10 questions for subtraction level 7 or 10
- **THEN** no two questions have the same ordered triple of operands

#### Scenario: Ordered pair distinction
- **WHEN** `13 - 7` and `7 - 13` could both be generated
- **THEN** only `13 - 7` is valid (answer ≥ 0); reversed order is not treated as a duplicate of a valid question
