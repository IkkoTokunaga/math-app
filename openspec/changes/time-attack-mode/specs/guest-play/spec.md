## ADDED Requirements

### Requirement: Time attack locked for guests

Guests SHALL NOT play time attack. The play screen SHALL still **display** the time attack entry with a locked/disabled state and a short message that login is required.

#### Scenario: Guest cannot start time attack
- **WHEN** a guest attempts to start time attack
- **THEN** the action is blocked
- **AND** no localStorage time attack session is created

#### Scenario: Guest standard play unaffected
- **WHEN** a guest plays standard mode
- **THEN** existing guest-play rules apply unchanged
