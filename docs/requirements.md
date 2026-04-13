# QA Upskill Functional Documentation

This document describes the functional behavior of the application from the user perspective.

## Application Purpose

`QA Upskill` is a training workspace for QA and admin practice.

The application supports:

- login with bearer-token authentication
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
- create sticky notes
- assign a person to a sticky note
- view open sticky notes
- view archived sticky notes
- view note assignments
- view statistics
- mark a sticky note as done only if the user created that note
- delete a sticky note only if the user created that note

A user cannot:

- create users
- change user roles
- open the `Users` tab
- open the `Create User` tab
- open the `Person` tab
- edit person details unless promoted to `Configurator` or `Admin`

### Admin

An admin can:

- do everything a `User` can do
- open the `Users` tab
- open the `Create User` tab
- open the `Person` tab
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
- edit person details
- mark any sticky note as done
- delete any sticky note

A configurator cannot:

- create users
- change user roles
- open the `Users` tab
- open the `Create User` tab

## Default Landing Tabs

After login, the first tab depends on the user role:

- `Admin` -> `Users`
- `Configurator` -> `Person`
- `User` -> `Sticky Notes`

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

- full name
- email
- password
- role

Result:

- a new login-enabled user is created
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

- person data is edited in a modal popup
- saving updates the selected person record

### Sticky Notes

Visible to:

- `User`
- `Admin`
- `Configurator`

Purpose:

- create and manage active sticky notes

Sticky note fields:

- title
- content
- color
- assigned person

Behavior:

- all authenticated users can create sticky notes
- sticky notes can be assigned to any existing user
- only open sticky notes are shown in this tab
- when a note is marked as done, it leaves this tab and moves to `Archive`
- the active board supports up to `10` open sticky notes
- completed notes do not count toward the `10` open-note limit

Management permissions:

- creator of the note can mark it done
- creator of the note can delete it
- `Admin` can mark any note done
- `Admin` can delete any note
- `Configurator` can mark any note done
- `Configurator` can delete any note

### Archive

Visible to:

- `User`
- `Admin`
- `Configurator`

Purpose:

- view completed sticky notes

Behavior:

- only done notes appear here
- done notes are removed from the active sticky notes board
- delete permissions are the same as for active notes

### Note Assignments

Visible to:

- `User`
- `Admin`
- `Configurator`

Purpose:

- show how many open sticky notes are assigned to each person

Behavior:

- only people with more than `0` assigned notes are shown
- unassigned notes are not shown in this view
- counts are based on open notes only

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

- total includes all notes
- done includes archived notes
- open includes active notes
- completion rate is based on done notes compared with total notes

## Authentication Flow

Functional behavior:

- the user logs in with email and password
- after successful login, the application stores a bearer token
- the token is used for authenticated actions
- the session is restored after page reload if a valid token is still stored
- the user can log out and clear the session

## Data Refresh Behavior

The application refreshes data when the user changes tabs.

Functional result:

- users see current data after moving between workspace sections
- sticky notes, assignments, archive, and statistics stay aligned with recent changes

## API Documentation

The application provides Swagger documentation for the REST API.

Functional purpose:

- allow users and testers to inspect and test API endpoints
- support QA training on authenticated REST operations
