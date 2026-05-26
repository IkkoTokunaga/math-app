## ADDED Requirements

### Requirement: Time attack mode entry

The system SHALL offer a **タイムアタック** mode separate from the standard 10-question quiz. Time attack SHALL be playable only by **authenticated (logged-in) members**. The entry point SHALL remain **visible** to guests but SHALL be **locked** (disabled) with a brief message that login is required.

When a logged-in player has an in-progress time attack session (`time_attack_state.status = 'wave_active'`), the play screen SHALL offer **続きから** to resume that session before starting a new run.

#### Scenario: Member starts time attack
- **WHEN** a logged-in player selects タイムアタック from the play screen and has no in-progress session
- **THEN** the system starts a new time attack session at level 1

#### Scenario: Member resumes time attack
- **WHEN** a logged-in player has an in-progress time attack session
- **THEN** the play screen offers 続きから
- **AND** selecting it restores the same boss, HP, wave index, and question batch

#### Scenario: Guest sees locked time attack
- **WHEN** a guest opens the play screen
- **THEN** the タイムアタック option is visible but not selectable
- **AND** the UI indicates that login is required to play

#### Scenario: Time attack does not affect standard unlock
- **WHEN** a player completes or clears a time attack session
- **THEN** the standard mode level unlock state is unchanged

### Requirement: Time attack session always starts at level 1

Every **new** time attack session SHALL begin at **level 1**, regardless of the player's unlocked level in standard mode. Resuming an in-progress session SHALL continue from the saved level and boss state.

#### Scenario: New time attack session
- **WHEN** a logged-in player starts a new time attack session
- **THEN** the first wave uses level 1 questions and level 1 boss parameters

#### Scenario: Development shortcut to boss stage
- **WHEN** the app runs in development and the player opens `/play/time-attack?devStart=<level>` (1–10)
- **THEN** a new time attack session starts at the requested level with full boss HP
- **AND** any in-progress time attack session is abandoned first

#### Scenario: Development shortcut ignored in production
- **WHEN** the app runs outside development and the URL includes `devStart`
- **THEN** the session starts at level 1 as usual

### Requirement: Time attack level question generation

Time attack SHALL use **dedicated question generation rules per level**. Levels 1–6 SHALL match the standard mode addition rules. Levels 7–10 SHALL use the time-attack-specific rules below.

| Level | Operands | Carry rule |
|-------|----------|------------|
| Lv1 | 1–9 + 1–9 | No carry (sum ≤ 9) |
| Lv2 | 1–9 + 1–9 | With carry (sum ≥ 10) |
| Lv3 | 1–9 + 10–99 (either order) | No carry in any column |
| Lv4 | 1–9 + 10–99 (either order) | At least one carry |
| Lv5 | 10–99 + 10–99 | No carry in any column |
| Lv6 | 10–99 + 10–99 | At least one carry |
| Lv7 | 10–99 + 10–99 | Tens column carries to hundreds (sum ≥ 100) |
| Lv8 | 1–999 + 1–99 (either order) | Any |
| Lv9 | 1–999 + 1–999 | Any (閻魔) |
| Lv10 | 1–999 + 1–999 | Any (黒い閻魔) |

Answer input SHALL accept up to **3 digits** for levels 1–7 and **4 digits** for levels 8–10.

#### Scenario: Level 7 question generation
- **WHEN** a level 7 wave begins
- **THEN** each question uses two operands of 10–99 whose tens digits sum to 10 or more

#### Scenario: Level 8 question generation
- **WHEN** a level 8 wave begins
- **THEN** one operand is 1–999 and the other is 1–99

#### Scenario: Level 9 question generation
- **WHEN** a level 9 wave begins against 閻魔大王
- **THEN** each operand is 1–999

#### Scenario: Level 10 question generation
- **WHEN** a level 10 wave begins against 閻魔大王
- **THEN** each operand is 1–999

### Requirement: Five-question waves with server generation and scoring

Time attack SHALL proceed in **waves of exactly 5 questions**. At the start of each wave, the server SHALL generate 5 questions for the current level using the same generation rules as standard mode. After each answer, the server SHALL score the submission. After the 5th question of a wave, the server SHALL aggregate the wave score and apply it as damage to the boss HP.

