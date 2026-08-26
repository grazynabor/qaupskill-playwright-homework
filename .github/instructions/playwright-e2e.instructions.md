---
description: 'Repository-specific Playwright E2E instructions'
applyTo: 'tests/**/*.ts, pages/**/*.ts, fixtures/**/*.ts, playwright.config.ts'
---

# Playwright E2E Instructions

Follow the existing architecture: Page Objects live in `pages/`, the custom fixture module is `fixtures/index.ts`, tests live in `tests/`, and project/auth configuration lives in `playwright.config.ts` and `tests/auth.setup.ts`.

## Tests and fixtures

- In test files, import `test` and `expect` from the custom fixture module (`../fixtures`), not directly from `@playwright/test`. An alias such as `test as setup` is fine for setup files.
- Expose Page Objects through custom fixtures in `fixtures/index.ts`; consume those fixtures in tests instead of constructing Page Objects there.
- Keep assertions in tests. Page Objects should provide locators and reusable user actions.
- Use Playwright metadata for tags, for example `{ tag: '@smoke' }`; do not embed tags in test titles.
- Use `test.step()` for longer or multi-phase scenarios when it improves HTML report readability and diagnostics. It is not required for every test.

## Locators and waiting

- Prefer user-facing locators such as `getByRole()`, `getByLabel()`, and `getByText()`.
- Avoid CSS and XPath selectors unless a user-facing locator cannot express the target and the reason is justified.
- Rely on Playwright auto-waiting and web-first assertions such as `await expect(locator).toBeVisible()`.
- Never use arbitrary sleeps such as `page.waitForTimeout()`. Wait for an observable condition, URL, response, or other specific event when auto-waiting is insufficient.

## Data and isolation

- Use the API for test-data setup and cleanup when possible; keep the user flow under test in the UI.
- Generate unique test data, for example with `randomUUID()`, to prevent collisions in parallel runs.
- Clean up all data created by a test, including on failure when practical.
- Keep tests isolated and deterministic; do not depend on test order or shared mutable state.

## Repository conventions

- Keep the current descriptive PascalCase Page Object filenames, such as `LoginPage.ts` and `StickyNotesPage.ts`. Do not require a `*.page.ts` suffix or `BasePage` inheritance.
- Keep the current fixture entry point `fixtures/index.ts`; do not require `*.fixture.ts` filenames.
- Preserve the setup-project and stored-auth-state pattern already configured in `playwright.config.ts`.
- Do not commit `.env`, files under `playwright/.auth/`, `playwright-report/`, or `test-results/`.
