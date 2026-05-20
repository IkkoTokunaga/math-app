# guest-play

ゲスト（未ログイン）プレイヤー向けの名前入力と localStorage 上のセッション管理。

## Requirements

### Requirement: Guest display name

The system SHALL require a display name before starting the first guest session. The name SHALL be stored in localStorage only until the user registers.

#### Scenario: Start without name
- **WHEN** a guest opens the home page without a stored display name
- **THEN** the system shows a name input and does not allow starting practice until a name is entered

#### Scenario: Start with stored name
- **WHEN** a guest has a display name in localStorage
- **THEN** the home page shows the name and allows starting practice without re-entering it

### Requirement: Guest session storage

The system SHALL store in-progress and completed quiz sessions in localStorage. The system SHALL NOT write guest session data to PostgreSQL.

#### Scenario: Guest completes a session
- **WHEN** a guest finishes 10 questions
- **THEN** the completed session and per-question logs are appended to localStorage and no server persistence occurs

#### Scenario: Guest closes browser mid-session
- **WHEN** a guest returns with the same browser and localStorage intact
- **THEN** in-progress session MAY be resumed if stored; otherwise the guest starts a new session

### Requirement: Guest quiz rules parity

Guest sessions SHALL use the same question generation, scoring, level unlock, and retry rules as authenticated play (existing addition-quiz and score-tracking logic).

#### Scenario: Guest level unlock
- **WHEN** a guest achieves a perfect session or 3 × ★★★★ at a level in localStorage
- **THEN** the next level becomes selectable using the same unlock rules as authenticated players

### Requirement: Guest progress view

The progress dashboard SHALL aggregate statistics from localStorage completed sessions when the user is not logged in.

#### Scenario: Guest opens progress
- **WHEN** a guest opens `/progress` with stored completed sessions
- **THEN** recent sessions, weekly accuracy, streak, and weak pairs are computed from localStorage data

#### Scenario: Guest with no history
- **WHEN** a guest opens `/progress` with no completed sessions
- **THEN** the system shows an empty state encouraging practice