#### Scenario: Wave start
- **WHEN** a time attack wave begins
- **THEN** the server generates 5 unique questions for the current level and stores them in the session

#### Scenario: Wave completion scoring
- **WHEN** the player completes the 5th question of a wave (correct or incorrect submission counted as a question slot)
- **THEN** the server sums points earned in that wave
- **AND** subtracts that sum from the boss remaining HP

### Requirement: One attempt per question with no retry

During time attack, each question SHALL allow **one submission only**. On an incorrect answer, the system SHALL award **0 points**, increment the mistake counter, show yellow alert feedback, and **advance to the next question** without allowing retry on the same question.

#### Scenario: Wrong answer advances
- **WHEN** a player submits an incorrect answer during time attack
- **THEN** the question awards 0 points
- **AND** the mistake count increases by 1
- **AND** the next question is shown without retry

#### Scenario: Correct answer within time limit
- **WHEN** a player submits the correct answer while bonus time remains
- **THEN** points are awarded per time attack scoring rules including time bonus
- **AND** the next question is shown

#### Scenario: Correct answer after time limit
- **WHEN** a player submits the correct answer after bonus time has expired
- **THEN** only base points are awarded (time bonus = 0)
- **AND** the session continues
- **AND** the next question is shown after submission

### Requirement: Session end on three mistakes

When the mistake count reaches **3**, the time attack session SHALL end and navigate to the time attack result screen after a **screen darkening** transition. The quiz view SHALL show **three heart icons** directly below the attack gauge within the attack gauge frame; each incorrect answer SHALL remove one heart **after** the evil-orb hit animation completes. No caption or label SHALL appear beside the hearts.

#### Scenario: Evil orb on incorrect answer
- **WHEN** a player submits an incorrect answer
- **THEN** an incorrect-answer popup is shown while a purple evil orb surrounded by orbiting poison particles and a sickly green aura flies from the oni toward the teacher mascot
- **AND** the popup dismisses when the orb hits the mascot and a heart is lost
- **AND** the next question does not appear until the orb hit and heart-loss sequence completes

#### Scenario: Heart lost after orb hit
- **WHEN** the evil orb reaches the teacher mascot
- **THEN** one heart is removed
- **AND** the mascot plays a brief hit reaction

#### Scenario: Hearts reflect remaining lives
- **WHEN** a player is in time attack
- **THEN** three hearts appear below the attack gauge inside the attack gauge frame
- **AND** each mistake removes one heart until none remain

#### Scenario: Third mistake
- **WHEN** a player submits a third incorrect answer in one time attack session
- **THEN** the final heart is removed after the evil orb hits
- **AND** the screen darkens
- **AND** the result screen is shown

### Requirement: Per-question time limit without session end on timeout

Each question SHALL have an internal time limit used for **time bonus calculation only**. The limit SHALL NOT be shown to the player. When the limit elapses, the session SHALL **NOT** end. The player MAY continue answering; a correct answer after timeout SHALL award **base points only** (time bonus = 0). Timeout SHALL NOT increment the mistake counter.

For levels 1–9 (non–double-HP bosses), the limit SHALL be **10 seconds**.

For the final 閻魔大王 at level 10, the limit SHALL be **7 seconds** with time bonus multiplier **×10**.

The first **1 second** after a question appears SHALL NOT advance the bonus countdown (same grace as standard mode).

#### Scenario: Timeout does not end session
- **WHEN** the per-question time limit expires internally
- **THEN** the session continues
- **AND** the player may still submit an answer for base points only

#### Scenario: Grace period
- **WHEN** a new question is displayed
- **THEN** the internal bonus countdown does not decrease during the first 1 second

### Requirement: Alert effects

The time attack quiz view SHALL show a visual alert effect on incorrect submission: yellow alert, then evil orb from oni to mascot.

#### Scenario: Yellow alert on mistake
- **WHEN** a player submits an incorrect answer
- **THEN** a yellow alert effect is shown briefly

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** alert effects use non-flashing alternatives (e.g. border color change)

