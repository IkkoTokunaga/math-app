## ADDED Requirements

### Requirement: Recent session history

The system SHALL display the 5 most recent sessions for the selected player, in reverse chronological order. The list SHALL include both standard (10-question) sessions and time attack sessions. Standard sessions show date, level, correct count, accuracy, stars, and total score. Time attack sessions show date, total score, outcome, boss reached, and bosses defeated without stars. The dashboard SHALL also show time attack **過去最高得点** for logged-in players.

#### Scenario: View recent history
- **WHEN** a player opens the progress dashboard
- **THEN** the 5 most recent sessions (standard and time attack) are listed in reverse chronological order

#### Scenario: Time attack entry in recent history
- **WHEN** a player has completed a time attack session
- **THEN** the recent history shows a **タイムアタック** row with score and boss progress

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

The system SHALL display the player's current unlocked level and progress toward the next unlock. Progress SHALL show:

1. **Instant unlock**: ★★★★★ (満点) ですぐ解放
2. **Accumulated unlock**: ★★★★ を N 回（current/required count）

Unlock requires either one perfect session or 3 sessions with ★★★★ at the current level.

#### Scenario: Progress toward next level
- **WHEN** a player is at level 1 with 2 ★★★★ sessions and no perfect session
- **THEN** the dashboard shows remaining ★★★★ sessions needed (e.g. あと 1 回 2/3)

#### Scenario: Perfect session achieved
- **WHEN** a player has completed a perfect session at the current level
- **THEN** the dashboard indicates that the next level can be unlocked (e.g. 満点を とれたよ！)

### Requirement: Frequently missed combinations

The system SHALL identify and display up to 3 operand pairs that the player has answered incorrectly most often.

#### Scenario: Show weak spots
- **WHEN** a player has at least 3 incorrect question logs
- **THEN** the dashboard shows up to 3 frequently missed combinations (e.g., "7 + 8")

#### Scenario: No incorrect answers yet
- **WHEN** a player has no incorrect question logs
- **THEN** the weak spots section is hidden

### Requirement: Progress dashboard BGM

The progress dashboard SHALL play the same looping home background music as `/play` using `/sounds/bgm/uchuyuei.mp3`, respecting the player's sound on/off preference.

#### Scenario: Progress BGM plays
- **WHEN** a player opens the progress dashboard with sound enabled
- **THEN** the home background music plays
