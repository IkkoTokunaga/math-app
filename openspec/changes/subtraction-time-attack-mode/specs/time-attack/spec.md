## ADDED Requirements

### Requirement: Subtraction time attack mode entry

When **引き算** is selected on the play screen, the system SHALL offer **タイムアタック（鬼退治）** with the same rules and UX as addition time attack. Subtraction time attack SHALL be playable only by **authenticated members**. Guests SHALL see the entry **locked** with a login-required message.

Subtraction time attack sessions SHALL be stored with `operation = 'subtraction'` and `mode = 'time_attack'`.

When a logged-in player has an in-progress **subtraction** time attack session, the play screen SHALL offer **続きから** for subtraction before starting a new subtraction run.

#### Scenario: Subtraction time attack entry on play screen
- **WHEN** a player selects 引き算 on the play screen
- **THEN** タイムアタック（鬼退治） is shown alongside 通常モード
- **AND** addition-only time attack is not shown under the subtraction tab

#### Scenario: Member starts subtraction time attack
- **WHEN** a logged-in player selects 引き算 and then タイムアタック with no in-progress subtraction session
- **THEN** the system navigates to `/play/time-attack?operation=subtraction` and starts at level 1

#### Scenario: Member resumes subtraction time attack
- **WHEN** a logged-in player has an in-progress subtraction time attack session
- **THEN** 続きから is shown under the 引き算 tab
- **AND** resuming restores the same subtraction session (boss, HP, wave)

#### Scenario: Guest sees locked subtraction time attack
- **WHEN** a guest selects 引き算 on the play screen
- **THEN** タイムアタック is visible but disabled with a login-required message

#### Scenario: Addition and subtraction time attack sessions are independent
- **WHEN** a player has an in-progress addition time attack session
- **AND** starts or resumes a subtraction time attack session
- **THEN** both sessions can coexist
- **AND** each 続きから appears only under its respective operation tab

#### Scenario: Subtraction time attack does not affect standard unlock
- **WHEN** a player completes or clears a subtraction time attack session
- **THEN** subtraction standard mode level unlock is unchanged

### Requirement: Subtraction time attack question generation

Subtraction time attack SHALL use **two-operand** questions only (no three-term subtraction). Levels 1–6 SHALL reuse subtraction standard mode rules. Levels 7–10 SHALL use time-attack-specific subtraction rules below. Subtrahends SHALL NOT be 0.

| Level | Rule |
|-------|------|
| 1 | 1-digit − 1-digit, no borrow (subtrahend 1–9) |
| 2 | 2-digit − 1-digit, with borrow |
| 3 | 2-digit − 1-digit, no borrow |
| 4 | 2-digit − 2-digit, no borrow |
| 5 | 2-digit − 2-digit, with borrow |
| 6 | 3-digit − 2-digit, no borrow |
| 7 | 3-digit − 2-digit, with borrow (borrow to hundreds place) |
| 8 | 3-digit − 3-digit, no borrow |
| 9 | 3-digit − 3-digit, with borrow (閻魔) |
| 10 | 3-digit − 3-digit, with borrow (黒い閻魔) |

Answer input SHALL accept at most **3 digits** at all subtraction time attack levels.

#### Scenario: Level 1 subtraction TA generation
- **WHEN** a subtraction time attack wave begins at level 1
- **THEN** each question is 1-digit − 1-digit with no borrow and subtrahend ≥ 1

#### Scenario: Level 7 subtraction TA generation
- **WHEN** a subtraction time attack wave begins at level 7
- **THEN** each question is 3-digit − 2-digit with at least one borrow including hundreds place

#### Scenario: No zero subtrahend in subtraction TA
- **WHEN** generating subtraction time attack questions at any level
- **THEN** operandB is never 0

#### Scenario: Subtraction expression display
- **WHEN** a subtraction time attack question is shown
- **THEN** the equation uses `-` (e.g. `45 - 12 = ?`)

### Requirement: Subtraction time attack oni boss art

During subtraction time attack at levels 1–8, the boss SHALL use `/oni-subtraction.png` with level-specific inline CSS filters. Addition time attack SHALL continue to use the original `/oni.png` with level-specific CSS class tints unchanged. Level 9 閻魔 SHALL use `/enma.png`; level 10 閻魔 SHALL use `/enma-lv10.png`. Both are shared between addition and subtraction time attack.

#### Scenario: Subtraction oni sprite
- **WHEN** the player faces an oni boss during subtraction time attack at level N (1–8)
- **THEN** the header shows `/oni-subtraction.png` with a level-specific color tint

#### Scenario: Addition oni unchanged
- **WHEN** the player faces an oni boss during addition time attack at level N (1–8)
- **THEN** the header shows the original `/oni.png` with the existing CSS class tint

#### Scenario: Shared Enma art
- **WHEN** the player faces 閻魔 at level 9 or 10 in either operation
- **THEN** the header shows `/enma.png` at level 9 and `/enma-lv10.png` at level 10 without CSS color filters

### Requirement: Subtraction time attack mascot

During subtraction time attack, the teacher mascot SHALL wear **light blue (水色) clothing** using the subtraction mascot asset.

#### Scenario: Light blue mascot in subtraction TA
- **WHEN** a player is in subtraction time attack
- **THEN** the header mascot shows light blue clothing

#### Scenario: Addition TA mascot unchanged
- **WHEN** a player is in addition time attack
- **THEN** the mascot shows the default red clothing

## MODIFIED Requirements

### Requirement: Time attack mode entry

The system SHALL offer **タイムアタック** per operation (**足し算** / **引き算**). Addition time attack behavior SHALL remain unchanged. Subtraction time attack SHALL follow the same boss progression, wave rules, mistake limit, HP formulas, boss BGM rotation, and result flow as addition time attack except where subtraction-specific rules above apply.

In-progress resume SHALL be scoped by **operation**: at most one resumable addition time attack session and at most one resumable subtraction time attack session per player.

#### Scenario: Addition time attack unchanged
- **WHEN** a player selects 足し算 and タイムアタック
- **THEN** the existing addition time attack flow runs unchanged

#### Scenario: Operation-scoped resume query
- **WHEN** the play screen loads resume info for 引き算
- **THEN** only in-progress sessions with `operation = 'subtraction'` and `mode = 'time_attack'` are considered

### Requirement: Time attack session resume

The system SHALL persist in-progress time attack sessions per **operation**. A logged-in player MAY have one resumable addition time attack session and one resumable subtraction time attack session simultaneously.

#### Scenario: Resume subtraction only from subtraction tab
- **WHEN** a player has an in-progress subtraction time attack and opens 足し算 tab
- **THEN** 続きから for subtraction is not shown under 足し算

#### Scenario: New subtraction run abandons prior subtraction session only
- **WHEN** a player selects タイムアタックを新しく始める while a subtraction session is in progress
- **THEN** only the prior subtraction in-progress session is abandoned
- **AND** any addition in-progress time attack session remains unchanged

### Requirement: Time attack result screen

The time attack result screen SHALL display question expressions using `-` for subtraction sessions and `+` for addition sessions.

#### Scenario: Subtraction TA result expressions
- **WHEN** a player views the result screen for a completed subtraction time attack session
- **THEN** per-question rows show subtraction expressions (e.g. `123 - 45`)

### Requirement: Reuse standard quiz input UX

Time attack answer digit limits SHALL depend on operation: addition levels 8–10 allow 4 digits; **subtraction allows at most 3 digits at all levels**.

#### Scenario: Subtraction TA max digits
- **WHEN** a player enters an answer during subtraction time attack at level 10
- **THEN** input accepts at most 3 digits