### Requirement: Boss HP and damage

Each boss SHALL have HP calculated as:

```
waveMaxScore = maxPerQuestion × WAVE_QUESTION_COUNT
oniMaxHp     = floor(waveMaxScore × getOniHpRatio(level, enmaNumber))
```

Where:

```
WAVE_QUESTION_COUNT = 5
maxPerQuestion = level × 10 + level × timeLimitSeconds × timeBonusMultiplier
```

Level-scaled HP ratio:

| Boss | getOniHpRatio |
|------|---------------|
| Lv1–3 oni | 5 |
| Lv4–7 oni | 3 |
| Lv8 oni | 2 |
| Lv9 閻魔 | 2 |
| Lv10 閻魔（黒） | 4 |

When a wave ends, `remainingHp -= waveScore`. If remaining HP is **greater than 0**, the same boss continues and **HP carries over** to the next wave. If remaining HP is **≤ 0**, the boss is defeated.

#### Scenario: HP carryover
- **WHEN** a wave ends with remaining boss HP above 0
- **THEN** the next wave continues against the same boss with the remaining HP unchanged

#### Scenario: Boss defeated
- **WHEN** a wave reduces remaining HP to 0 or below
- **THEN** the boss is marked defeated
- **AND** defeat processing runs (bonus, level advance, or clear)

### Requirement: Segmented boss HP bar

The boss HP bar SHALL be divided into **getOniHpRatio** equal segments for the current boss. Each segment SHALL represent approximately one full-wave damage chunk at theoretical maximum wave score. Removed HP SHALL appear as depleted segments so the player can see how many attack cycles remain before defeat.

Numeric HP values SHALL NOT be shown on the HP gauge.

#### Scenario: Segments match ratio
- **WHEN** the player faces a level 2 oni (ratio ×5)
- **THEN** the HP bar shows 5 segments

#### Scenario: Segment depletes after wave damage
- **WHEN** a wave deals damage without defeating the boss
- **THEN** the HP bar updates with depleted segments reflecting remaining HP

### Requirement: Defeat bonus

When a boss is defeated, the system SHALL add a defeat bonus equal to **50% of the wave score** (the points earned in that 5-question wave, floored):

```
defeatBonus = floor(waveScore × 0.5)
```

#### Scenario: Defeat bonus applied
- **WHEN** a boss is defeated on a wave that earned 400 points
- **THEN** 200 points are added to the session total as defeat bonus

### Requirement: Level progression through oni and Enma bosses

Levels 1–8 SHALL use colored oni bosses. Level 9 SHALL use **閻魔大王** (purple `/enma.png`). Level 10 SHALL use **閻魔大王** with **red skin** and a **large black aura** on `/enma.png`, and double the HP ratio of level 9. Both Enma stages SHALL display the label **閻魔大王** only (no 「体力倍」 suffix). Defeating the boss at level N SHALL advance the player to level N+1 with a fresh boss HP pool.

#### Scenario: Level 1 oni defeated
- **WHEN** the level 1 oni is defeated
- **THEN** the next wave starts at level 2 with newly calculated HP

#### Scenario: Level 8 oni defeated
- **WHEN** the level 8 oni is defeated
- **THEN** the next wave starts at level 9 against 閻魔大王

#### Scenario: Level 9 Enma defeated
- **WHEN** 閻魔大王 at level 9 is defeated
- **THEN** the next wave starts at level 10 against 閻魔大王 (red skin, black aura)

### Requirement: Clear on level 10 Enma defeat

After defeating **閻魔大王** at level 10, the time attack session SHALL end with status **cleared** and navigate to the result screen. No further waves SHALL be offered.

#### Scenario: Game clear
- **WHEN** the player defeats 閻魔大王 at level 10
- **THEN** the session status is cleared
- **AND** the result screen shows a clear/victory state

### Requirement: Wave score progress bar

