## ADDED Requirements

### Requirement: Operation selection on play screen

The play screen SHALL allow choosing between **足し算** (addition) and **引き算** (subtraction) before level or mode selection. The selected operation SHALL persist while the player remains on the play screen.

#### Scenario: Select subtraction
- **WHEN** a player selects 引き算 on the play screen
- **THEN** the subtraction level selection UI is shown
- **AND** time attack entry is not shown

#### Scenario: Select addition
- **WHEN** a player selects 足し算 on the play screen
- **THEN** the existing addition mode selection (通常 / タイムアタック) is shown

#### Scenario: Switch operation from level select
- **WHEN** a player switches from 足し算 to 引き算 on the play screen
- **THEN** the subtraction level selection replaces the addition UI without starting a session

## MODIFIED Requirements

### Requirement: Play mode selection

The play screen SHALL allow choosing between **通常モード** (standard 10-question quiz) and **タイムアタック** (time attack) **when 足し算 is selected**. When **引き算** is selected, only the standard 10-question subtraction quiz SHALL be available.

#### Scenario: Standard addition mode unchanged
- **WHEN** a player selects 足し算 and then 通常モード
- **THEN** the existing standard addition quiz flow runs with level selection and 10-question sessions

#### Scenario: Subtraction has no time attack
- **WHEN** a player selects 引き算
- **THEN** only standard subtraction level selection and quiz are available
- **AND** time attack is not offered

#### Scenario: Time attack selection under addition
- **WHEN** a logged-in player selects 足し算 and then タイムアタック
- **THEN** the system navigates to the addition time attack flow
