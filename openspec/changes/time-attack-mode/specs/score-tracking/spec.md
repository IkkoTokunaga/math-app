## ADDED Requirements

### Requirement: Time attack scoring without streak bonuses

Time attack scoring SHALL use the following formulas. **Streak milestone bonuses SHALL NOT apply** in time attack mode.

Per question (on correct answer within time limit):

```
basePoints   = level × 10
timeBonus    = level × remainingSeconds × timeBonusMultiplier
pointsEarned = basePoints + timeBonus
```

Where:

```
remainingSeconds = max(0, timeLimitSeconds - floor(max(0, elapsedSeconds - 1)))
```

If `remainingSeconds` is 0 (time exhausted before correct answer), the session ends per time attack end rules; no points are awarded for that question.

For levels 1–9: `timeLimitSeconds = 10`, `timeBonusMultiplier = 1`.

For Enma at level 10: values come from the Enma stage table in the time-attack spec.

#### Scenario: Level 3 correct with time remaining
- **WHEN** a player answers correctly at level 3 with 7 remaining bonus seconds (multiplier ×1)
- **THEN** pointsEarned = 30 + (3 × 7 × 1) = 51

#### Scenario: Enma #10 instant answer
- **WHEN** a player answers correctly at Enma #10 with 7 remaining bonus seconds
- **THEN** basePoints = 100
- **AND** timeBonus = 10 × 7 × 10 = 700
- **AND** pointsEarned = 800

#### Scenario: No streak bonus
- **WHEN** a player achieves 3 consecutive first-attempt correct answers in time attack
- **THEN** no streak milestone bonus is added

### Requirement: Theoretical wave maximum for time attack

The theoretical maximum score for a 10-question wave SHALL be:

```
maxPerQuestion = level × 10 + level × timeLimitSeconds × timeBonusMultiplier
waveMaxScore   = maxPerQuestion × 10
```

This value SHALL be used for the wave progress bar maximum and boss HP calculation (× 0.85).

#### Scenario: Level 1 wave maximum
- **WHEN** a level 1 wave begins (10 sec, ×1)
- **THEN** maxPerQuestion = 20 and waveMaxScore = 200

#### Scenario: Enma #6 wave maximum at level 10
- **WHEN** an Enma #6 wave begins (7 sec, ×6)
- **THEN** maxPerQuestion = 100 + 10 × 7 × 6 = 520
- **AND** waveMaxScore = 5200

### Requirement: Time attack session total score

The session total score SHALL be the sum of:

1. All `pointsEarned` from every question across all waves
2. All defeat bonuses (`floor(waveScore × 0.5)` on each boss defeat)

#### Scenario: Session total with one defeat bonus
- **WHEN** a player earns 350 points in a wave that defeats a boss
- **THEN** 175 defeat bonus is added to the session total

### Requirement: Time attack results persisted without stars

Time attack session results SHALL be persisted to the database for authenticated players with `mode = 'time_attack'`. The standard star rating (★0–5) SHALL NOT be calculated or displayed for time attack sessions.

#### Scenario: Completed time attack saved
- **WHEN** a time attack session ends
- **THEN** total score, level reached, Enma reached, and boss defeat count are saved
- **AND** stars field is null or omitted from display
