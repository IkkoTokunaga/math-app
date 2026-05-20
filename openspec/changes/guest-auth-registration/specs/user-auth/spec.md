# user-auth

Email/パスワードによる任意ログイン、会員登録時のゲストデータ移行、セッション維持。

## Requirements

### Requirement: Home login and signup buttons

The home page SHALL show **ログイン** and **サインアップ** buttons when the user is not logged in. When logged in, both buttons SHALL be hidden.

#### Scenario: Guest home
- **WHEN** a guest opens the home page
- **THEN** the system shows ログイン and サインアップ buttons in addition to guest name input / practice start

#### Scenario: Logged-in home
- **WHEN** a logged-in user opens the home page
- **THEN** ログイン and サインアップ buttons are not shown

#### Scenario: Guest ignores auth
- **WHEN** a guest taps practice without logging in or signing up
- **THEN** the system starts guest play with no authentication step

### Requirement: One account one child

Each user account SHALL map to exactly one player profile (one child). Registration SHALL create both `users` and `players` records and link them 1:1.

#### Scenario: Register from result footer link
- **WHEN** a guest opens the de-emphasized registration link on the result screen and submits email and password
- **THEN** the system creates a user, creates a player with the guest display name, imports all localStorage session data into PostgreSQL, issues a login session, and clears guest localStorage

#### Scenario: Sign up from home
- **WHEN** a guest completes sign up from the home サインアップ button
- **THEN** the system creates a user and player; if localStorage guest data exists, it is imported the same way as result-screen registration

#### Scenario: Duplicate email
- **WHEN** registration uses an email that already exists
- **THEN** the system shows an error and does not import data until resolved (login instead)

### Requirement: De-emphasized register link on result screen

For guests only, the result screen SHALL offer an optional, parent-oriented registration entry at the **bottom** of the page. It SHALL NOT block or replace the main child-facing actions (play again, view progress).

#### Scenario: Guest result screen layout
- **WHEN** a guest views a completed session result and is not logged in
- **THEN** the system shows prominent play-again and progress actions first, and a small footer-style link equivalent to 「きろくを とうろくする（おうちのひとと）」 below them

#### Scenario: Guest skips registration
- **WHEN** a guest leaves the result screen without tapping the registration link
- **THEN** localStorage guest data remains; no registration is required

#### Scenario: Logged-in result screen
- **WHEN** a logged-in user views a result
- **THEN** the registration link is not shown; existing actions (play again, view progress) remain

### Requirement: Persistent login session

The system SHALL keep users logged in across visits using an HTTP-only session cookie with a long-lived expiry (e.g. 30 days) so that login UI is rarely needed.

#### Scenario: Return visit while logged in
- **WHEN** a user returns with a valid session cookie
- **THEN** the home page shows the child's name as stored (no honorific suffix such as ちゃん) and offers practice without showing a login form

#### Scenario: Expired session
- **WHEN** the session cookie is missing or expired
- **THEN** the user is treated as a guest (name from localStorage if any) and the home page shows ログイン / サインアップ again

### Requirement: Logged-in display name

When logged in, the system SHALL show the child's name from the linked player record on home and during play where appropriate.

#### Scenario: Authenticated home
- **WHEN** a logged-in user opens the home page
- **THEN** the child's name is displayed plainly (no ちゃん or similar suffix) and no guest name input is required

### Requirement: Authenticated server persistence

Logged-in play SHALL use existing Server Actions and PostgreSQL for sessions and question logs.

#### Scenario: Member starts session
- **WHEN** a logged-in user starts a level
- **THEN** `startSessionAction` persists to the database using the linked `playerId`

### Requirement: Login with email and password

The system SHALL allow login with email and password and issue the same persistent session cookie.

#### Scenario: Successful login
- **WHEN** valid credentials are submitted
- **THEN** the user is logged in, child name is available, and subsequent play uses database persistence

### Requirement: Logout

The system SHALL provide logout that clears the auth cookie. Logout SHALL be visually de-emphasized (e.g. footer link) compared to practice actions.

#### Scenario: Logout
- **WHEN** the user logs out
- **THEN** the auth cookie is cleared and the user continues as a guest with localStorage data if any remains
