## ADDED Requirements

### Requirement: Time attack mode entry

The system SHALL offer a **タイムアタック** mode separate from the standard 10-question quiz. Time attack SHALL be playable only by **authenticated (logged-in) members**. The entry point SHALL remain **visible** to guests but SHALL be **locked** (disabled) with a brief message that login is required.

#### Scenario: Member starts time attack
- **WHEN** a logged-in player selects タイムアタック from the play screen
- **THEN** the system starts a new time attack session at level 1

#### Scenario: Guest sees locked time attack
- **WHEN** a guest opens the play screen
- **THEN** the タイムアタック option is visible but not selectable
- **AND** the UI indicates that login is required to play

#### Scenario: Time attack does not affect standard unlock
- **WHEN** a player completes or clears a time attack session
- **THEN** the standard mode level unlock state is unchanged

### Requirement: Time attack session always starts at level 1

Every new time attack session SHALL begin at **level 1**, regardless of the player's unlocked level in standard mode.

#### Scenario: New time attack session
- **WHEN** a logged-in player starts time attack
- **THEN** the first wave uses level 1 questions and level 1 boss parameters

### Requirement: Ten-question waves with server generation and scoring

Time attack SHALL proceed in **waves of exactly 10 questions**. At the start of each wave, the server SHALL generate 10 questions for the current level using the same generation rules as standard mode. After each answer, the server SHALL score the submission. After the 10th question of a wave, the server SHALL aggregate the wave score and apply it as damage to the boss HP.

#### Scenario: Wave start
- **WHEN** a time attack wave begins
- **THEN** the server generates 10 unique questions for the current level and stores them in the session

#### Scenario: Wave completion scoring
- **WHEN** the player completes the 10th question of a wave (correct or incorrect submission counted as a question slot)
- **THEN** the server sums points earned in that wave
- **AND** subtracts that sum from the boss remaining HP

### Requirement: One attempt per question with no retry

During time attack, each question SHALL allow **one submission only**. On an incorrect answer, the system SHALL award **0 points**, increment the mistake counter, show yellow alert feedback, and **advance to the next question** without allowing retry on the same question.

#### Scenario: Wrong answer advances
- **WHEN** a player submits an incorrect answer during time attack
- **THEN** the question awards 0 points
- **AND** the mistake count increases by 1
- **AND** the next question is shown without retry

#### Scenario: Correct answer
- **WHEN** a player submits the correct answer within the time limit
- **THEN** points are awarded per time attack scoring rules
- **AND** the next question is shown

### Requirement: Session end on three mistakes

When the mistake count reaches **3**, the time attack session SHALL end immediately and navigate to the time attack result screen.

#### Scenario: Third mistake
- **WHEN** a player submits a third incorrect answer in one time attack session
- **THEN** the session ends with status failed
- **AND** the result screen is shown

### Requirement: Per-question time limit and immediate end on timeout

Each question SHALL have a countdown time limit. If the limit elapses before a correct answer is submitted, the session SHALL end immediately and navigate to the result screen. The question SHALL award 0 points.

The countdown SHALL be shown as a **circular gauge** in the **top-left corner of the question blackboard** (the equation card).

For levels 1–9 (non-Enma bosses), the limit SHALL be **10 seconds**.

For Enma bosses at level 10, the limit SHALL follow the Enma stage table (see Requirement: Enma stage parameters).

The first **1 second** after a question appears SHALL NOT advance the countdown (same grace as standard mode).

#### Scenario: Timeout ends session
- **WHEN** the per-question time limit expires without a correct answer
- **THEN** the session ends immediately
- **AND** the result screen is shown

#### Scenario: Grace period
- **WHEN** a new question is displayed
- **THEN** the countdown does not decrease during the first 1 second

#### Scenario: Circular timer on blackboard
- **WHEN** a question is displayed during time attack
- **THEN** a circular countdown gauge appears at the top-left of the question blackboard
- **AND** the gauge shows remaining seconds (or a brief start indicator during the grace period)

### Requirement: Alert effects

The time attack quiz view SHALL show visual alert effects:

| Condition | Effect |
|-----------|--------|
| Remaining time ≤ 5 seconds | Red alert |
| Incorrect submission | Yellow alert |

Red alert timing SHALL be **fixed at 5 seconds remaining**, even when the Enma stage uses a shorter total limit (e.g. 7 seconds).

#### Scenario: Red alert at five seconds
- **WHEN** the countdown reaches 5 seconds or less on any question
- **THEN** a red alert effect is shown until the question ends

#### Scenario: Yellow alert on mistake
- **WHEN** a player submits an incorrect answer
- **THEN** a yellow alert effect is shown briefly

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** alert effects use non-flashing alternatives (e.g. border color change)

### Requirement: Boss HP and damage

Each boss SHALL have HP calculated as:

```
waveMaxScore = maxPerQuestion × 10
oniMaxHp     = floor(waveMaxScore × 0.85)
```

