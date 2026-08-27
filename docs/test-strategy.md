# Playwright E2E Test Strategy

## 1. Objectives

Playwright targets critical journeys and integration boundaries: authentication, authorization and role-based navigation, important state transitions, deterministic isolation, and useful failure diagnostics. Each scenario should protect material risk across browser, frontend, API, and persistence.

Exhaustive field validation, every REST endpoint, and every permission permutation are not E2E goals. Lower layers should exercise rule matrices and edge cases.

## 2. Scope and Test Layers

Playwright E2E is appropriate where confidence depends on several parts working together: UI authentication, stored-session restoration, role-specific navigation, or a Sticky Note crossing the UI, API, rendering, and persistence boundaries.

Lower-level API, component, or unit tests are generally better for:

- exhaustive field boundary values and malformed payloads;
- API authorization permutations across roles, ownership, resources, and endpoints;
- assignment counts, sorting, statistics, rounding, colors, and limit matrices;
- token-expiry mechanics, which should not require an eight-hour browser run.

The repository does not prove these lower-level suites exist; recommendations identify a suitable layer, not existing coverage.

## 3. Current Automated Coverage

Custom fixtures supply `LoginPage`, `WorkspacePage`, `StickyNotesPage`, and `ArchivePage`. `auth.setup.ts` logs the bootstrap Admin in through the UI and writes `storageState` for both browser projects. `authenticated.spec.ts` proves restoration: after reload, `/auth/me` returns `200` and authenticated UI remains visible.

The `@smoke` scenario clears inherited storage, creates a unique temporary User through the Admin API, logs in through the UI, and verifies identity, Logout, User navigation, and the default Note Assignments section. API creation and cleanup make data deterministic; they do not cover Create User or Delete User UI requirements.

The isolated logout scenario uses explicitly empty browser `storageState`, creates a unique temporary User through the Admin API, logs in and out through the UI, and verifies the unauthenticated state persists after reload. Deterministic cleanup runs in `finally`; the browser neither uses nor invalidates the shared Admin state. This covers the observable client-side session lifecycle, not server-side token invalidation.

The RBAC suite creates unique Configurator and User accounts by API, logs in through the UI as all three roles, and asserts default landing content, expected navigation, and absent restricted tabs. This is navigation evidence, not proof of every permitted operation.

The first Sticky Note scenario creates one unassigned note as Admin through the UI. It verifies the `POST /notes` response, feedback, cleared inputs, visible note state, and persistence in the refresh `GET /notes` response and board. Assignment, color selection, limits, and UI deletion are not exercised.

The lifecycle scenario creates a unique note through the UI, verifies the `201` response and active card, marks that exact note done while synchronizing on `PATCH /notes/:id/done`, and verifies the `200` payload and success feedback. It then proves the note leaves the active board and, using `WorkspacePage` and `ArchivePage`, appears in Archive with the same title and content. API deletion by captured ID runs in `finally` for isolation; the scenario covers one allowed Admin path, not the permission matrix or every Archive invariant.

Dependent tests run in Desktop Chrome and Mobile Chrome (Pixel 5) projects. This is cross-viewport Chromium coverage, not cross-browser coverage.

## 4. Requirements Traceability

`Coverage` is based on current test actions and assertions, not test names. API operations used only to arrange or clean data are not functional coverage. `Not covered` means absent from the current Playwright E2E suite; it neither assigns the behavior to E2E nor implies that lower-level automation exists.

