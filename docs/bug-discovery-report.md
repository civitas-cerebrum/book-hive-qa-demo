# Bug Discovery Report — BookHive

**Date:** 2026-04-22
**App under test:** http://localhost:7547 (frontend) · http://localhost:8080 (backend), images rebuilt from `experimental/no-tests` just before probing.
**Method:** Stage 6 adversarial probing per the `bug-discovery` skill — Phase 1a (element probing via Playwright MCP), Phase 1b (adversarial flows), Phase 4 (context-derived observations).
**Test suite at time of report:** 44/44 passing specs (`tests/e2e/tests/specs/**`).
**Reproduction suite:** 7/7 failing (as designed) in `tests/e2e/tests/bug-discovery/**`, runnable via `npx playwright test --config=playwright.bug-discovery.config.ts`.

**Total findings:** 6
**User-visible bugs:** 2 (1 Critical · 1 Medium) · **API-only findings:** 3 Low · **DOM-only issues:** 1 No-impact

---

## Summary by severity

| Severity | Count | IDs |
|---|---|---|
| **User-visible** | | |
| Critical | 1 | BUG-003 |
| High | 0 | — |
| Medium | 1 | BUG-001 |
| Low | 0 | — |
| **API-only** (not reachable from the UI) | | |
| Low | 3 | BUG-002, BUG-004, BUG-005 |
| **DOM-only / code hygiene** | | |
| No impact | 1 | BUG-006 |

---

## User-visible bugs (confirmed)

### [BUG-003] Race on /api/orders creates ghost orders; returning them credits unpaid money

**Severity:** Critical
**Visibility:** User-visible (confirmed via screenshot; reproduced through the UI by triple-clicking Checkout)
**Category:** Race condition / concurrency + financial integrity
**Phase discovered:** 1a (noticed as doubling when two parallel POSTs fired), 1b (escalated when I returned the ghost orders and ended up richer than I started)
**Page / endpoint:** `/cart` → `POST /api/orders` → `/orders/:id` → `POST /api/orders/{id}/return`
**Reproduction tests:**
- `tests/bug-discovery/flow-bugs.spec.ts:31` — concurrent /api/orders must not create duplicates
- `tests/bug-discovery/flow-bugs.spec.ts:72` — returning ghost orders must not credit unpaid money
**Screenshot:** `tests/e2e/docs/screenshots/BUG-003-ghost-orders.png`

**Steps to reproduce (UI):**
1. Reset + seed the DB (`POST /api/reset`). Log in as testuser1 ($100 balance).
2. Add 1× `book-001` (stock 15, price $12.99) to the cart.
3. Open `/cart`, focus the Checkout button, click it three times in rapid succession.
4. Observe `/orders` and `/api/auth/me`.

**Expected:**
- Exactly one order created. Concurrent duplicates should be rejected server-side (e.g. 409 Conflict) because the cart has already been consumed.
- Balance debited once ($12.99).
- Stock decremented once (15 → 14).

**Actual:**
- Three orders appear on `/orders`, each with one item × book-001 × $12.99 × status COMPLETED.
- Balance debited only once (the user actually paid $12.99 total).
- Stock only decremented once.
- Two of the three orders are "ghosts" — they represent no sale but are fully returnable.

**Exploit path (confirmed financial impact):**
- Start: $100.
- After triple-click: $87.01 (real charge).
- Return ghost order #1: $100.00 (refund for a real charge — fine so far).
- Return ghost order #2: **$112.99** (refund for a transaction that never happened — free money).
- Repeatable at will. Amplifies linearly with how many concurrent POSTs survive the race.

**Root-cause hypothesis:** `OrderService` reads the cart, creates the order, and clears the cart without an optimistic lock or transactional `find-and-delete-if-exists` on the cart. Concurrent requests race past the "is cart empty?" check. Returns don't re-verify whether the order represents a real monetary transaction.

**Suggested fix direction:**
- Wrap cart→order conversion in a transactional claim on the cart (optimistic version, or Mongo findAndModify-style delete-if-matching).
- On return, verify the order's original payment was actually applied (audit record) before refunding.
- Client-side mitigation (disabling Checkout button after first click) is a UX improvement but does NOT fix the underlying bug — an attacker can bypass the UI and call the API directly.

---

### [BUG-001] Signup with a short password shows a generic "An unexpected error occurred"

**Severity:** Medium
**Visibility:** User-visible (confirmed via screenshot)
**Category:** Validation / UX
**Phase discovered:** 1a
**Page / endpoint:** `/signup` → `POST /api/auth/signup`
**Reproduction test:** `tests/bug-discovery/element-bugs.spec.ts:25`
**Screenshot:** `tests/e2e/docs/screenshots/BUG-001-signup-generic-error.png`

**Steps to reproduce:**
1. Open `/signup`.
2. Fill a valid email, a unique username, and a 1-character password.
3. Submit.

**Expected:** A specific, actionable validation message on the password field — e.g. "Password must be at least N characters" — so the user can correct their input.

**Actual:** The form renders `signup-error` with the text "An unexpected error occurred". The user has no idea what's wrong. The underlying API call returned HTTP 500 (`{"error":"internal_error"}`).

**Root-cause hypothesis:** `AuthService.signup` passes the raw password to `passwordEncoder.encode()` without a length guard. BCrypt's strength check (or some nested exception) throws and bubbles up as an unhandled 500.

