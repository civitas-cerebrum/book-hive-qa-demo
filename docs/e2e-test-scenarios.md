# BookHive — E2E Test Scenarios

Plain-English catalogue of every automated scenario in `tests/e2e/`. Grouped by the journey or purpose from the journey map. Total: **44 tests across 16 specs**.

---

## P0 — Revenue / Core Conversion

### J1 — Checkout a book

1. **Guest logs in, adds a book, checks out, lands on COMPLETED order**
   Start as guest, sign in as testuser1, open The Great Gatsby's detail page, add it, go to /cart, checkout; the order detail shows COMPLETED status with a matching total, and `/api/auth/me` confirms the balance dropped by the book's price.

2. **Checkout fails with a clear error when balance is insufficient**
   Sign a brand-new user up and fill their cart past the starter balance via API, log them into the UI, click Checkout; the page stays on /cart, `checkout-error` is rendered, and no order appears in `/api/orders`.

3. **Mobile-viewport end-to-end checkout** *(expansion)*
   At 375×812, log in, open a book, add it, reach /cart through the mobile cart button, check out, and confirm COMPLETED order + API-level balance debit.

### J2 — Return within the 10-minute window

4. **COMPLETED order can be returned; status flips and balance is refunded**
   Seed a COMPLETED order via API, navigate to it through the UI, verify the `M:SS` countdown shows, click Return; status becomes RETURNED, the Return button disappears, and the balance is refunded back to the pre-checkout amount.

### J3 — Signup + starter balance

5. **New user lands authenticated on /profile with a starter balance**
   Fill the signup form with a fresh username/email, submit, and confirm the sidebar shows authed nav; /profile renders the new username/email and a non-zero balance that matches `/api/auth/me`.

6. **Duplicate email is rejected on the signup page**
   Prime a user via API, clear cookies, try to sign up again with the same email through the UI; the URL stays on /signup and `signup-error` is rendered.

### J4 — Buy a marketplace listing

7. **Logged-in user buys another user's listing; balances and status update**
   Seed a listing for testuser2 via API, log in as testuser1, see one card with a Buy button on /marketplace, click Buy; the listing vanishes and `/api/auth/me` on both accounts shows the price moved from buyer to seller.

8. **Own listing does not expose a Buy button to the seller**
   Seed a listing for testuser1 via API, log into the UI as the same user, and confirm the card renders without a `listing-buy-{id}` button.

---

## P1 — Core Experience

### J5 — Browse / search / filter / paginate

9. **Default landing shows 12 books and 5 pages**
10. **Fantasy filter narrows the grid to the 8 Fantasy books** — via the desktop sidebar link.
11. **Pagination Next increments the page and enables Previous.**
12. **Search filters the grid by query (keystroke-driven debounce)** — 'gatsby' narrows to one card titled "The Great Gatsby".

### J6 — Create a marketplace listing

13. **Authed user lists a book; it appears on /marketplace and /profile**
    Fill the sell form for book-015 with LIKE_NEW condition at $9.25, submit; /profile shows the listing, /marketplace shows the card, and `/api/marketplace` confirms the listing is ACTIVE with matching price/condition owned by testuser1.

### J7 — Cancel own listing

14. **Cancelling from profile removes the listing from profile, marketplace, and API**
    Seed a listing for testuser1 via API, open /profile, click Cancel; the no-listings state appears, /marketplace has zero cards, and the listing no longer shows as ACTIVE for that user via API.

### J8 — Cart management

15. **Increment, decrement clamp at 1, remove, and clear-all behave correctly**
    Seed a cart of book-001 via API, exercise qty+ (total reaches 38.97), qty– clamps at 1 (minus button disables), remove empties the row, then add three books via API and hit Clear cart — the empty state reappears and `/api/cart` reports zero items.

---

## P2 — Supporting

### J9 — Guest book-detail

16. **Detail fields render and Add-to-Cart is NOT exposed to guests**
    Navigate as guest, confirm title/author/genre/description/price/stock render, and that the `add-to-cart-detail` button is absent while guest nav links are present.

### J10 — Theme toggle + responsive layout

17. **Theme toggle flips data-theme on <html> and persists via localStorage**
    Click the toggle; the `data-theme` attribute flips and `bookhive_theme` in localStorage mirrors it. After a reload the new value survives.

18. **Mobile viewport exposes the topbar hamburger and mobile buttons**
    At 400×800, the topbar + sidebar-toggle + mobile-search-btn + mobile-cart-btn are visible.

---

## P3 — Peripheral

### J11 — Logout

19. **After logout, gated routes redirect back to /login**
    Log in, click Logout; guest nav returns, `user-balance` disappears, and navigating to /cart lands on /login.

### J12 — Invalid login

20. **Bad credentials render login-error and keep the user on /login**
    Submit a bogus email + wrong password; `login-error` appears with "Invalid" text, URL is unchanged.

---

## Expansion — Cycle 1

### Navigation & routing

21–26. **Each of six sidebar genre links (Fiction, Sci-Fi, Non-Fiction, Biography, Fantasy, Mystery) narrows the grid to exactly the expected number of books, and every card rendered matches the selected genre.**
27. **Clicking a book card navigates to its detail page** — card → /books/book-001 → detail renders with "To Kill a Mockingbird" title.
28. **Pagination Next is disabled on the last page (5/5)**
29. **Unknown route renders the shell with an empty main area** — sidebar renders, no page-level testid is present, `<main>` is empty.

### Mobile P0 checkout

30. *(above — J1 mobile variant #3)*

### Cart extras

31. **Add-to-Cart on a book card updates the cart-badge count** — badge starts absent, increments to 1/2/3 as three different books are added from the grid.
32. **Multi-item checkout sums totals and deducts exactly once** — two-item cart sums to $20.48, /orders/:id shows that total and two items, balance is debited by 20.48, and after return to /cart the empty state renders and the badge is gone.

### Performance

33. **Home loads and renders the grid within 5 seconds** — P0 entry-page baseline.

---

## Expansion — Cycle 2

### API authentication guardrails

34–39. **Each protected API endpoint rejects an unauthenticated request** — GET /api/auth/me, GET /api/cart, POST /api/cart/items, GET /api/orders, POST /api/orders, POST /api/marketplace/listings all return a 4xx when the browser sends no cookie and no bearer token.

40. **Public endpoints do NOT require authentication** — /api/health, /api/books, /api/books/book-001, /api/marketplace return 200 to guests.

### Orders list with multiple statuses

41. **A user with COMPLETED + RETURNED orders sees both on /orders with correct status badges**
    Seed two orders via API (one RETURNED, one COMPLETED), log into the UI, confirm exactly two `order-card-{id}` rows with the matching status badges; clicking the COMPLETED row navigates into its detail page.

### Stock decrement + signup-then-buy

42. **Stock on /books/:id decrements after a checkout by another user**
    Read starting stock from the detail page, have testuser2 check out one copy via API, reload — stock is exactly one lower.

43. **Brand-new signup can immediately buy a book end-to-end**
    Signup → auto-login → open a book → add to cart → checkout → lands on COMPLETED order; `/api/auth/me` reports a balance between 0 and 100 (starter minus price).

### Mobile + search extras

44. **Sidebar-toggle opens the sidebar on mobile; its nav links are interactive** — 375×812, tap hamburger, click Mystery; URL includes `genre=Mystery` and 9 cards render.

45. **Search finds books by author name, not just title** — 'orwell' narrows the grid to one card titled "1984".

> (44 tests of 45 scenarios numbered — the 6 genre-filter tests collapse into six parameterized invocations of one scenario template, hence the scenario numbering overlaps slightly with the real test count.)