| Requirement area | Requirement / behavior | Coverage | Existing automated test | E2E priority | Decision |
| --- | --- | --- | --- | --- | --- |
| Authentication | Successful login through the UI | Covered | `auth.setup.ts`; isolated User flow in `login.spec.ts` | High | Retain as a critical smoke path. |
| Authentication | Email is normalized to lowercase | Not covered | None; current credentials are already lowercase | Medium | Test at the layer that owns normalization; retain one UI case if client-side normalization is part of the user-facing contract. |
| Authentication | Session restoration after reload with `/auth/me` verification | Covered | `authenticated.spec.ts` asserts `/auth/me` `200` and authenticated UI after reload | High | Retain. |
| Authentication | Invalid or expired stored token is removed | Not covered | None | Medium | Prefer API/session integration coverage plus one browser check if regressions justify it. |
| Authentication | Logout clears local state and invalidates the server token | Partially covered | `session.spec.ts` covers UI logout, client-side session clearing, and the logged-out state after reload; the frontend does not call `/auth/logout` | High | Server-side token invalidation remains unmet. After an application fix, extend the same scenario to assert `POST /auth/logout` returns `204` and the old token is rejected by `GET /auth/me` with `401`. |
| Authentication | Token expires after eight hours | Not covered | None | Low | Test expiry configuration and rejection below E2E; do not wait in a browser. |
| RBAC / navigation | User permissions | Partially covered | `rbac.spec.ts` covers visible/hidden tabs and default landing, not actions | High | Retain navigation checks; add action coverage only for selected high-risk journeys. |
| RBAC / navigation | Admin permissions | Partially covered | Navigation and landing plus note creation and completion are covered for Admin | High | Avoid duplicating every User path as Admin. |
| RBAC / navigation | Configurator permissions | Partially covered | Navigation and landing only | High | Add action evidence only where Configurator rules materially differ. |
| RBAC / navigation | Restricted tabs are hidden | Covered | `rbac.spec.ts` asserts absent controls for User and Configurator | High | Retain as a compact authorization signal. |
| RBAC / navigation | Default landing tab for each role | Covered | Admin Users, Configurator Person, User Note Assignments asserted in `rbac.spec.ts` | High | Retain. |
| Users | Admin can view users | Not covered | Admin landing heading does not verify user rows | Medium | Consider within one representative user-management journey. |
| Users | Create a user through the UI | Not covered | `POST /people` is setup only | Medium | Evaluate one Admin UI journey; do not reproduce the validation matrix in E2E. |
| Users | Change an existing user's role | Not covered | None | Medium | Include only if chosen as the key state transition in a user-management journey. |
| Users | Delete a user through the UI | Not covered | API cleanup is not UI coverage | Medium | Consider as cleanup/end-state of one representative journey. |
| Users | Authenticated Admin cannot self-delete | Not covered | None | Medium | Prefer API/component coverage; one UI assertion may be valuable if the control is a recurring risk. |
| Users | Delete confirmation, dismissal, errors, success, and data side effects | Not covered | None | Medium | Split modal behavior to component tests and destructive side effects to API integration tests; keep at most one E2E happy path. |
| Person | Section visibility by role | Covered | Person control visible for Admin/Configurator and absent for User in `rbac.spec.ts` | Medium | Retain in RBAC matrix. |
| Person | Edit and persist profile data through the modal | Not covered | None | Medium | Candidate only if profile editing is business-critical; validate field permutations below E2E. |
| Sticky Notes | Authenticated roles can create a note and redirect to the board | Partially covered | Both `sticky-notes.spec.ts` scenarios create as Admin from the active board; other roles are not exercised | High | Retain; do not duplicate for every role unless permission risk changes. |
| Sticky Notes | Title and content validation | Not covered | None | Low | Cover boundaries and whitespace rules below E2E. |
| Sticky Notes | Five allowed colors | Not covered | Default color is not asserted and selection is not exercised | Low | Prefer component/API parameterized tests. |
| Sticky Notes | Assignment is optional and may target an existing user | Partially covered | Created note is asserted as `Unassigned`; assigned creation is absent | Medium | Add assignment only as part of a higher-value assignment journey. |
| Sticky Notes | Active board shows open notes only | Partially covered | Lifecycle test verifies its completed note disappears from the active board | High | Retain the lifecycle evidence; broader negative invariants belong below E2E. |
| Sticky Notes | Maximum of ten open notes; done notes do not consume capacity | Not covered | None | Medium | Test limit rules at API level; retain one UI boundary signal only if UX handling is risky. |
| Sticky Notes | Header shows open count versus limit | Not covered | None | Medium | Consider with a lifecycle or limit scenario, not as a standalone E2E. |
| Sticky Notes | Mark a note as done with permitted ownership/role | Partially covered | Lifecycle test covers one allowed Admin path and verifies the exact `PATCH` succeeds with `200` | High | Retain the primary allowed path; permission matrix belongs at API level. |
| Sticky Notes | Done note leaves active board and moves to Archive | Covered | Lifecycle test verifies the same note leaves the active board and appears in Archive with its title and content | High | Retain as the critical Sticky Note state transition. |
| Sticky Notes | Delete permissions for creator, Admin, and Configurator | Not covered | Admin API cleanup does not exercise UI behavior or permission rules | Medium | Prefer API authorization tests; add one UI path only if needed. |
| Sticky Notes | Note remains visible and correct after manual refresh | Covered | `sticky-notes.spec.ts` asserts GET response and rendered note after Refresh | High | Retain. |
| Archive | Section visibility for Admin/Configurator and restriction for User | Covered | `rbac.spec.ts` | High | Retain. |
| Archive | Contains done notes only | Partially covered | Lifecycle test verifies one completed note appears in Archive with the expected title and content | High | Retain this positive path; test the negative open-note invariant below E2E. |
| Archive | Header shows archived count | Not covered | None | Medium | Assert within the lifecycle scenario if deterministic. |
| Note Assignments | Section visibility for all roles | Covered | `rbac.spec.ts`; User default section also asserted in `login.spec.ts` | Medium | Retain in RBAC matrix. |
| Note Assignments | Only people with assigned open notes appear; unassigned notes are excluded | Not covered | None | Medium | Prefer component/API data-shaping tests; consider one representative E2E dataset later. |
| Note Assignments | Person and header counts use active/open notes | Not covered | None | Medium | Test calculation rules below E2E. |
| Note Assignments | Rows sort by count descending, then name | Not covered | None | Low | Parameterized unit/component test. |
| Statistics | Section visibility for all roles | Covered | `rbac.spec.ts` | Medium | Retain in RBAC matrix. |
| Statistics | Total, done, and open values | Not covered | None | Medium | Prefer calculation tests below E2E; one display smoke may follow the lifecycle journey. |
| Statistics | Completion rate and rounding | Not covered | None | Low | Unit test the calculation matrix. |
| Statistics | Configurator-created notes are excluded | Not covered | None | Medium | API/service-level test with controlled creators. |
| Data refresh | Data refreshes when the user changes tabs | Not covered | RBAC checks controls but does not navigate between tabs or assert requests/data refresh | Medium | Reassess after lifecycle coverage; avoid a broad tab-by-tab E2E matrix. |
| Data refresh | Manual Refresh on mutable sections | Partially covered | Sticky Notes Refresh only | Medium | Retain the note assertion; cover other sections only with a relevant journey. |
| API documentation | Swagger UI at `/docs` | Not covered | None | Low | A lightweight HTTP/UI smoke check is sufficient if documentation availability is a release gate. |
| API documentation | OpenAPI JSON at `/docs.json` | Not covered | None | Low | Prefer an API/schema validation check outside the browser suite. |