Where `maxPerQuestion = level × 10 + level × timeLimitSeconds × timeBonusMultiplier`.

When a wave ends, `remainingHp -= waveScore`. If remaining HP is **greater than 0**, the same boss continues and **HP carries over** to the next wave. If remaining HP is **≤ 0**, the boss is defeated.

#### Scenario: HP carryover
- **WHEN** a wave ends with remaining boss HP above 0
- **THEN** the next wave continues against the same boss with the remaining HP unchanged

#### Scenario: Boss defeated
- **WHEN** a wave reduces remaining HP to 0 or below
- **THEN** the boss is marked defeated
- **AND** defeat processing runs (bonus, level advance, or clear)

### Requirement: Defeat bonus

When a boss is defeated, the system SHALL add a defeat bonus equal to **50% of the wave score** (the points earned in that 10-question wave, floored):

```
defeatBonus = floor(waveScore × 0.5)
```

#### Scenario: Defeat bonus applied
- **WHEN** a boss is defeated on a wave that earned 400 points
- **THEN** 200 points are added to the session total as defeat bonus

### Requirement: Level progression through oni bosses

Levels 1–9 SHALL use colored oni bosses. Defeating the oni at level N SHALL advance the player to level N+1 with a fresh boss HP pool for the new level.

#### Scenario: Level 1 oni defeated
- **WHEN** the level 1 oni is defeated
- **THEN** the next wave starts at level 2 with newly calculated HP

#### Scenario: Level 9 oni defeated
- **WHEN** the level 9 oni is defeated
- **THEN** the next wave starts at level 10 against Enma #1

### Requirement: Enma stage parameters

At level 10, the player SHALL fight **Enma Daio** (閻魔大王). Up to **10 Enma bosses** SHALL be fought sequentially. Parameters per Enma number:

| Enma | Time limit (sec) | Time bonus multiplier |
|------|------------------|----------------------|
| #1 | 10 | ×1 |
| #2 | 9 | ×2 |
| #3 | 8 | ×3 |
| #4 | 7 | ×4 |
| #5 | 7 | ×5 |
| #6 | 7 | ×6 |
| #7 | 7 | ×7 |
| #8 | 7 | ×8 |
| #9 | 7 | ×9 |
| #10 | 7 | ×10 |

Formulas:

```
timeLimitSeconds    = max(7, 11 - enmaNumber)
timeBonusMultiplier = enmaNumber
```

#### Scenario: Enma #5 parameters
- **WHEN** the player faces Enma #5
- **THEN** each question has a 7-second limit and time bonus multiplier ×5

#### Scenario: Enma #10 parameters
- **WHEN** the player faces Enma #10
- **THEN** each question has a 7-second limit and time bonus multiplier ×10

### Requirement: Clear on Enma #10 defeat

After defeating **Enma #10**, the time attack session SHALL end with status **cleared** and navigate to the result screen. No further waves SHALL be offered.

#### Scenario: Game clear
- **WHEN** the player defeats Enma #10
- **THEN** the session status is cleared
- **AND** the result screen shows a clear/victory state

### Requirement: Wave score progress bar

During an active wave, the system SHALL display a clearly visible **攻撃ゲージ** progress bar whose maximum is the **theoretical maximum score for the current 10-question wave** (base points + time bonus at instant answers, **excluding streak bonuses**). The bar fill SHALL reflect the running total score earned in the current wave. Numeric score values SHALL NOT be shown on the attack or HP gauges. A separate **鬼 HP** gauge SHALL remain visible at all times. The attack gauge and oni HP gauge SHALL be displayed **side by side** in one row, with the oni HP gauge **aligned to the right**.

When a player answers correctly, the system SHALL NOT show earned points in the success popup. The success popup SHALL dismiss after approximately **1 second**, and the next question SHALL become available at that time (except when the wave is complete). The light and gauge charge animation SHALL continue independently in the background until it finishes. White sparkling light orbs SHALL gather from a wide area around the feedback, merge into one cluster at the center, and then travel together toward the attack gauge. The gauge fill SHALL increase when the cluster reaches the gauge.

#### Scenario: Bar updates on correct answer
- **WHEN** a player earns points during a wave
- **THEN** white sparkling light orbs gather from a wide area into one cluster
- **AND** the cluster travels to the attack gauge
- **AND** the attack gauge fill increases when the cluster reaches the gauge

#### Scenario: Success popup dismisses before light animation completes
- **WHEN** a player answers correctly
- **THEN** the success popup dismisses after approximately 1 second
- **AND** the next question is shown (unless the wave is complete)
- **AND** the light gather and gauge charge animation continues until the cluster reaches the attack gauge

#### Scenario: No numeric values on gauges
- **WHEN** the quiz view is displayed
- **THEN** the attack and HP gauges do not show numeric score or HP values

#### Scenario: HP gauge visible
- **WHEN** a player is in time attack
- **THEN** the oni HP gauge is always visible with current and max HP values

