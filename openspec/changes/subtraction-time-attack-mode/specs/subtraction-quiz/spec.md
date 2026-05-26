## MODIFIED Requirements

### Requirement: Play mode selection

When **引き算** is selected, the play screen SHALL offer both **通常モード** (standard 10-question quiz) and **タイムアタック（鬼退治）** under the subtraction tab. Time attack under subtraction SHALL follow the same member-only and guest-locked rules as addition time attack. The level selection list SHALL be hidden until the player taps **通常モード（10問チャレンジ）**; tapping the same button again SHALL hide the level list.

When **足し算** is selected, mode selection behavior SHALL remain unchanged.

#### Scenario: Subtraction mode selection includes time attack
- **WHEN** a player selects 引き算 on the play screen
- **THEN** both 通常モード and タイムアタック（鬼退治） are available (member) or visible locked (guest)

#### Scenario: Subtraction time attack resume on play screen
- **WHEN** a logged-in player has an in-progress subtraction time attack session and selects 引き算
- **THEN** 続きから is shown for the subtraction time attack before starting a new run

#### Scenario: Addition mode selection unchanged
- **WHEN** a player selects 足し算
- **THEN** 通常モード and タイムアタック behave as before
