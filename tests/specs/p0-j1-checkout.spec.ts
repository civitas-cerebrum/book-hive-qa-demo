import { test, expect } from '../fixtures/base';
import { TEST_USERS, resetAndSeed } from '../helpers/api';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('J1 — Checkout a book (P0)', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('guest logs in, adds a book, checks out, lands on COMPLETED order', async ({
    page,
    context,
    steps,
  }) => {
    // Start as guest
    await steps.navigateTo('/');
    await steps.verifyPresence('homePage', 'HomePage');
    await steps.verifyPresence('navLogin', 'Shell');

    // Log in via UI
    await steps.click('navLogin', 'Shell');
    await steps.verifyPresence('loginPage', 'LoginPage');
    await steps.fill('loginEmail', 'LoginPage', TEST_USERS.user1.email);
    await steps.fill('loginPassword', 'LoginPage', TEST_USERS.user1.password);
    await steps.click('loginSubmit', 'LoginPage');
    await steps.verifyPresence('userBalance', 'Shell');

    // Capture balance before checkout via API (authoritative)
    const loginRes = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    const { token } = (await loginRes.json()) as { token: string };
    const meBefore = (await (
      await context.request.get(`${FRONTEND}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()) as { balance: number };
    const balanceBefore = meBefore.balance;

    // Add book-002 (The Great Gatsby, $10.99) to cart from detail page
    await steps.navigateTo('/books/book-002');
    await steps.verifyText('bookDetailTitle', 'BookDetailPage', 'The Great Gatsby');
    const priceText = await steps.getText('bookDetailPrice', 'BookDetailPage');
    const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    expect(price).toBeCloseTo(10.99, 2);

    await steps.click('addToCartDetail', 'BookDetailPage');

    // Cart page shows the item and matching total
    await steps.click('navCart', 'Shell');
    await steps.verifyPresence('cartPage', 'CartPage');
    await steps.verifyTextContains('cartTotal', 'CartPage', price.toFixed(2));

    // Checkout
    await steps.click('checkoutBtn', 'CartPage');

    // Order detail: COMPLETED, countdown visible, total matches
    await steps.verifyPresence('orderDetailPage', 'OrderDetailPage');
    await expect(page).toHaveURL(/\/orders\/[0-9a-f]+/);
    await steps.verifyTextContains('orderStatus', 'OrderDetailPage', 'COMPLETED');
    await steps.verifyPresence('returnCountdown', 'OrderDetailPage');
    await steps.verifyTextContains('orderTotal', 'OrderDetailPage', price.toFixed(2));

    // Balance has been deducted — verified authoritatively via API
    const meAfter = (await (
      await context.request.get(`${FRONTEND}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()) as { balance: number };
    expect(meAfter.balance).toBeCloseTo(balanceBefore - price, 2);
  });

  test('checkout fails with a clear error when balance is insufficient', async ({
    page,
    context,
    steps,
  }) => {
    // Arrange: sign up a brand-new $100 user, then fill their cart past that balance.
    const unique = `ins${Date.now()}`;
    const email = `${unique}@bookhive.test`;
    const password = 'Test1234!';
    const signupRes = await context.request.post(`${FRONTEND}/api/auth/signup`, {
      data: { username: unique, email, password },
    });
    expect(signupRes.ok()).toBeTruthy();
    const signupBody = (await signupRes.json()) as { token: string; balance: number };
    expect(signupBody.balance).toBeGreaterThan(0);

    // Dune is $16.99. 7 × $16.99 = $118.93 > $100 → guaranteed insufficient.
    const qty = Math.ceil((signupBody.balance + 10) / 16.99);
    const addRes = await context.request.post(`${FRONTEND}/api/cart/items`, {
      data: { bookId: 'book-009', quantity: qty },
      headers: { Authorization: `Bearer ${signupBody.token}` },
    });
    expect(addRes.ok()).toBeTruthy();

    // Log into the UI as this user and try to check out
    await steps.navigateTo('/login');
    await steps.fill('loginEmail', 'LoginPage', email);
    await steps.fill('loginPassword', 'LoginPage', password);
    await steps.click('loginSubmit', 'LoginPage');

    await steps.navigateTo('/cart');
    await steps.verifyPresence('cartPage', 'CartPage');
    await steps.click('checkoutBtn', 'CartPage');

    // We must stay on /cart and see a surfaced error
    await expect(page).toHaveURL(/\/cart$/);
    await steps.verifyPresence('checkoutError', 'CartPage');

    // No order was created — /api/orders returns an empty list for this user
    const ordersRes = await context.request.get(`${FRONTEND}/api/orders`, {
      headers: { Authorization: `Bearer ${signupBody.token}` },
    });
    const orders = (await ordersRes.json()) as unknown[];
    expect(orders).toHaveLength(0);
  });
});