During an active wave, the system SHALL display a clearly visible **攻撃ゲージ** progress bar whose maximum is the **theoretical maximum score for the current 5-question wave** (base points + time bonus at instant answers, **excluding streak bonuses**). The bar fill SHALL reflect the running total score earned in the current wave. Numeric score values SHALL NOT be shown on the attack or HP gauges. A separate **鬼 HP** gauge (segmented) SHALL remain visible at all times. The HP gauge header SHALL combine the boss level label and HP into one line (e.g. **鬼 Lv3 HP** for oni stages, **閻魔大王 HP** for Enma). The attack gauge and oni HP gauge SHALL be displayed **side by side** in one row, with the oni HP gauge **aligned to the right**.

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
- **THEN** the segmented oni HP gauge is always visible

#### Scenario: Gauges side by side
- **WHEN** the quiz view is displayed
- **THEN** the attack gauge and oni HP gauge appear in one horizontal row
- **AND** the oni HP gauge is right-aligned within that row

#### Scenario: Bar resets on new wave
- **WHEN** a new wave begins
- **THEN** the attack gauge resets to 0 with the maximum recalculated for the current level and Enma parameters

### Requirement: Oni score display

The session total score SHALL be shown together with boss artwork in the quiz header. Levels 1–8 SHALL use `/oni.png` (transparent background) with a **distinct CSS color tint per level**. Level 9 閻魔 SHALL use `/enma.png` with a **purple** tint. Level 10 閻魔 SHALL use `/enma.png` with **red skin** and a **large black aura**. The header SHALL display **three items in one horizontal row**: the teacher mascot on the left, the total score in the center, and the boss image on the right. Question progress (e.g. `問題 N / 5`) SHALL NOT appear in the header. The player name and level label SHALL NOT appear in the header.

#### Scenario: Header row layout
- **WHEN** a player is in time attack
- **THEN** the teacher mascot, total score only, and boss image appear side by side in the header

#### Scenario: Oni color changes by level
- **WHEN** the player faces an oni boss at level N (1–8)
- **THEN** the header shows `/oni.png` with a level-specific color tint distinct from other levels

#### Scenario: Enma uses dedicated artwork
- **WHEN** the player faces 閻魔 at level 9
- **THEN** the header shows `/enma.png` with a purple tint

#### Scenario: Final Enma at level 10
- **WHEN** the player faces 閻魔 at level 10
- **THEN** the header shows `/enma.png` with red skin and a large black aura distinct from level 9

#### Scenario: No name or level in header
- **WHEN** the quiz header is displayed
- **THEN** the player name and level/boss label are not shown in the header area

#### Scenario: Boss image in front of gauges on mobile
- **WHEN** the boss image overlaps the attack or HP gauge row on a narrow viewport
- **THEN** the boss image (including its feet) is rendered in front of the gauges

### Requirement: Mascot light orb attack

When a wave completes, the attack sequence SHALL proceed in order: (1) the **5th-question result** SHALL be reflected in the **攻撃ゲージ** (including the usual correct-answer light charge when applicable), (2) after a brief beat the gauge animates back to **0** while white sparkling light orbs travel from the gauge toward the **teacher mascot** at the same time, (3) the mascot launches a **light orb** toward the oni once the light reaches the mascot. On impact, the oni SHALL play a **shake animation** and the **鬼 HP** gauge SHALL decrease to reflect damage.

**Non-defeat waves SHALL NOT show an attack popup** (no 「鬼へ攻撃！」). **Boss defeat SHALL pause question progression** and show a **「鬼撃破！」** popup until dismissed, then proceed to the next boss entrance and next wave. **While question input is blocked and before the defeat popup appears**, a **full-screen loading overlay with a spinning indicator and 「読み込み中...」** SHALL be shown (same pattern as route loading). **Level 10 閻魔 defeat (game clear) SHALL use a longer defeat effect sequence** and display **「鬼、すべて撃破！」** instead of the standard defeat popup text, then navigate to the clear result screen.

#### Scenario: No attack popup on non-defeat wave
- **WHEN** a wave ends without defeating the boss
- **THEN** the attack animation plays without an attack popup
- **AND** the next wave question begins after the animation completes