## 5. Risk-Based Prioritization

The Sticky Note lifecycle is implemented for one allowed Admin path: a unique note crosses UI creation, the done API transition, active-board removal, and Archive rendering. Permission permutations, counters, and broader active/Archive invariants remain outside that scenario.

The isolated logout/session E2E now covers UI login, logout, client-side session clearing, and the logged-out state after reload. Completing the documented server-side invalidation requirement is blocked by current application behavior because the frontend does not call `/auth/logout`; after the application fix, extend the existing scenario to verify the logout response and rejection of the old token.

One UI user-management scenario may add value across form, role, persistence, list, and confirmation behavior. Select the riskiest transition—create then role change or delete—rather than automating every Users requirement.

Validation matrices, token timing, ownership permutations, sorting, and calculations remain more deterministic below E2E.

## 6. Test Design Principles

The suite currently demonstrates these practices:

- Page Objects encapsulate reusable UI locators and actions, custom fixtures inject them, and assertions remain in tests.
- Locators use labels, roles, accessible names, headings, and visible text.
- Web-first assertions and response synchronization avoid arbitrary sleeps; ESLint rejects `waitForTimeout()` and requires web-first assertions.
- APIs arrange and remove deterministic data while UUID-based emails and note titles reduce collisions; the journey under test stays in the UI.
- Login, RBAC, and logout scenarios explicitly opt out of saved state; authenticated scenarios intentionally reuse it.
- Cleanup runs in `afterAll` for shared setup accounts and in `finally` for isolated session and note data; scenarios do not rely on test order.

