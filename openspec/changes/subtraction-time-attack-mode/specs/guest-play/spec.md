## MODIFIED Requirements

### Requirement: Guest time attack visibility

Guests SHALL see the same time attack controls as members under both **足し算** and **引き算** tabs: **続きから** and **タイムアタック（鬼退治）**. Guests MAY start a new time attack; **続きから** SHALL remain disabled with a padlock indicator (🔒).

#### Scenario: Guest starts subtraction time attack
- **WHEN** a guest selects 引き算 and then タイムアタック（鬼退治）
- **THEN** a new subtraction time attack session starts at level 1
- **AND** results are saved to localStorage

#### Scenario: Guest resume disabled for subtraction
- **WHEN** a guest selects 引き算 on the play screen
- **THEN** **続きから** is visible but disabled with a padlock indicator
- **AND** if a resumable subtraction time attack exists, the label includes the boss reached
- **AND** a message below the buttons reads **続きはユーザ登録後に選択できます**

#### Scenario: Guest can open subtraction time attack route
- **WHEN** a guest opens `/play/time-attack?operation=subtraction&new=1`
- **THEN** a new subtraction time attack session starts
