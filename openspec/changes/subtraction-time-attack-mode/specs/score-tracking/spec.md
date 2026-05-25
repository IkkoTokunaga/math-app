## ADDED Requirements

### Requirement: Subtraction time attack session persistence

Completed subtraction time attack sessions SHALL be saved with `operation = 'subtraction'` and `mode = 'time_attack'`. Question logs SHALL store minuend/subtrahend operands; result breakdowns SHALL display subtraction expressions.

#### Scenario: Save subtraction TA session
- **WHEN** a subtraction time attack session ends
- **THEN** the session record includes `operation = 'subtraction'`

## MODIFIED Requirements

### Requirement: Score breakdown on result screen

For time attack result screens, per-question rows SHALL use `+` for addition sessions and `-` for subtraction sessions.

#### Scenario: Subtraction TA per-question row
- **WHEN** viewing a subtraction time attack result with question logs
- **THEN** each row shows `operandA - operandB = answer` format