#### Scenario: Defeat popup on boss defeat
- **WHEN** a boss is defeated by wave damage (except level 10 final clear)
- **THEN** question input is blocked
- **AND** a loading overlay with a spinner and **「読み込み中...」** is shown until the attack preamble completes
- **AND** a **「鬼撃破！」** popup is shown
- **AND** the popup remains until the defeat sequence (explosion, next boss entrance) completes

#### Scenario: Final Enma defeat celebration
- **WHEN** 閻魔大王 at level 10 is defeated
- **THEN** question input is blocked
- **AND** a longer defeat effect sequence plays (extended explosion / celebration versus normal boss defeat)
- **AND** a **「鬼、すべて撃破！」** popup is shown
- **AND** the session navigates to the clear result screen after the sequence completes

#### Scenario: Next wave after boss defeat
- **WHEN** a boss is defeated by wave damage
- **THEN** the question board and keypad are hidden until the next boss oni entrance animation completes
- **AND** the next wave question begins only after the new oni is visible in idle state and the defeat popup is dismissed
- **AND** the defeat bonus mascot message is shown after the new wave question state is applied

#### Scenario: Q5 result reflected before attack drain
- **WHEN** a player completes the 5th question of a wave with a correct answer
- **THEN** the attack gauge updates to include that question's score before the drain animation begins

#### Scenario: Attack gauge drains while light flies to mascot
- **WHEN** a 5-question wave completes
- **THEN** the attack gauge animates to 0 and light orbs travel toward the teacher mascot concurrently
- **AND** the mascot shows a charging glow while absorbing the light
- **AND** the light orb launches after the light reaches the mascot

#### Scenario: Mascot launches light orb at oni
- **WHEN** the pre-attack charge sequence completes
- **THEN** the mascot launches a white light orb surrounded by orbiting sparkles and trailing light streaks from its position toward the current oni image

#### Scenario: Oni shakes on light orb hit
- **WHEN** the light orb reaches the oni
- **THEN** the oni image shakes before HP updates are finalized

#### Scenario: HP decreases after light orb
- **WHEN** the light orb finishes and the shake completes
- **THEN** the HP gauge updates to the remaining boss HP

#### Scenario: Boss defeat explosion and respawn
- **WHEN** a boss is defeated by the wave damage
- **THEN** the oni plays an explosion effect and the image disappears
- **AND** after a brief pause the next boss oni appears with an entrance animation

#### Scenario: Boss defeat message
- **WHEN** a boss is defeated
- **THEN** the mascot shows a defeat or clear message and the next boss HP gauge is shown for the following wave

### Requirement: Time attack session resume

The system SHALL persist in-progress time attack sessions after each answer and wave completion. A logged-in player SHALL have at most **one** resumable in-progress time attack session. Leaving the page without failing or clearing SHALL NOT discard progress.

#### Scenario: Progress saved on answer
- **WHEN** a player submits an answer during time attack
- **THEN** the updated time_attack_state and question progress are saved to the database

#### Scenario: Resume from play screen
- **WHEN** a player with an in-progress session opens the play screen
- **THEN** 続きから is available
- **AND** resuming restores the same sessionId, boss, HP, and wave position

#### Scenario: Start new run without confirmation
- **WHEN** a player with an in-progress session selects タイムアタックを新しく始める
- **THEN** the system abandons the in-progress session and starts a new time attack at level 1
- **AND** no browser confirmation dialog is shown

#### Scenario: Cleared or failed sessions not resumable
- **WHEN** a time attack session has status cleared or failed
- **THEN** it cannot be resumed from 続きから

#### Scenario: No continue after game over on play screen
- **WHEN** a player ends a time attack session due to 3 mistakes and returns to the play screen
- **THEN** 続きから is NOT shown
- **AND** only the option to start a new time attack run is offered

#### Scenario: Resume route without in-progress session
- **WHEN** a logged-in player opens `/play/time-attack` without `new=1` and has no resumable in-progress session
- **THEN** the system redirects to the play screen
- **AND** does NOT create a new in-progress session automatically

### Requirement: Time attack result screen

When a time attack session ends (failed, cleared, or abandoned mid-run), the system SHALL show a dedicated result screen with at minimum:

