## ADDED Requirements

### Requirement: Operation tabs on progress dashboard

The progress dashboard SHALL allow switching between **足し算** and **引き算** views using the same blackboard-style operation tabs as the play screen. Each view SHALL show statistics computed only from sessions with the matching `operation` inside the active tab panel. The page header SHALL show the mascot and **これまでの記録** title. A **れんしゅうへ** link back to the play screen SHALL appear above the tabs as simple left-aligned underlined text without a bordered frame.

#### Scenario: View subtraction progress
- **WHEN** a player opens the progress dashboard and selects 引き算
- **THEN** recent history, weekly average, streak, level progress, and weak spots reflect subtraction sessions only

#### Scenario: Default addition progress
- **WHEN** a player opens the progress dashboard without selecting an operation
- **THEN** the 足し算 view is shown by default

## MODIFIED Requirements

### Requirement: Recent session history

The system SHALL display the 5 most recent sessions for the selected player **and selected operation**, showing date, level, correct count, accuracy, stars, and total score.

#### Scenario: View recent subtraction history
- **WHEN** a player opens the progress dashboard with 引き算 selected
- **THEN** the 5 most recent subtraction sessions are listed in reverse chronological order

#### Scenario: View recent addition history
- **WHEN** a player opens the progress dashboard with 足し算 selected
- **THEN** the 5 most recent addition sessions are listed in reverse chronological order

### Requirement: Weekly average accuracy

The system SHALL calculate and display the average accuracy of all sessions played by the selected player in the current calendar week (Monday–Sunday) **for the selected operation**.

#### Scenario: Weekly average for subtraction
- **WHEN** a player has subtraction sessions this week and 引き算 is selected
- **THEN** the dashboard shows the weekly average accuracy for subtraction only

#### Scenario: No sessions this week
- **WHEN** a player has no sessions this week for the selected operation
- **THEN** the dashboard shows "今週はまだプレイしていません"

### Requirement: Learning streak

The system SHALL track consecutive calendar days on which the player completed at least one session **of any operation**. Completing either an addition or subtraction session on a day counts toward the same streak.

#### Scenario: Streak increment with subtraction
- **WHEN** a player completes a subtraction session today and also played yesterday
- **THEN** the streak count increases by 1

### Requirement: Level progress summary

The system SHALL display the player's current unlocked level and progress toward the next unlock **for the selected operation**. Progress SHALL show instant unlock (★★★★★) and accumulated unlock (★★★★ count).

#### Scenario: Subtraction progress toward next level
- **WHEN** a player is at subtraction level 1 with 2 ★★★★ sessions and no perfect session
- **THEN** the dashboard shows remaining ★★★★ sessions needed for subtraction level 2

#### Scenario: Addition progress independent
- **WHEN** a player has unlocked addition level 5 but subtraction level 1
- **AND** 引き算 is selected
- **THEN** the dashboard shows subtraction level 1 progress only

### Requirement: Frequently missed combinations

The system SHALL identify and display up to 3 operand combinations that the player has answered incorrectly most often **for the selected operation**. Subtraction combinations SHALL be displayed as ordered pairs or triples with `-` (e.g. `13 - 7`, `45 - 12 - 8`).

#### Scenario: Show subtraction weak spots
- **WHEN** a player has at least 3 incorrect subtraction question logs
- **AND** 引き算 is selected
- **THEN** the dashboard shows up to 3 frequently missed subtraction combinations

#### Scenario: No incorrect answers yet
- **WHEN** a player has no incorrect question logs for the selected operation
- **THEN** the weak spots section is hidden
