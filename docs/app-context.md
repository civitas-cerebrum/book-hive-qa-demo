# BookHive — App Context

**App:** BookHive bookstore e-commerce (React 18 SPA + Spring Boot + MongoDB)
**Discovered via:** Playwright MCP against `http://localhost:7547`
**Discovered on:** 2026-04-22
**Seed endpoint:** `POST http://localhost:8080/api/seed` (idempotent)
**Reset endpoint:** `POST http://localhost:8080/api/reset` (drops + re-seeds)
**Test users:** `testuser1@bookhive.test` / `Test1234!`, `testuser2@bookhive.test` / `Test1234!` (starting balance $100)

## Shell (present on every page)

### Sidebar (desktop, always mounted; collapsible on mobile behind hamburger)
testids: `sidebar`, `logo`, `theme-toggle`
- Browse group: `nav-all-books` → `/`, `nav-marketplace` → `/marketplace`
- Categories (6 genre links): `genre-filter-fiction`, `genre-filter-sci-fi`, `genre-filter-non-fiction`, `genre-filter-biography`, `genre-filter-fantasy`, `genre-filter-mystery` (each links to `/?genre=<Genre>`)
- Account group (guest): `nav-login` → `/login`, `nav-signup` → `/signup`
- Account group (authed): `user-balance` (displays `Balance: $X.XX`), `nav-cart` → `/cart`, `nav-orders` → `/orders`, `nav-sell` → `/marketplace/sell`, `nav-profile` → `/profile`, `logout-btn`

### TopBar (mobile)
testids: `topbar`, `sidebar-toggle` (hamburger), `mobile-search-btn`, `mobile-cart-btn`
Breakpoint: ≤ 768px switches to mobile layout.

## Routes

| URL | Page testid | Auth | Notes |
|---|---|---|---|
| `/` | `home-page` | No | Book catalog with search, genre chips, grid, pagination |
| `/?genre=<Genre>` | `home-page` | No | Same page filtered by genre |
| `/books/:id` | `book-detail-page` | No | Details; Add-to-Cart button only when authed |
| `/marketplace` | `marketplace-page` | No | List of ACTIVE listings; shows `No listings available` when empty |
| `/marketplace/sell` | `create-listing-page` | **Yes** | Create a listing (book select, condition, price) |
| `/login` | `login-page` | No | `login-email`, `login-password`, `login-submit`, `login-error` |
| `/signup` | — | No | `signup-username`, `signup-email`, `signup-password`, `signup-submit` |
| `/cart` | `cart-page` | **Yes** | Shows `Your cart is empty` when empty; otherwise item rows + totals + checkout |
| `/orders` | `orders-page` | **Yes** | `no-orders` state or `order-card-{id}` list; each card links to `/orders/:id` |
| `/orders/:id` | `order-detail-page` | **Yes** | Status, items, total; `return-countdown` + `return-order-{id}` button while within 10-min window and status=COMPLETED |
| `/profile` | `profile-page` | **Yes** | Username, email, balance, active listings (`my-listing-{id}` + `cancel-listing-{id}`) or `no-listings` |
| `/<anything-else>` | — | N/A | Sidebar renders but `<main>` is empty. No dedicated 404 page. |

Accessing any **Auth: Yes** route while logged-out redirects to `/login`.

## Page details

### Home (`/`)
- `search-input` — live/debounced filter textbox
- `genre-chips` group with chips `genre-chip-all`, `genre-chip-fiction`, `genre-chip-sci-fi`, `genre-chip-non-fiction`, `genre-chip-biography`, `genre-chip-fantasy`, `genre-chip-mystery`
- `book-grid` — 12 cards per page, paginated through 5 pages (50 books total)
- Each `book-card-{bookId}` contains: `book-genre-{id}`, `book-title-{id}`, `book-author-{id}`, `book-price-{id}`, and (authed only) `add-to-cart-{id}`; when stock=0 the card shows `out-of-stock-{id}` instead.
- Pagination controls: `Previous` button (disabled on page 1) · `1 / 5` indicator · `Next` button (disabled on last page).

### Book detail (`/books/:id`)
- testids: `book-detail-page`, `book-detail-title`, `book-detail-author`, `book-detail-genre`, `book-detail-description`, `book-detail-price`, `book-detail-stock`
- `add-to-cart-detail` button visible only when authenticated.