- Total score (including defeat bonuses)
- Highest level / Enma reached
- Number of bosses defeated
- Clear or game-over indication

Star rating from standard mode SHALL NOT be applied to time attack sessions.

#### Scenario: Failed result
- **WHEN** a session ends due to 3 mistakes
- **THEN** the result screen shows game over with accumulated stats

#### Scenario: Clear result
- **WHEN** a session ends by defeating 閻魔大王 at level 10
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

### Requirement: Time attack boss BGM rotation

During an active time attack session, the system SHALL play looping background music. Background music for each boss SHALL begin **1 second** after the boss becomes active (session entry, resume, or next boss enter). When the boss identity changes after a boss defeat (`currentLevel` and/or `enmaNumber` advances), the system SHALL switch to a different track chosen randomly from the configured boss BGM pool. Within the same session, a track SHALL NOT repeat until every other track in the pool has already played once. Resuming the same in-progress session SHALL continue the same non-repeating queue. Background music SHALL stop when the session ends or the player leaves time attack.

#### Scenario: BGM starts on session entry
- **WHEN** a player enters an active time attack session
- **THEN** background music for the current boss begins after a 1 second delay

#### Scenario: BGM changes on boss defeat
- **WHEN** a player defeats a boss and the next boss enters
- **THEN** the background music switches to a different unused track from the pool after a 1 second delay

#### Scenario: No duplicate track within one cycle
- **WHEN** multiple boss changes occur within the same session before the track pool is exhausted
- **THEN** each new boss uses a track that has not yet played in that session cycle

#### Scenario: BGM stops on session end
- **WHEN** a time attack session ends or the player leaves time attack
- **THEN** background music stops

### Requirement: Gauge-to-mascot charge sound

When the attack gauge drains and white light orbs travel from the gauge toward the teacher mascot during a wave attack sequence, the system SHALL play the gauge charge sound effect (`/sounds/time-attack-gauge-charge.mp3`).

#### Scenario: Gauge charge sound on wave attack
- **WHEN** the gauge-to-mascot light animation begins after a completed wave
- **THEN** the system plays the gauge charge sound effect

### Requirement: Mascot beam attack sound

When the mascot fires the light-orb beam attack toward the boss after a wave's gauge attack sequence, the system SHALL play the beam attack sound effect (`/sounds/time-attack-beam.mp3`).

#### Scenario: Beam sound on wave attack
- **WHEN** the mascot beam attack animation begins after a completed wave gauge sequence
- **THEN** the system plays the beam attack sound effect

### Requirement: Oni counterattack sound

When the oni fires the evil-orb counterattack toward the mascot after an incorrect answer, the system SHALL play the oni attack sound effect (`/sounds/time-attack-oni-attack.mp3`).

#### Scenario: Oni attack sound on wrong answer
- **WHEN** the oni evil-orb attack animation begins after an incorrect answer
- **THEN** the system plays the oni attack sound effect

### Requirement: Oni appearance roar sound

When an oni boss (levels 1–8) appears at the start of a time attack session or enters after the previous oni is defeated, the system SHALL play one roar sound chosen at random from `/sounds/oni-roar-1.mp3`, `/sounds/oni-roar-2.mp3`, `/sounds/oni-roar-3.mp3`, `/sounds/oni-roar-goblin-1.mp3`, `/sounds/oni-roar-goblin-2.mp3`, and `/sounds/oni-roar-goblin-3.mp3`. Enma bosses (levels 9–10) SHALL NOT play this roar sound on appearance.

#### Scenario: Random roar when oni enters
- **WHEN** a new oni boss enters after the previous oni is defeated
- **THEN** the system plays exactly one of the six oni roar sound effects at random

#### Scenario: Random roar at session start
- **WHEN** a time attack session begins against an oni boss at level 1–8
- **THEN** the system plays exactly one of the six oni roar sound effects at random

#### Scenario: No roar for Enma appearance
- **WHEN** Enma appears at level 9 or 10, including after defeating the level 8 oni
- **THEN** the system does not play any oni roar sound effect
