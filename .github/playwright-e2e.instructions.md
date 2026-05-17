---
description: 'Playwright E2E testing standards and best practices'
applyTo: '**/e2e/**/*.ts, **/*.spec.ts, **/*.page.ts, **/*.fixture.ts, **/*.helper.ts'
---

# Playwright E2E Testing Instructions

## Git Commit Convention

Always use the Conventional Commits format: `<type>(<scope>): <description>`

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Use imperative mood in description ("add" not "added")
- Don't capitalize first letter of description
- Don't add period at the end of description
- Scope is optional but recommended

Examples: `test(auth): add role-based access smoke tests`, `fix(config): update timeout to 30 seconds`

## Test Tags

Append tags directly in the test name string, e.g. `test('should login @smoke @auth @critical', ...)`.

Available tags:
- `@smoke` — critical tests run in every build
- `@regression` — full regression suite
- `@auth` — authentication & authorization
- `@e2e` — end-to-end user journey
- `@critical` — P0 priority
- `@high` — P1 priority

Feature tags: `@auth`, `@plant`, `@ml`, `@schema`, `@analytics`, `@assets`

Rules:
- Every test needs at least one feature tag
- Add `@critical` or `@high` for important tests
- Add `@smoke` for tests that run in every build
- Use `@e2e` for complete user journey tests

Run by tag: `npx playwright test --grep @smoke`

## test.step() — Required

Every test MUST organize actions into logical steps using `test.step()`. This improves readability, HTML report clarity, and debugging.

Step naming conventions:
- Use descriptive action phrases: "Navigate to...", "Fill form with...", "Verify..."
- Group related assertions in one step
- Separate navigation, actions, and verifications into distinct steps
- Keep step names concise but meaningful

## Coding Standards

### No Sleep/Timeout
Never use `page.waitForTimeout()` or hardcoded delays. Always wait for a specific condition: `waitForLoadState`, `waitForURL`, `expect(...).toBeVisible()`, `waitForResponse`.

### Page Objects
- Use arrow functions for locators: `readonly emailInput = () => this.page.getByTestId('email-input')`
- Use arrow functions with parameters for dynamic locators: `readonly getRowByName = (name: string) => this.page.locator(...)`
- No assertions in Page Objects — locators and actions only; assertions belong in test files
- Use `readonly` for locators, `private` for internal helpers, `public` for actions, `static` for utilities

### Strong Typing
- Every function, method, and variable MUST have explicit types
- Always specify return types: `Promise<void>`, `Promise<string>`, `Promise<boolean>`, `Promise<number>`

## Project Structure

```
e2e/
├── global-setup.ts
├── global-teardown.ts
└── src/
    ├── fixtures/        # *.fixture.ts — extended Playwright fixtures
    ├── helpers/         # *.helper.ts — shared utilities (no assertions)
    ├── pages/           # *.page.ts — Page Object classes extending BasePage
    ├── tests/           # *.spec.ts — one file per feature area
    └── index.ts         # Central re-exports
```

## File Naming

- Page Objects: `*.page.ts` → `login.page.ts` maps to class `LoginPage`
- Test files: `*.spec.ts` → group by feature, e.g. `auth-access.spec.ts`
- Fixtures: `*.fixture.ts`, Helpers: `*.helper.ts`
- Use kebab-case for filenames, PascalCase for class names

## Test Isolation

Each test MUST be independent — no shared state between tests, no order dependency.

- Use `beforeEach` for shared setup
- Generate unique data per test using `uniqueSuffix()` from `helpers/app.ts`
- Never hardcode names, codes, or emails that may conflict across runs
- Clean up created data in `afterEach` if needed
