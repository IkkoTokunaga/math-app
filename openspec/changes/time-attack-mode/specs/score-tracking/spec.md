## ADDED Requirements

### Requirement: Time attack scoring without streak bonuses

Time attack scoring SHALL use the following formulas. **Streak milestone bonuses SHALL NOT apply** in time attack mode.

Per question (on correct answer):

```
basePoints   = level × 10
timeBonus    = level × remainingSeconds × timeBonusMultiplier   // only when remainingSeconds > 0
pointsEarned = basePoints + timeBonus
```

Where:

```
remainingSeconds = max(0, timeLimitSeconds - floor(max(0, elapsedSeconds - 1)))
```

If `remainingSeconds` is 0, **timeBonus = 0** but the player MAY still submit a correct answer for **basePoints only**. The session SHALL NOT end solely due to timeout.

For levels 1–9: `timeLimitSeconds = 10`, `timeBonusMultiplier = 1`.

For the final 閻魔大王 at level 10: `timeLimitSeconds = 7`, `timeBonusMultiplier = 10`.

#### Scenario: Level 3 correct with time remaining
- **WHEN** a player answers correctly at level 3 with 7 remaining bonus seconds (multiplier ×1)
- **THEN** pointsEarned = 30 + (3 × 7 × 1) = 51

#### Scenario: Level 3 correct after timeout
- **WHEN** a player answers correctly at level 3 after bonus time has expired
- **THEN** pointsEarned = 30 (base only)
- **AND** the session continues

#### Scenario: Level 10 Enma double instant answer
- **WHEN** a player answers correctly at level 10 with 7 remaining bonus seconds
- **THEN** basePoints = 100
- **AND** timeBonus = 10 × 7 × 10 = 700
- **AND** pointsEarned = 800

#### Scenario: No streak bonus
- **WHEN** a player achieves 3 consecutive first-attempt correct answers in time attack
- **THEN** no streak milestone bonus is added

### Requirement: Theoretical wave maximum for time attack

The theoretical maximum score for a 5-question wave SHALL be:

```
WAVE_QUESTION_COUNT = 5
maxPerQuestion = level × 10 + level × timeLimitSeconds × timeBonusMultiplier
waveMaxScore   = maxPerQuestion × WAVE_QUESTION_COUNT
```

Boss HP SHALL use:

```
oniMaxHp = floor(waveMaxScore × getOniHpRatio(level, enmaNumber) × ONI_HP_MULTIPLIER)
```

Level-scaled ratios: Lv1–3 → 5, Lv4–7 → 3, Lv8 → 2, Lv9 閻魔 → 2, Lv10 黒い閻魔 → 4.

This value SHALL be used for the wave progress bar maximum and boss HP calculation.

#### Scenario: Level 1 wave maximum
- **WHEN** a level 1 wave begins (10 sec, ×1)
- **THEN** maxPerQuestion = 20 and waveMaxScore = 100

#### Scenario: Level 1 boss HP
- **WHEN** a level 1 oni appears
- **THEN** oniMaxHp = floor(100 × 5 × 0.85) = 425

#### Scenario: Level 10 Enma wave maximum
- **WHEN** a level 10 閻魔 wave begins (7 sec, ×10)
- **THEN** maxPerQuestion = 100 + 10 × 7 × 10 = 800
- **AND** waveMaxScore = 4000

### Requirement: Time attack session total score

The session total score SHALL be the sum of:

1. All `pointsEarned` from every question across all waves
2. All defeat bonuses (`floor(waveScore × 0.5)` on each boss defeat)

#### Scenario: Session total with one defeat bonus
- **WHEN** a player earns 350 points in a wave that defeats a boss
- **THEN** 175 defeat bonus is added to the session total

### Requirement: Time attack results persisted without stars

Time attack session results SHALL be persisted to the database for authenticated players with `mode = 'time_attack'`. The standard star rating (★0–5) SHALL NOT be calculated or displayed for time attack sessions. In-progress sessions SHALL also be persisted for resume.

#### Scenario: Completed time attack saved
- **WHEN** a time attack session ends
- **THEN** total score, level reached, Enma reached, and boss defeat count are saved
- **AND** stars field is null or omitted from display

#### Scenario: In-progress session saved
- **WHEN** a player answers a question during an active time attack session
- **THEN** the session state is persisted for later resume

### Requirement: Time attack results in progress dashboard

Completed time attack sessions SHALL appear in the progress dashboard **最近の結果** list for the matching operation, mixed with standard sessions in reverse chronological order (most recent 5 total). Each time attack row SHALL show **タイムアタック**, played date, total score, outcome, boss reached, and bosses defeated. Star rating SHALL NOT be shown.

The progress dashboard SHALL also display **過去最高得点** for the selected operation: the maximum total score among all completed time attack sessions for that operation.

#### Scenario: Time attack shown in recent history
- **WHEN** a logged-in player opens the progress dashboard after completing a time attack session
- **THEN** that session appears in **最近の結果** for the matching operation tab
- **AND** the row shows score and boss progress without stars

#### Scenario: Time attack best score on dashboard
- **WHEN** a logged-in player has multiple completed time attack sessions for an operation
- **THEN** the dashboard **タイムアタック** section shows the highest total score as **過去最高得点**
