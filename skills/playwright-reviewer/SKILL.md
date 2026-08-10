---
name: playwright-reviewer
description: Review Playwright and TypeScript test-automation changes for correctness, maintainability, flakiness risk, security, and readiness to commit. Use when the user asks to review a Playwright diff, changed files, a GitHub commit or pull request, test architecture, fixtures, page objects, authentication/storageState, browser projects, or CI-related Playwright changes. Perform review-only analysis unless the user explicitly asks for fixes; prefer repository instructions and supplied task requirements over generic conventions.
---

# Playwright Reviewer

Review Playwright changes as an independent QA/code reviewer. Find concrete issues, verify relevant behavior when possible, and give a clear commit-readiness verdict without inventing problems.

## Review workflow

1. Establish the review target.
   - For a GitHub commit or pull request, use the GitHub connector to retrieve the actual diff and relevant files.
   - For uncommitted local changes, review the diff or files provided by the user. Do not pretend to see files that were not supplied or otherwise accessible.
2. Read repository-level instructions such as `AGENTS.md` before judging the change when they are available.
3. Identify the requested scope and acceptance criteria from the user, repository documentation, or task description. Flag scope creep separately from correctness issues.
4. Inspect the changed code plus only the surrounding implementation needed to understand behavior. Check application/API contracts instead of guessing labels, routes, payloads, status codes, or auth behavior.
5. Apply the Playwright review checklist in `references/review-checklist.md`.
6. Run the smallest relevant read-only validation commands when execution is available. Do not modify files, install packages, stage, commit, push, amend history, or change remotes as part of review.
7. Report findings by severity and finish with an explicit verdict.

## Evidence rules

- Tie every finding to concrete code, behavior, requirement, or validation output.
- Reference the file and line or changed code when available.
- Distinguish confirmed defects from risks or optional improvements.
- Do not report stylistic preferences as defects unless they violate repository conventions or materially affect maintainability.
- Do not weaken assertions, recommend arbitrary sleeps, or suggest hiding failures to make tests pass.
- If no meaningful issue exists, say so directly.
- If required evidence is unavailable, state what could not be verified instead of guessing.

## Validation guidance

Prefer the narrowest commands that prove the change. Typical examples include:

```text
npm run check:playwright
npx playwright test --list
npx playwright test <relevant-spec-or-project>
git diff --check
```

For configuration changes affecting multiple projects, validate each affected project or run the relevant combined suite. For authentication changes, verify both the authenticated reuse path and any tests that must still begin unauthenticated.

Do not treat a passing test suite as proof that the design is correct; still review isolation, cleanup, security, and flakiness risks.

## External documentation

Use current official Playwright documentation only when a behavior, API, or recommended pattern needs verification. Prefer primary sources. Do not use outside documentation to override explicit repository requirements without calling out the conflict.

## Report format

Use this structure unless the user explicitly requests another format:

### Blocking issues
- List defects that should prevent commit/merge, ordered by impact.
- If none: `None.`

### Important improvements
- List non-blocking issues that materially improve correctness, reliability, maintainability, or requirement compliance.
- If none: `None.`

### Optional improvements
- List genuinely optional refinements only when useful.
- If none: `None.`

### Validation performed
- State exactly what was inspected or executed and whether it passed, failed, or could not be run.

### Verdict
Use exactly one of:
- `READY TO COMMIT`
- `NOT READY TO COMMIT`
- `REVIEW INCOMPLETE` when necessary evidence could not be accessed.

Keep the report concise. Do not invent findings merely to populate every section.
