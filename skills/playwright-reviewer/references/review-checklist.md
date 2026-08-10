# Playwright review checklist

Use the relevant parts of this checklist. Do not force every item into every review.

## Requirements and scope

- Confirm the change implements the requested behavior and does not silently implement unrelated work.
- Preserve mandatory behavior when adding optimizations or bonus features.
- Verify tests assert user-visible or contract-relevant outcomes rather than implementation trivia.

## Test design and isolation

- Keep tests deterministic and independent.
- Check setup and teardown for leaks, partial-failure behavior, and reliable cleanup.
- Check shared users, shared server state, timestamps, random values, and parallel workers for collisions.
- Flag ordering dependencies between tests.
- Prefer API setup/cleanup when it improves speed and determinism without bypassing the behavior under test.

## Locators and waiting

- Prefer role-, label-, text-, test-id-, or other user-facing locators appropriate to the application.
- Avoid brittle CSS/XPath selectors when a stable semantic locator exists.
- Rely on Playwright auto-waiting and web-first assertions.
- Flag arbitrary `waitForTimeout()` sleeps and race-prone manual polling.
- Check that assertions wait for the actual state transition that matters.

## Page objects and fixtures

- Keep page objects focused on page behavior and reusable interactions.
- Keep assertions in tests unless the repository intentionally uses assertion-rich page objects.
- Avoid hiding major test logic or business assertions inside helpers.
- Check fixtures for clear ownership, correct scope, and cleanup.
- Avoid duplicating page-object construction when an existing fixture already provides it.

## Authentication and storage state

- Treat saved authentication state as sensitive and keep it out of Git and public artifacts.
- Verify `storageState` is generated only after login is actually complete.
- Verify tests intended to exercise login start unauthenticated even if their project normally loads stored auth.
- Check origin-sensitive localStorage behavior and cookie behavior.
- Check token/session lifetime assumptions and setup-project dependencies.
- Do not print tokens or auth-state contents in logs.

## API setup and teardown

- Check endpoint, payload, auth header, and expected status codes against the actual API contract.
- Capture resource identifiers needed for cleanup.
- Ensure cleanup does not mask the primary failure and does not delete unrelated data.
- Check behavior when setup fails halfway through.

## Projects, devices, and parallelism

- Verify each configured project is actually discovered and exercises the intended device/browser profile.
- Check project dependencies and `--no-deps` implications when setup projects are used.
- Check whether shared state is safe across desktop/mobile or multiple workers.
- Flag project-specific assumptions hidden in generic tests.

## Environment and security

- Keep real secrets out of source control.
- Prefer environment variables with documented local/demo fallbacks only when appropriate for the repository.
- Ensure `.env`, auth-state files, reports, traces, screenshots, and other generated artifacts are ignored or intentionally handled.
- Do not confuse public demo/bootstrap credentials with production secrets; still document their purpose clearly.

## TypeScript and maintainability

- Check types for API responses and fixtures where they add useful guarantees.
- Avoid `any` when a simple accurate type is available.
- Flag duplication that will make tests drift, but do not demand abstraction for one-off trivial code.
- Prefer the smallest correct change consistent with repository conventions.

## CI changes

- Confirm CI installs dependencies and required Playwright browsers/system dependencies.
- Confirm the application/API is started and ready before tests run.
- Keep environment configuration explicit and safe.
- Upload reports/artifacts even on failure when useful, without uploading auth state or secrets.
- Check that CI commands match the local project structure and project dependencies.