**Suggested fix direction:** Add a minimum-length validator on the signup request DTO (`@Size(min=8)` or similar) — so the user gets a 400 with a useful message before the password even reaches the encoder.

---

## API-only findings (not reachable via the UI — but should be hardened)

### [BUG-002] `POST /api/cart/items` with `quantity <= 0` returns 500

**Severity:** Low (UI clamps quantity at 1, so users don't see this; but any custom client or a malformed request produces a 500)
**Reproduction:** `tests/bug-discovery/element-bugs.spec.ts:56`
**Expected:** 400 with a validation error.
**Actual:** 500. `quantity: 0`, `quantity: -1`, `quantity: -100` all reproduce.

### [BUG-004] `POST /api/marketplace/listings` accepts arbitrary strings for `condition`

**Severity:** Low
**Reproduction:** `tests/bug-discovery/element-bugs.spec.ts:87`
**Expected:** 400 — backend should reject values outside the known allow-list (`NEW`, `LIKE_NEW`, `GOOD`, `FAIR`, or whatever the canonical set is).
**Actual:** 200 — body like `{"condition":"WHATEVER"}` is stored and then rendered as a condition badge on `/marketplace` exactly as submitted.
**Note on drift:** The README still documents conditions as `EXCELLENT / GOOD / FAIR`. The UI now offers `NEW / LIKE_NEW / GOOD / FAIR`. The backend's `@Size(max=50) String condition` enforces no allow-list.

### [BUG-005] `POST /api/marketplace/listings` returns 500 on invalid price or overlong condition

**Severity:** Low
**Reproduction:** `tests/bug-discovery/element-bugs.spec.ts:114`
**Triggers:** `price: 0`, `price: -5`, or a 51-character `condition`.
**Expected:** 400 Bad Request with a structured validation error.
**Actual:** 500. (`@Size(max=50)` on condition triggers server-side validation but surfaces as a 500, not a 400.)

---

## DOM-only / code hygiene

### [BUG-006] Every guest page load fires `/api/auth/me` and logs a 403 in the console

**Severity:** No impact (DOM-only — not visible in UI)
**Phase discovered:** 4 (context-derived — app-context noted the recurring console error)
**Reproduction:** `tests/bug-discovery/context-derived-bugs.spec.ts:22`
**Observation:** On any guest route, `AuthContext` attempts `GET /api/auth/me` to bootstrap state. The backend returns 403 because there's no cookie, the frontend silently moves on, but Chrome logs "Failed to load resource: 403" in devtools. Noisy for developers, invisible to end users.
**Suggested fix:** Swallow the 403 at the fetch layer for the bootstrap call, or expose a dedicated `GET /api/auth/session` that returns 200 + `{user:null}` for guests.

---

## Coverage notes

- **Pages probed:** 11/11 — home, book detail, marketplace, marketplace/sell, login, signup, cart, orders list, order detail, profile, unknown route.
- **Flows probed:** concurrent checkout, return after ghost-order race, cross-user order access (IDOR), cross-user listing cancellation, seller buying own listing, cart persistence across logout/login, search/XSS reflection, signup XSS.
- **Categories covered:** boundary inputs (signup, listings, cart qty), state transitions (rapid submit, return after exploit), race conditions (concurrent orders), permission/access (IDOR on orders and listings), data edge cases (empty cart, empty listings, pagination edges), cross-feature (cart after logout, return after race).
- **Areas not probed (and why):**
  - Return-window expiry path — requires time travel; API-level probe only.
  - Payment-provider integration — none exists (balance is internal only).
  - Out-of-stock card variant — no helper endpoint to drain stock without going through UI checkout.
  - Keyboard/accessibility — out of scope for this pass.
  - Session/JWT tampering beyond basic guest case — out of scope.

---

## Confirmed-safe behaviors observed during probing

Not bugs — worth calling out because probing confirmed they work correctly:

- **Tenant isolation on orders** — user1 GET/RETURN on user2's order → 404/400. No IDOR.
- **Tenant isolation on listings** — user1 DELETE on user2's listing → 400, listing remains ACTIVE.
- **Self-purchase prevention** — POST /api/marketplace/listings/{own}/buy → 400 "Cannot buy your own listing".
- **XSS via stored username** — React's default text interpolation escapes the payload on /profile (`<img src=x onerror=alert(1)>` renders as text, not HTML).
- **Cart persistence across logout/login** — works as expected; cart survives.
- **Cart-quantity overflow** — adding `quantity: 50` against `stock: 15` → 400 "Not enough stock" (proper rejection; the 500s only surface on ≤ 0).

---

## Next actions

Recommended order of fixes:
1. **BUG-003** — fix before anything else; it's a financial bug with a trivial reproduction and scales with an attacker's concurrency.
2. **BUG-001** — small DTO annotation change; immediate UX win.
3. **BUG-002 / BUG-004 / BUG-005** — batch into a single "API input validation" PR. Low individual priority but cheap to bundle.
4. **BUG-006** — when touching the auth bootstrap next; not urgent.

Run the reproduction suite after each fix:
```bash
npx playwright test --config=playwright.bug-discovery.config.ts
```
Tests that turn green confirm the corresponding bug is fixed.
