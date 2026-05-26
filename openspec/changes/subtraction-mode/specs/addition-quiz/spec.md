## ADDED Requirements

### Requirement: Operation selection on play screen

The play screen SHALL allow choosing between **足し算** (addition) and **引き算** (subtraction) before level or mode selection. The selected operation SHALL persist while the player remains on the play screen. Operation selection SHALL be presented as **tabs** with a blackboard-style frame: two tab labels (**足し算** / **引き算**) above a shared panel that shows the mode and level controls for the selected operation. The active tab SHALL share the same background as the panel below with no dividing line between them; inactive tabs SHALL appear recessed with a bottom border separating them from the panel. The **これまでの記録** link to the progress dashboard SHALL appear above the operation tabs, showing the player name centered and the link as simple left-aligned underlined text without a bordered frame.

#### Scenario: Operation tabs visible on play screen
- **WHEN** a player opens the play screen
- **THEN** 足し算 and 引き算 are shown as tabs with a blackboard-style bordered panel below
- **AND** the active tab's mode selection content is shown inside the panel

#### Scenario: Select subtraction
- **WHEN** a player selects 引き算 on the play screen
- **THEN** the subtraction mode selection UI is shown
- **AND** the level list is hidden until **通常モード（10問チャレンジ）** is tapped

#### Scenario: Select addition
- **WHEN** a player selects 足し算 on the play screen
- **THEN** the existing addition mode selection (通常 / タイムアタック) is shown
- **AND** the level list is hidden until **通常モード（10問チャレンジ）** is tapped

#### Scenario: Switch operation from level select
- **WHEN** a player switches from 足し算 to 引き算 on the play screen
- **THEN** the subtraction mode selection replaces the addition UI without starting a session
- **AND** the level list is hidden

## MODIFIED Requirements

### Requirement: Play mode selection

The play screen SHALL allow choosing between **通常モード** (standard 10-question quiz) and **タイムアタック** (time attack) **when 足し算 is selected**. When **引き算** is selected, only the standard 10-question subtraction quiz SHALL be available. The level selection list SHALL be hidden until the player taps **通常モード（10問チャレンジ）**; tapping the same button again SHALL hide the level list.

#### Scenario: Standard addition mode unchanged
- **WHEN** a player selects 足し算 and then taps **通常モード（10問チャレンジ）**
- **THEN** the level selection list is shown
- **AND** the existing standard addition quiz flow runs with 10-question sessions

#### Scenario: Subtraction has no time attack
- **WHEN** a player selects 引き算
- **THEN** only standard subtraction level selection and quiz are available
- **AND** time attack is not offered

#### Scenario: Time attack selection under addition
- **WHEN** a logged-in player selects 足し算 and then タイムアタック
- **THEN** the system navigates to the addition time attack flow
