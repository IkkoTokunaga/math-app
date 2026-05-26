## ADDED Requirements

### Requirement: Play mode selection

The play screen SHALL allow choosing between **通常モード** (standard 10-question quiz) and **タイムアタック** (time attack). Standard mode behavior SHALL remain unchanged. The level selection list SHALL be hidden until the player taps **通常モード（10問チャレンジ）**; tapping the same button again SHALL hide the level list.

#### Scenario: Standard mode unchanged
- **WHEN** a player taps **通常モード（10問チャレンジ）**
- **THEN** the level selection list is shown
- **AND** the existing standard quiz flow runs with 10-question sessions

#### Scenario: Time attack selection
- **WHEN** a logged-in player selects タイムアタック
- **THEN** the system navigates to the time attack flow (no standard level select; always starts at level 1)

### Requirement: Time attack route

The system SHALL provide a dedicated route or view for time attack (e.g. `/play/time-attack`) separate from the standard quiz view.

#### Scenario: Navigate to time attack
- **WHEN** a logged-in player confirms time attack from the play screen
- **THEN** the time attack client view is shown
