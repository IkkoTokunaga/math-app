## MODIFIED Requirements

### Requirement: Time attack locked for guests

Guests SHALL be able to play time attack. Completed guest time attack sessions SHALL be stored in localStorage. The play screen SHALL show the same time attack controls for guests and members: **続きから** and **タイムアタック（鬼退治）** (or **タイムアタックを新しく始める** when resume is active). **続きから** SHALL be available only to logged-in members with an in-progress session; for guests it SHALL remain visible but **disabled** with a **padlock** indicator (🔒).

#### Scenario: Guest starts time attack
- **WHEN** a guest selects タイムアタック（鬼退治）
- **THEN** a new time attack session starts at level 1
- **AND** progress is saved to localStorage on each answer

#### Scenario: Guest resume disabled
- **WHEN** a guest views the play screen
- **THEN** **続きから** is shown but disabled with a padlock indicator
- **AND** if the guest has a resumable in-progress time attack for the selected operation, the label shows the boss reached (e.g. **続きから（おに Lv3）**) matching the member layout
- **AND** **タイムアタック（鬼退治）** is available to start a new run
- **AND** a message below the buttons reads **続きはユーザ登録後に選択できます**

#### Scenario: Member resume unchanged
- **WHEN** a logged-in player has an in-progress time attack session
- **THEN** **続きから** is enabled and resumes that session

#### Scenario: Guest time attack migrates on signup
- **WHEN** a guest with localStorage time attack data completes sign up
- **THEN** completed time attack sessions are imported to the member account
- **AND** a resumable in-progress time attack session is imported so **続きから** works after login

#### Scenario: Guest standard play unaffected
- **WHEN** a guest plays standard mode
- **THEN** existing guest-play rules apply unchanged
