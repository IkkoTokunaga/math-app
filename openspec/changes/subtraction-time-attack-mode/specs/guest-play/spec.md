## MODIFIED Requirements

### Requirement: Guest time attack visibility

Guests SHALL see **タイムアタック（鬼退治）** under both **足し算** and **引き算** tabs. Both entries SHALL be locked with a message that login is required.

#### Scenario: Guest sees locked subtraction time attack
- **WHEN** a guest selects 引き算 on the play screen
- **THEN** タイムアタック is visible but not selectable
- **AND** a brief login-required message is shown

#### Scenario: Guest cannot play subtraction time attack
- **WHEN** a guest attempts to open `/play/time-attack?operation=subtraction`
- **THEN** the system redirects or blocks play and directs the user to log in