## 7. Execution Matrix

| Project | Purpose | Authentication | Device / browser |
| --- | --- | --- | --- |
| `setup` | Runs `auth.setup.ts` and writes Admin state | UI login | Default Playwright browser context |
| `desktop-chrome` | Executes the dependent suite | Reuses Admin `storageState` unless a spec clears it | Desktop Chrome device profile |
| `mobile-chrome` | Executes the same dependent suite | Reuses Admin `storageState` unless a spec clears it | Pixel 5 / Mobile Chrome profile |

CI retries once (`retries: 1`); local execution has none. The matrix covers two Chromium profiles, not Firefox, WebKit, or real devices.

## 8. CI Quality Gates and Diagnostics

GitHub Actions runs on pushes and pull requests to `main`, plus manual dispatch. On Ubuntu with Node.js 24, it uses `npm ci`, installs Chromium with system dependencies, and runs `npm run check:playwright` and `npm run lint:playwright`. ESLint applies recommended TypeScript and Playwright rules, including errors for arbitrary waits and non-web-first assertions.

The workflow checks the exact `/health` body and frontend root before Playwright; failures print application logs. List and HTML reporters are enabled, and `playwright-report/` is retained as `playwright-html-report` for 14 days. The Job Summary records outcomes, browser projects, diagnostics, and the report link.

Diagnostics are screenshots on failure, retained video on failure, and trace on the first retry. `forbidOnly` is not configured and is not an existing gate.

## 9. Known Gaps and Requirement Clarifications

### Done permission behavior

The requirements allow all authenticated users to mark notes done in the UI, while the API permits only the creator, Admin, or Configurator. For another user's note, these expectations conflict. Clarify the intended behavior before encoding cross-user E2E expectations, then align API authorization and UI exposure.

### Sticky Note color value

The documented color list prefixes four values with `#`, but lists `4d5b1f` differently. The current implementation appears to use `#4d5b1f`; this remains a documentation clarification candidate rather than a replacement contract or test assumption.

### Logout implementation gap

The documented contract requires server-side token invalidation, but the current UI only clears local authentication state and does not call `POST /auth/logout`. The E2E suite therefore verifies the observable client-side logout lifecycle only. Closing the requirement requires an application change; afterward the test should verify `POST /auth/logout` returns `204` and rejection of the previous token by `GET /auth/me` returns `401`.

## 10. Proposed Next Steps

1. Resolve the logout implementation mismatch, then extend the existing session E2E test to verify server-side token invalidation.
2. Add `forbidOnly` as a CI configuration safeguard against accidental focused tests; this improves test governance, not functional coverage.
3. Reassess residual risk and decide whether one representative user-management E2E journey adds sufficient value.

Further tests should be driven by product risk and requirement value, not raw test count.
