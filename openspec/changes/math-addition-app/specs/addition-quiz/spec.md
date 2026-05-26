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

### Requirement: Button sound effects

The system SHALL play short sound effects on selected button presses. Primary action buttons outside the keypad (including mode selection) SHALL use the confirm button sound (`/sounds/button.mp3`). Level selection buttons (Lv1–Lv10) that start a standard quiz session SHALL use the level start sound (`/sounds/level-start.mp3`). Buttons that start a new time attack session (「タイムアタック（鬼退治）」, 「タイムアタックを新しく始める」, and time attack result 「もう一度」) SHALL use the time attack start sound (`/sounds/time-attack-start.mp3`). The resume button (「続きから」) SHALL use the time attack resume sound (`/sounds/time-attack-resume.mp3`). All keypad buttons (digits, backspace, and 「答える」) and tapping the mascot to return home SHALL NOT play a button sound.

#### Scenario: Keypad is silent
- **WHEN** a player taps any keypad button or uses keypad keyboard shortcuts during a quiz
- **THEN** the system does not play a button sound

#### Scenario: Non-keypad button sound
- **WHEN** a player taps a primary action button outside the keypad such as a mode button
- **THEN** the system plays the confirm button sound

#### Scenario: Level start sound
- **WHEN** a player taps an unlocked level button to start a standard quiz session
- **THEN** the system plays the level start sound instead of the confirm button sound

#### Scenario: Time attack start sound
- **WHEN** a player taps a button that starts a new time attack session
- **THEN** the system plays the time attack start sound instead of the confirm button sound

#### Scenario: Time attack resume sound
- **WHEN** a player taps 「続きから」 to resume an in-progress time attack
- **THEN** the system plays the time attack resume sound instead of the confirm button sound

#### Scenario: Mascot home is silent
- **WHEN** a player taps the mascot to return home during a quiz
- **THEN** the system does not play a button sound

#### Scenario: Scroll without tap is silent
- **WHEN** a player scrolls a screen that contains primary action buttons without activating one
- **THEN** the system does not play a button sound

### Requirement: Quiz answer sound effects

During standard quiz play, the system SHALL play short sound effects when an answer is submitted. Correct answers SHALL use `/sounds/quiz-correct.mp3`. Incorrect answers SHALL use `/sounds/quiz-wrong.mp3`. The sound SHALL play immediately on submit using the same answer judgment as the server, without waiting for the server response. During time attack, only the correct answer sound SHALL play on submit; incorrect answers SHALL NOT play the quiz wrong sound (the oni counterattack sound plays instead). Keypad button presses SHALL NOT play these sounds.

#### Scenario: Correct answer sound
- **WHEN** a player submits a correct answer during standard mode or time attack
- **THEN** the system plays the correct answer sound effect

#### Scenario: Wrong answer sound in standard mode
- **WHEN** a player submits an incorrect answer during standard mode
- **THEN** the system plays the wrong answer sound effect

#### Scenario: No quiz wrong sound in time attack
- **WHEN** a player submits an incorrect answer during time attack
- **THEN** the system does not play the quiz wrong answer sound effect

### Requirement: Home screen BGM

The home screen (`/play` mode and level selection, when not in an active quiz) and the progress dashboard (`/progress`) SHALL play looping background music using `/sounds/bgm/uchuyuei.mp3`. If the browser blocks audible autoplay, the system SHALL start muted playback when possible and unmute after the player's first interaction. Background music SHALL stop when the player starts a standard quiz or opens time attack.

#### Scenario: Home BGM on mode select
- **WHEN** a player opens the home screen and is not in an active quiz
- **THEN** the home background music plays

#### Scenario: Home BGM on progress dashboard
- **WHEN** a player opens the progress dashboard
- **THEN** the same home background music continues or resumes

#### Scenario: Home BGM stops on quiz start
- **WHEN** a player starts a standard quiz
- **THEN** the home background music stops and quiz background music begins

### Requirement: Standard quiz BGM

During an active standard quiz session (addition or subtraction, not time attack), the system SHALL play looping background music using `/sounds/bgm/quiz-bgm.mp3`. Quiz BGM SHALL stop when the quiz ends and the player returns to the home screen or level selection.

#### Scenario: Quiz BGM during standard mode
- **WHEN** a player is answering questions in standard mode
- **THEN** the quiz background music plays

#### Scenario: Quiz BGM stops on quiz end
- **WHEN** a player finishes or exits a standard quiz
- **THEN** the quiz background music stops and home background music resumes

### Requirement: Home screen sound toggle

The home screen (`/play` mode and level selection, when not in an active quiz) SHALL show a sound on/off toggle button fixed at the top-left. The toggle SHALL NOT appear during an active standard quiz, time attack, or on other routes. When sound is off, the system SHALL NOT play button sound effects, quiz answer sounds, time attack action sounds, or background music. The preference SHALL persist in browser localStorage across visits. Toggling sound off SHALL immediately stop any playing background music.

#### Scenario: Toggle on home screen only
- **WHEN** a player opens the home screen and is not in an active quiz
- **THEN** the sound toggle button is visible at the top-left of the screen

#### Scenario: Toggle hidden during play
- **WHEN** a player starts a standard quiz or enters time attack
- **THEN** the sound toggle button is not shown

#### Scenario: Mute all sounds
- **WHEN** a player taps the sound toggle to turn sound off on the home screen
- **THEN** no further sound effects or background music play until sound is turned back on

#### Scenario: Sound preference persists
- **WHEN** a player turns sound off and reloads the app
- **THEN** sound remains off until the player turns it back on from the home screen

#### Scenario: Unmute restores home BGM
- **WHEN** a player turns sound back on while on the home screen
- **THEN** the home background music resumes

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

### Requirement: PWA home screen icon

The system SHALL provide a web app manifest and home screen icons that show the game mascot on the app background with 「けいさん」 at the top, so that adding the app to a mobile home screen displays a branded icon.

#### Scenario: Add to home screen on mobile
- **WHEN** a player adds the app to their phone home screen
- **THEN** the icon shows the mascot character on the game background with 「けいさん」 at the top
