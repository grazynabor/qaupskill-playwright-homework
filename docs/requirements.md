# QA Upskill Functional Documentation

This document describes the functional behavior of the application from the user perspective.

## Application Purpose

`QA Upskill` is a training workspace for QA and admin practice.

The application supports:

- login with JWT bearer-token authentication
- user and role management
- person profile management
- sticky note management
- assignment overview
- sticky note statistics
- archive of completed sticky notes

## Roles

The application supports 3 roles:

- `User`
- `Admin`
- `Configurator`

## Role Permissions

General visibility rule:

- if a user does not have access to a tab, that tab is not shown in the navigation
- users only see tabs available for their current role

### User

A user can:

- log in
- open the `Sticky Notes` tab
- open the `Note Assignments` tab
- open the `Statistics` tab
- create sticky notes
- assign a person to a sticky note
- view open sticky notes
- view note assignments
- view statistics
- mark any sticky note as done (the UI allows all authenticated users to mark notes done; the API enforces creator-only)
- delete a sticky note only if the user created that note

A user cannot:

- create users
- change user roles
- open the `Users` tab
- open the `Create User` tab
- open the `Person` tab
- open the `Archive` tab
- edit person details unless promoted to `Configurator` or `Admin`

### Admin

An admin can:

- do everything a `User` can do
- open the `Users` tab
- open the `Create User` tab
- open the `Person` tab
- open the `Archive` tab
- create new users
- delete users
- assign roles to users
- view all users
- edit person details
- mark any sticky note as done
- delete any sticky note

### Configurator

A configurator can:

- do everything a `User` can do
- open the `Person` tab
- open the `Archive` tab
- edit person details
- mark any sticky note as done
- delete any sticky note

A configurator cannot:

- create users
- change user roles
- open the `Users` tab
- open the `Create User` tab

## Default Landing Tabs

After login, the first tab shown depends on the user role (the first available tab in the navigation order):

- `Admin` -> `Users`
- `Configurator` -> `Person`
- `User` -> `Note Assignments`

## Tabs and Features

### Users

Visible only to:

- `Admin`

Purpose:

- view existing users
- review their name, email, and current role
- change the role of an existing user
- delete an existing user

Supported roles:

- `User`
- `Admin`
- `Configurator`

Delete behavior:

- only `Admin` can delete users
- an admin cannot delete the currently authenticated account
- clicking `Delete User` opens a confirmation modal
- the modal displays the user's name, email, and a summary of the side effects
- the admin must confirm by clicking `Delete User` inside the modal
- the modal can be dismissed with `Cancel`, `Close`, or by clicking the backdrop
- if the delete fails, an error message is shown inside the modal
- on success, the modal closes and the user is removed from the list
- sticky notes created by the deleted user are removed
- sticky notes assigned to the deleted user become unassigned
- the deleted user is removed from the `Person` tab and note assignment views

### Create User

Visible only to:

- `Admin`

Purpose:

- create a new person who can log in to the application

Required fields:

- full name (minimum 2 characters, maximum 120 characters)
- email
- password (minimum 8 characters, maximum 100 characters, cannot be only whitespace)
- role

Result:

- a new login-enabled user is created
- after creation, the admin is redirected to the `Users` tab
- the user can later appear in sticky note assignment and person management flows

### Person

Visible to:

- `Admin`
- `Configurator`

Purpose:

- view and update extended person data

Editable fields:

- address line 1
- address line 2
- city
- postal code
- country
- phone
- notes

Behavior:

- person data is edited in a modal popup labeled "Update Address"
- the modal opens when clicking the `Edit Address` button on a person card
- saving updates the selected person record
- the modal can be dismissed with `Cancel`, `Close`, or by clicking the backdrop

### Sticky Notes

Visible to:

- `User`
- `Admin`
- `Configurator`

Purpose:

- create and manage active sticky notes

Sticky note fields:

- title (minimum 2 non-whitespace characters, maximum 80 characters)
- content (minimum 2 non-whitespace characters, maximum 600 characters)
- color (one of 5 preset dark colors: `#19352a`, `#26482d`, `#3b5c29`, `4d5b1f`, `#3f2a4c`)
- assigned person (optional; any existing user)

Behavior:

- all authenticated users can create sticky notes
- sticky notes can be assigned to any existing user
- only open sticky notes are shown in this tab
- when a note is marked as done, it leaves this tab and moves to `Archive`
- the active board supports up to `10` open sticky notes
- the open note count is tracked server-side (only non-done notes count toward the limit)
- completed notes do not count toward the `10` open-note limit
- the header shows the current count of open notes vs. the limit (e.g. `3/10`)
- creating a note redirects the user to the `Sticky Notes` tab

Management permissions:

- any authenticated user can mark any note as done (UI behavior)
- API enforces: only the note creator, `Admin`, or `Configurator` can mark a note done or delete it
- creator of the note can delete it
- `Admin` can mark any note done
- `Admin` can delete any note
- `Configurator` can mark any note done
- `Configurator` can delete any note

### Archive

Visible to:

- `Admin`
- `Configurator`

A `User` cannot access the Archive tab.

Purpose:

- view completed sticky notes

Behavior:

- only done notes appear here
- done notes are removed from the active sticky notes board
- delete permissions are the same as for active notes (creator, Admin, or Configurator)
- the header shows the count of archived notes

### Note Assignments

Visible to:

- `User`
- `Admin`
- `Configurator`

Purpose:

- show how many open sticky notes are assigned to each person

Behavior:

- only people with more than `0` assigned open notes are shown
- unassigned notes are not shown in this view
- counts are based on open notes only
- assignment rows are sorted by note count (descending), then alphabetically by name
- the header counter shows the total number of active sticky notes

### Statistics

Visible to:

- `User`
- `Admin`
- `Configurator`

Purpose:

- show progress of sticky note work in the workspace

Displayed values:

- total sticky notes
- done sticky notes
- open sticky notes
- completion rate

Behavior:

- statistics exclude notes created by users with the `Configurator` role
- total includes all qualifying notes (excluding Configurator-created notes)
- done includes archived qualifying notes
- open includes active qualifying notes
- completion rate is calculated as: `done / total * 100`, rounded to the nearest integer
- the header counter shows done vs. total qualifying notes (e.g. `2/5`)

## Authentication Flow

Functional behavior:

- the user logs in with email and password
- email is normalized to lowercase before authentication
- after successful login, the application stores a JWT bearer token in `localStorage`
- the token is used for all authenticated API requests
- the token expires after 8 hours
- the session is restored after page reload if a valid token is still stored (verified against `/auth/me`)
- if the stored token is invalid or expired, it is removed from storage automatically
- the user can log out; logout invalidates the token server-side and clears the local session
- the login form is prefilled with default bootstrap admin credentials on first local access

## Bootstrap Admin

On first startup, if no user with the admin email exists, the server creates a default admin account:

- email: `admin@qaupskill.local` (configurable via `QA_UPSKILL_ADMIN_EMAIL` env var)
- password: `Admin123!` (configurable via `QA_UPSKILL_ADMIN_PASSWORD` env var)

## Data Refresh Behavior

The application refreshes data when the user changes tabs.

Functional result:

- users see current data after moving between workspace sections
- sticky notes, assignments, archive, and statistics stay aligned with recent changes
- each tab with mutable data also has a manual `Refresh` button

## API Endpoints

The backend exposes the following REST endpoints:

| Method   | Path                     | Auth Required | Role Required          | Description                          |
|----------|--------------------------|---------------|------------------------|--------------------------------------|
| `GET`    | `/health`                | No            | —                      | Health check                         |
| `POST`   | `/auth/login`            | No            | —                      | Log in; returns JWT token and user   |
| `POST`   | `/auth/logout`           | Yes           | —                      | Invalidate the current token         |
| `GET`    | `/auth/me`               | Yes           | —                      | Return the authenticated user        |
| `GET`    | `/people-directory`      | Yes           | —                      | List all users (for note assignment) |
| `GET`    | `/people`                | Yes           | Admin                  | List all users (management view)     |
| `POST`   | `/people`                | Yes           | Admin                  | Create a new user                    |
| `PATCH`  | `/people/:id/role`       | Yes           | Admin                  | Update a user's role                 |
| `DELETE` | `/people/:id`            | Yes           | Admin                  | Delete a user                        |
| `GET`    | `/person-records`        | Yes           | Admin or Configurator  | List users with extended profile data|
| `PUT`    | `/person-records/:id`    | Yes           | Admin or Configurator  | Update a user's profile details      |
| `GET`    | `/notes`                 | Yes           | —                      | List all sticky notes                |
| `POST`   | `/notes`                 | Yes           | —                      | Create a sticky note                 |
| `DELETE` | `/notes/:id`             | Yes           | Creator/Admin/Config   | Delete a sticky note                 |
| `PATCH`  | `/notes/:id/done`        | Yes           | Creator/Admin/Config   | Update sticky note done status       |
| `GET`    | `/docs.json`             | No            | —                      | OpenAPI spec (JSON)                  |
| `GET`    | `/docs`                  | No            | —                      | Swagger UI                           |

## API Documentation

The application provides Swagger documentation for the REST API.

Functional purpose:

- allow users and testers to inspect and test API endpoints
- support QA training on authenticated REST operations
- accessible at `/docs` on the API server (default: `http://localhost:4000/docs`)
