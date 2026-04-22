# BookHive QA Demo

A showcase of end-to-end QA automation built on [**@civitas-cerebrum/element-interactions**](https://www.npmjs.com/package/@civitas-cerebrum/element-interactions) and [**@civitas-cerebrum/element-repository**](https://www.npmjs.com/package/@civitas-cerebrum/element-repository), exercising [BookHive](https://github.com/umutayb/book-hive) — a full-stack bookstore reference app — through its published Docker images.

> **Stakeholder summary:** see [`docs/deck/qa-summary-deck.pdf`](docs/deck/qa-summary-deck.pdf) (9 slides, landscape). The HTML source is at [`docs/deck/qa-summary-deck.html`](docs/deck/qa-summary-deck.html).

---

## What this repo demonstrates

This project shows how `element-interactions` + a JSON page-repository replace boilerplate-heavy Playwright page objects with a terse, declarative **Steps API**. The payoff is visible in every spec:

```ts
await steps.navigateTo('/');
await steps.click('HomePage', 'searchInput');
await steps.fill('HomePage', 'searchInput', 'Dune');
await steps.pressKey('Enter');
await steps.verifyUrlContains('query=Dune');
await steps.verifyCount('HomePage', 'bookCard', { exactly: 1 });
```

No selectors in test code. No POM boilerplate. Elements live in `tests/data/page-repository.json` (11 pages × 99 stable `data-testid`-backed selectors), and every step reads from that repository.

The suite was built with a six-stage QA pipeline:

1. **Journey mapping** — 12 prioritised user journeys discovered live against the running app
2. **Scenario onboarding** — each journey gated and committed independently
3. **API compliance review** — Steps API usage cross-checked against the reference
4. **Coverage expansion** — iterative, API-driven additions (mobile, performance, guardrails)
5. **Bug discovery** — adversarial probing that produces *failing* reproduction tests
6. **Stakeholder deck** — the HTML/PDF output in [`docs/deck/`](docs/deck/)

---

## What's in the box

- **20 priority-and-expansion specs · 44 tests · 100% green** — every journey from P0 (core conversions) to P3 (peripheral), plus expansion coverage for navigation, mobile, cart extras, performance, API guardrails, and stock handling.
- **3 bug-discovery specs · 7 failing tests** — reproductions of 6 bugs surfaced by adversarial probing (1 Critical, 1 Medium, 3 Low, 1 DOM-only). Each test turns green automatically when the matching bug is fixed upstream.
- **`tests/data/page-repository.json`** — 11 pages × 99 stable selectors, consumed by every step.
- **`docs/`** — journey map, app context, plain-English scenarios, full bug-discovery report with screenshots, and the stakeholder deck.

The whole suite runs against the **published Docker Hub images** — no local app build required:

| Service | Image |
|---|---|
| Frontend | `umutayb/book-hive-frontend:latest` (Nginx on :7547) |
| Backend | `umutayb/book-hive-backend:latest` (Spring Boot on :8080) |
| Database | `mongo:7` |

---

## Quick start

### Prerequisites

- Docker Desktop (or any Docker + docker-compose v2)
- Node.js 20+

### Run the full suite

```bash
npm install            # also installs the chromium binary via postinstall
npm run app:up         # pulls the public images, waits for /api/health, seeds the DB
npm test               # runs the 44-test main suite
npm run report         # opens the HTML report
npm run app:down       # stops the stack
```

### Run the bug-discovery reproduction suite (expected to fail)

```bash
npm run test:bugs
```

All 7 tests are designed to **fail** against the current published image. Each one turns green automatically when the corresponding bug is fixed upstream — no test edit required.

### Useful extras

```bash
npm run seed              # reset the DB to a known state between runs
npm run test:headed       # watch the browser
npm run test:ui           # Playwright UI mode for interactive debugging
npm run app:logs          # tail container logs
```

---

## Project layout

```
book-hive-qa-demo/
├── docker-compose.yml                      # public images, no build
├── playwright.config.ts                    # main-suite config
├── playwright.bug-discovery.config.ts      # runs only tests/bug-discovery/
├── scripts/wait-for-app.js                 # polls /api/health, then seeds
├── tests/
│   ├── fixtures/base.ts                    # baseFixture wiring
│   ├── helpers/
│   │   ├── api.ts                          # /api/auth, /api/reset, /api/marketplace, ...
│   │   └── auth-ui.ts                      # login helpers
│   ├── data/page-repository.json           # 11 pages × 99 elements
│   ├── specs/                              # 20 main-suite specs
│   │   ├── p0-j1-checkout.spec.ts          # P0 · core conversions
│   │   ├── p0-j2-return.spec.ts
│   │   ├── p0-j3-signup.spec.ts
│   │   ├── p0-j4-buy-listing.spec.ts
│   │   ├── p1-j5-browse.spec.ts            # P1 · core experience
│   │   ├── p1-j6-create-listing.spec.ts
│   │   ├── p1-j7-cancel-listing.spec.ts
│   │   ├── p1-j8-cart.spec.ts
│   │   ├── p2-j9-guest-detail.spec.ts      # P2/P3 · supporting + peripheral
│   │   ├── p2-j10-theme-responsive.spec.ts
│   │   ├── p3-j11-logout.spec.ts
│   │   ├── p3-j12-invalid-login.spec.ts
│   │   ├── expand-navigation.spec.ts       # Stage-4 coverage expansion
│   │   ├── expand-mobile-checkout.spec.ts
│   │   ├── expand-mobile-interactions.spec.ts
│   │   ├── expand-cart-extras.spec.ts
│   │   ├── expand-performance.spec.ts
│   │   ├── expand-api-guardrails.spec.ts
│   │   ├── expand-orders-list.spec.ts
│   │   └── expand-stock-and-signup-buy.spec.ts
│   └── bug-discovery/                      # Stage-5 failing reproductions
│       ├── element-bugs.spec.ts            # BUG-001, 002, 004, 005
│       ├── flow-bugs.spec.ts               # BUG-003 (Critical)
│       └── context-derived-bugs.spec.ts    # BUG-006
└── docs/
    ├── journey-map.md                      # 12 prioritised journeys + coverage checkpoint
    ├── app-context.md                      # pages / testids / state transitions
    ├── e2e-test-scenarios.md               # 45 plain-English scenarios
    ├── bug-discovery-report.md             # 6 findings, severity-classified
    ├── screenshots/                        # BUG-003 + BUG-001 proof
    └── deck/                               # stakeholder summary deck (HTML + PDF)
```

---

## Test data

The public image seeds with a fixed fixture whenever `POST /api/reset` is called:

| User | Email | Password | Starter balance |
|---|---|---|---|
| testuser1 | `testuser1@bookhive.test` | `Test1234!` | $100.00 |
| testuser2 | `testuser2@bookhive.test` | `Test1234!` | $100.00 |

- **50 books** with fixed IDs `book-001`–`book-050` across Fiction / Sci-Fi / Non-Fiction / Biography / Fantasy / Mystery.
- **Stock 7–20 units per book**, **prices $8.99–$24.99**.
- Orders have a **10-minute return window** enforced server-side.
- Test helpers hit `POST /api/reset` in `beforeAll` hooks to guarantee a clean slate per spec file.

---

## Running against a remote BookHive

If you already have BookHive running elsewhere, skip `npm run app:up` and set environment variables before `npm test`:

```bash
export BOOKHIVE_URL=https://your-bookhive.example.com
export BOOKHIVE_API_URL=https://your-bookhive.example.com
npm test
```

Both variables default to `http://localhost:7547` / `http://localhost:8080` respectively.

---

## Troubleshooting

**`Playwright Test did not expect test.describe() to be called here`** when adding a new spec file — wipe the Playwright transform cache and re-run:

```bash
rm -rf "$TMPDIR/playwright-transform-cache-$(id -u)"
npm test
```

This is a known Chromium transform-cache bug, not a test issue.

**The bug-discovery suite fails with a ghost-order race but my balance didn't change** — by design. The ghost-order race (BUG-003) leaves the user with duplicate "successful" orders but only one real charge. Returning a ghost order is where the exploit surfaces. Read `docs/bug-discovery-report.md` for the full write-up.

**`docker compose up` hangs on MongoDB** — check that port `27017` isn't already in use locally (`lsof -iTCP:27017 -sTCP:LISTEN`). The compose file doesn't publish the Mongo port; if you already have Mongo running on the host, the internal network still works.

---

## About the framework

- **[`@civitas-cerebrum/element-interactions`](https://www.npmjs.com/package/@civitas-cerebrum/element-interactions)** — the Steps API (`click`, `fill`, `verifyPresence`, `verifyCount`, `selectDropdown`, `backOrForward`, …) used throughout this suite.
- **[`@civitas-cerebrum/element-repository`](https://www.npmjs.com/package/@civitas-cerebrum/element-repository)** — the page-repository loader that turns `page-repository.json` into typed element references consumed by the Steps API.
