## ADDED Requirements

### Requirement: Recent session history

The system SHALL display the 5 most recent sessions for the selected player, showing date, level, correct count, accuracy, stars, and total score.

#### Scenario: View recent history
- **WHEN** a player opens the progress dashboard
- **THEN** the 5 most recent sessions are listed in reverse chronological order

### Requirement: Weekly average accuracy

The system SHALL calculate and display the average accuracy of all sessions played by the selected player in the current calendar week (Monday–Sunday).

#### Scenario: Weekly average
- **WHEN** a player has sessions this week
- **THEN** the dashboard shows the weekly average accuracy as a percentage

#### Scenario: No sessions this week
- **WHEN** a player has no sessions this week
- **THEN** the dashboard shows "今週はまだプレイしていません"

### Requirement: Learning streak

The system SHALL track consecutive calendar days on which the player completed at least one session.

#### Scenario: Streak increment
- **WHEN** a player completes a session today and also played yesterday
- **THEN** the streak count increases by 1

#### Scenario: Streak reset
- **WHEN** a player completes a session today but did not play yesterday (and is not on their first day)
- **THEN** the streak count resets to 1

### Requirement: Level progress summary

The system SHALL display the player's current unlocked level and the number of ★★+ sessions at the current level toward the next unlock.

#### Scenario: Progress toward next level
- **WHEN** a player is at level 1 with 2 ★★+ sessions
- **THEN** the dashboard shows "次のレベルまで あと 1 回 ★★ 以上"

### Requirement: Frequently missed combinations

The system SHALL identify and display up to 3 operand pairs that the player has answered incorrectly most often.

#### Scenario: Show weak spots
- **WHEN** a player has at least 3 incorrect question logs
- **THEN** the dashboard shows up to 3 frequently missed combinations (e.g., "7 + 8")

#### Scenario: No incorrect answers yet
- **WHEN** a player has no incorrect question logs
- **THEN** the weak spots section is hidden