### Cart (`/cart`)
- Empty: shows `Your cart is empty`.
- Populated: `cart-page`, `cart-clear` (Clear cart button), `cart-item-{id}`, `cart-item-title-{id}`, `cart-item-price-{id}`, `cart-qty-minus-{id}` (disabled when qty=1), `cart-qty-{id}` (quantity display), `cart-qty-plus-{id}`, `cart-remove-{id}`, `cart-total`, `checkout-btn`.
- Clicking `checkout-btn` calls `POST /api/orders`, redirects to `/orders/:id`, deducts total from user balance.
- Checkout surfaces errors if balance < total or any book is out of stock (recent commit: "surface checkout errors").

### Orders (`/orders`)
- Empty: shows `no-orders` state.
- Populated: list of `order-card-{id}` rows showing `#<shortId>`, date, item count, total, `order-status-{id}` badge (PENDING / COMPLETED / RETURNED). Each card links to `/orders/:id`.

### Order detail (`/orders/:id`)
- testids: `order-detail-page`, `order-status-{id}`, `order-item-{idx}`, `order-total`
- While status=COMPLETED and inside 10-minute window: `return-countdown` (shows `M:SS`) + `return-order-{id}` button.
- After return: status becomes RETURNED, button is gone, balance is refunded.

### Marketplace (`/marketplace`)
- Empty: `No listings available`.
- Populated: cards with testids per listing — `listing-card-{id}`, `listing-title-{id}`, `listing-condition-badge-{id}` (EXCELLENT/GOOD/FAIR), `listing-price-{id}`, `listing-buy-{id}` (shown only for listings not owned by the current user).

### Create listing (`/marketplace/sell`)
- Form fields: `listing-book-select` (select of 50 books + placeholder), `listing-condition` (select of 3 conditions + placeholder), `listing-price` (number input).
- Submit: `listing-create`.

### Profile (`/profile`)
- `profile-username`, `profile-email`, `profile-balance`.
- My Listings section: `my-listing-{id}` + `cancel-listing-{id}` per active listing, or `no-listings` when none.

### Login (`/login`)
- Fields: `login-email`, `login-password`; submit `login-submit`; invalid creds render `login-error` ("Invalid credentials").
- Success → cookie set + redirect to `/`.

### Signup (`/signup`)
- Fields: `signup-username`, `signup-email`, `signup-password`; submit `signup-submit`.
- Success auto-logs in and redirects; new user gets a starter balance (recent commit).

## State transitions that matter for tests

| Event | State change |
|---|---|
| Signup | New user, auto-login cookie, starter balance credited |
| Login | Cookie `bookhive_token` set + Authorization bearer supported |
| Add to cart | Cart row appears; quantity mergeable on re-add |
| Checkout | Cart → empty; Order PENDING→COMPLETED; balance decremented; 10-min return window opens |
| Return (within window) | Order RETURNED; balance refunded; stock restored |
| Return window expires | Return button disappears; order terminal |
| Create listing | Listing ACTIVE; appears in `/marketplace` and `/profile`; you cannot see Buy on your own listing |
| Buy a listing | Listing SOLD; balance debited from buyer, credited to seller; listing hidden from marketplace |
| Cancel own listing | Listing CANCELLED; disappears from both marketplace and profile |
| Logout | Cookie cleared, redirected to guest state |

## Gated areas (require auth or state setup)

- `/cart`, `/orders`, `/orders/:id`, `/profile`, `/marketplace/sell` — auth via login fixture
- Return button requires a COMPLETED order within the 10-minute window — seed via checkout in the test
- Cancel-listing requires a listing created by the same user
- `out-of-stock-{id}` card state requires decrementing a book's stock to 0 (needs repeated checkouts or direct DB manipulation — not supported by the current helper endpoints)

## Discovery scope notes

- External links: none observed.
- Pagination: 5 pages confirmed; not walking past page 2 in tests — spot-check first/last page and `Next/Previous` button states.
- Mobile viewport tested at 400×800: sidebar collapses behind `sidebar-toggle`; topbar exposes `mobile-search-btn` and `mobile-cart-btn`.
- No explicit 404 page. Unknown routes render the shell with an empty main.
- One console error is logged on every page load (not investigated during mapping; flag for bug-discovery phase).
