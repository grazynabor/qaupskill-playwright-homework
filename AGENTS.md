# Project Instructions

## Scope and change discipline

- Work incrementally and implement only the task explicitly requested.
- Do not implement later homework points or bonus work ahead of time.
- Prefer the smallest correct change and keep each change suitable for a small logical commit.
- Inspect relevant existing files before editing. Check the application code or API contract when UI labels, routes, payloads, responses, or status codes matter; do not guess behavior.
- Report a design issue, race condition, flaky-test risk, or requirement mismatch before introducing a larger redesign.

## Preserve the application

- The QA Upskill application under `apps/` is the system under test; automation is added on top of it.
- Do not refactor or modify application source code unless it is strictly necessary and explicitly approved by the user.

## Playwright baseline and practices

- Keep the existing architecture: `pages/LoginPage.ts`, `fixtures/index.ts`, `tests/login.spec.ts`, and `playwright.config.ts`.
- Preserve the implemented login POM, custom fixture, API setup/cleanup hooks, UI login hook, and passing `@smoke` workspace test unless the requested task requires a change.
- Prefer role-, label-, and user-facing locators over CSS or XPath.
- Keep assertions in tests rather than page objects unless there is a strong reason otherwise.
- Rely on Playwright auto-waiting; never add arbitrary sleeps such as `waitForTimeout()`.
- Avoid duplicated logic, keep tests deterministic and isolated, and do not weaken assertions to make tests pass.

## Validation and reporting

- After changes to Playwright TypeScript code or configuration, run `npm run check:playwright`.
- Run the smallest relevant Playwright command. If configuration affects multiple projects, list or run the affected projects as appropriate.
- Report exactly which files changed and which validation commands passed or failed.
- Do not commit generated Playwright artifacts from `test-results/`, `playwright-report/`, or `playwright/.auth/`.

## Git and security

- Do not commit or push unless explicitly requested.
- Do not rewrite history, amend commits, change remotes, or add an upstream remote.
- `origin` intentionally points only to `grazynabor/qaupskill-playwright-homework`.
- Never commit real secrets. Keep `.env` and authentication state local and ignored.