#### Scenario: Gauges side by side
- **WHEN** the quiz view is displayed
- **THEN** the attack gauge and oni HP gauge appear in one horizontal row
- **AND** the oni HP gauge is right-aligned within that row

#### Scenario: Bar resets on new wave
- **WHEN** a new wave begins
- **THEN** the attack gauge resets to 0 with the maximum recalculated for the current level and Enma parameters

### Requirement: Oni score display

The session total score SHALL be shown together with the provided oni artwork (`/oni.png`, transparent background) in the quiz header. The header SHALL display **three items in one horizontal row**: the teacher mascot on the left, the total score and question progress in the center, and the oni image on the right. The player name and level label SHALL NOT appear in the header.

#### Scenario: Header row layout
- **WHEN** a player is in time attack
- **THEN** the teacher mascot, total score with question/mistake counts, and oni image appear side by side in the header

#### Scenario: No name or level in header
- **WHEN** the quiz header is displayed
- **THEN** the player name and level/boss label are not shown in the header area

### Requirement: Mascot beam attack

When a wave completes, the attack sequence SHALL proceed in order: (1) the **10th-question result** SHALL be reflected in the **攻撃ゲージ** (including the usual correct-answer light charge when applicable), (2) after a brief beat the gauge animates back to **0** while white sparkling light orbs travel from the gauge toward the **teacher mascot** at the same time, (3) the mascot fires a beam toward the oni once the light reaches the mascot. On impact, the oni SHALL play a **shake animation** and the **鬼 HP** gauge SHALL decrease to reflect damage.

#### Scenario: Q10 result reflected before attack drain
- **WHEN** a player completes the 10th question of a wave with a correct answer
- **THEN** the attack gauge updates to include that question's score before the drain animation begins

#### Scenario: Attack gauge drains while light flies to mascot
- **WHEN** a 10-question wave completes
- **THEN** the attack gauge animates to 0 and light orbs travel toward the teacher mascot concurrently
- **AND** the mascot shows a charging glow while absorbing the light
- **AND** the beam fires after the light reaches the mascot

#### Scenario: Mascot fires beam at oni
- **WHEN** the pre-beam charge sequence completes
- **THEN** the mascot fires a beam from its position toward the current oni image
- **AND** the beam uses the wave score as visual intensity

#### Scenario: Oni shakes on beam hit
- **WHEN** the beam reaches the oni
- **THEN** the oni image shakes before HP updates are finalized

#### Scenario: HP decreases after beam
- **WHEN** the beam finishes and the shake completes
- **THEN** the HP gauge updates to the remaining boss HP

#### Scenario: Boss defeat explosion and respawn
- **WHEN** a boss is defeated by the wave damage
- **THEN** the oni plays an explosion effect and the image disappears
- **AND** after a brief pause the next boss oni appears with an entrance animation

#### Scenario: Boss defeat message
- **WHEN** a boss is defeated
- **THEN** the mascot shows a defeat or clear message and the next boss HP gauge is shown for the following wave

### Requirement: Boss HP bar

The system SHALL display the boss remaining HP as a bar relative to the current boss maximum HP. When HP carries over between waves, the bar SHALL reflect the carried value.

#### Scenario: HP bar after partial damage
- **WHEN** a wave ends with boss HP partially remaining
- **THEN** the HP bar shows the remaining fraction until the next wave

### Requirement: Time attack result screen

When a time attack session ends (failed, cleared, or abandoned mid-run), the system SHALL show a dedicated result screen with at minimum:

- Total score (including defeat bonuses)
- Highest level / Enma reached
- Number of bosses defeated
- Clear or game-over indication

Star rating from standard mode SHALL NOT be applied to time attack sessions.

#### Scenario: Failed result
- **WHEN** a session ends due to 3 mistakes or timeout
- **THEN** the result screen shows game over with accumulated stats

#### Scenario: Clear result
- **WHEN** a session ends by defeating Enma #10
- **THEN** the result screen shows clear with accumulated stats

### Requirement: Reuse standard quiz input UX

Time attack SHALL reuse the standard quiz input experience: inline `?` answer display, calculator-style keypad, keyboard shortcuts (0–9, Backspace, Delete, Enter), and viewport-fit layout without vertical scroll during play. When the stacked play UI exceeds the available viewport height, the system SHALL scale the play panel down from the top (same behavior as standard quiz mode) rather than inserting flexible space between the question board and keypad.

#### Scenario: Keypad input
- **WHEN** a player uses the on-screen keypad during time attack
- **THEN** input behavior matches standard quiz mode

#### Scenario: Submit button visible on desktop viewport
- **WHEN** a player plays time attack on a desktop-sized viewport
- **THEN** the full keypad including the submit (`答える`) button fits within the viewport without vertical scroll
- **AND** the submit button is not clipped below the visible area

#### Scenario: Question and keypad spacing
- **WHEN** the play layout fits within the viewport with room to spare
- **THEN** the question board and keypad appear with consistent tight spacing
- **AND** excess vertical space is not inserted between the question board and keypad
