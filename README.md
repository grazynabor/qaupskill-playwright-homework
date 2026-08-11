# QA Upskill

[![Playwright Tests](https://github.com/grazynabor/qaupskill-playwright-homework/actions/workflows/playwright.yml/badge.svg?branch=main)](https://github.com/grazynabor/qaupskill-playwright-homework/actions/workflows/playwright.yml)

This repository contains the QA Upskill training application and Playwright end-to-end automation written in TypeScript. The test suite uses API-assisted test setup and cleanup, reusable authentication state, desktop and mobile browser projects, and GitHub Actions CI with HTML report artifacts.

## Application Under Test

The application is an npm workspaces monorepo:

- `apps/web` - Astro + React frontend
- `apps/api` - Express + SQLite REST API with Swagger documentation

SQLite is embedded, so no separate database server is required.

| Service | Local URL |
|---|---|
| Frontend | `http://localhost:4321` |
| API | `http://localhost:4000` |
| API health | `http://localhost:4000/health` |
| Swagger UI | `http://localhost:4000/docs` |
| OpenAPI JSON | `http://localhost:4000/docs.json` |

## Test Automation Highlights

- Playwright with TypeScript and an HTML reporter
- `LoginPage` Page Object Model with a custom `loginPage` fixture
- API-based dynamic test-user creation and cleanup around a UI login flow
- `@smoke` test tagging
- `desktop-chrome` and `mobile-chrome` projects, with Pixel 5 device settings for mobile
- A setup authentication project implemented in `auth.setup.ts`
- Saved `storageState` reuse, verified by `authenticated.spec.ts`
- An explicitly unauthenticated `login.spec.ts`
- UUID-based test-user uniqueness using `crypto.randomUUID()` for parallel isolation

## Project Structure

```text
.
|-- apps/
|   |-- api/
|   `-- web/
|-- fixtures/
|   `-- index.ts
|-- pages/
|   `-- LoginPage.ts
|-- tests/
|   |-- auth.setup.ts
|   |-- authenticated.spec.ts
|   `-- login.spec.ts
|-- skills/
|   `-- playwright-reviewer/
|-- .github/
|   `-- workflows/
|       `-- playwright.yml
|-- docs/
|   `-- requirements.md
|-- playwright.config.ts
`-- tsconfig.playwright.json
```

## Getting Started

### Prerequisites

- Node.js 24 recommended; this is the version used by CI
- npm
- Chromium installed through Playwright

The repository does not currently enforce a Node.js version through `engines`, `.nvmrc`, or an equivalent file.

### Install Dependencies

For a fresh clone, install the locked dependency versions:

```bash
npm ci
```

Install Chromium:

```bash
npx playwright install chromium
```

On Linux systems that also require browser system dependencies, use:

```bash
npx playwright install --with-deps chromium
```

## Environment Configuration

The default localhost and demo setup works with checked-in fallback values. A root `.env` is optional for Playwright overrides; `playwright.config.ts` explicitly loads it through `dotenv`. The application processes read their own runtime environment and fallback values, so a root `.env` should not be treated as configuring every application process automatically.

Playwright variables:

- `BASE_URL`
- `API_BASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Application variables:

- `PORT`
- `CLIENT_ORIGIN`
- `JWT_SECRET`
- `QA_UPSKILL_ADMIN_EMAIL`
- `QA_UPSKILL_ADMIN_PASSWORD`
- `PUBLIC_API_URL`

The bootstrap credentials are intentionally public local/demo credentials, not real secrets:

- Email: `admin@qaupskill.local`
- Password: `Admin123!`

If the application's bootstrap credentials are overridden, Playwright's `ADMIN_EMAIL` and `ADMIN_PASSWORD` must match them. Use `.env.example` as a reference and do not commit `.env`.

## Run the Application Locally

```bash
npm run dev
```

This starts both the API and frontend. Keep this terminal running while executing Playwright tests from a second terminal.

## Running Playwright Tests

| Purpose | Command |
|---|---|
| Full suite | `npx playwright test` |
| Smoke tests | `npx playwright test --grep "@smoke"` |
| Desktop | `npx playwright test --project=desktop-chrome` |
| Mobile | `npx playwright test --project=mobile-chrome` |
| Playwright TypeScript check | `npm run check:playwright` |
| List discovered tests | `npx playwright test --list` |
| Open HTML report | `npx playwright show-report` |

## Authentication and Test Data

The setup project uses `auth.setup.ts` to authenticate the bootstrap admin through the UI and saves the resulting state under `playwright/.auth/`. The desktop and mobile projects depend on setup and reuse that state; `authenticated.spec.ts` verifies the reuse path. Generated authentication state is ignored by Git.

`login.spec.ts` explicitly starts without stored authentication. It authenticates the admin through the API, creates a temporary `User` with a `crypto.randomUUID()` email for isolation across parallel projects, and logs that user in through the UI. Its `afterAll` hook removes the temporary user through the API.

## GitHub Actions CI

`.github/workflows/playwright.yml` runs for pushes to `main`, pull requests targeting `main`, and manual `workflow_dispatch` runs. It uses Ubuntu and Node.js 24, installs dependencies plus Chromium system dependencies, runs Playwright type checking, starts the application, waits for API and frontend readiness, and executes the complete Playwright suite.

The HTML report is uploaded with an `always` condition when a report was produced, including after Playwright test failures:

- Artifact name: `playwright-report`
- Retention: 14 days

## Optional Playwright Reviewer Skill

`skills/playwright-reviewer/` contains an optional, read-only development and review aid for assessing Playwright and TypeScript test changes for correctness, maintainability, flakiness risk, security, and commit readiness. It is separate from runtime Playwright test execution, and GitHub Actions does not invoke it.

## Documentation

- [Functional requirements](docs/requirements.md)
- Swagger UI: `http://localhost:4000/docs`

## Reset the Local Database

Use this command only after the application has been started at least once and initialized the local database schema.

The following command is destructive to local data: it removes local users and sticky-note data, then recreates the bootstrap admin.

```bash
npm run reset-db
```

Database reset is not part of normal Playwright execution or CI.
