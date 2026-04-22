import { test, expect } from '../fixtures/base';
import { resetAndSeed, TEST_USERS } from '../helpers/api';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('Expansion — stock decrement + signup-then-buy', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('stock on /books/:id decrements after a checkout by another user', async ({
    context,
    steps,
  }) => {
    // Read starting stock via UI
    await steps.navigateTo('/books/book-007');
    const before = parseInt(
      (await steps.getText('bookDetailStock', 'BookDetailPage')).replace(/\D/g, ''),
      10,
    );
    expect(before).toBeGreaterThan(0);

    // Check out one copy as testuser2 via API
    const login = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user2.email, password: TEST_USERS.user2.password },
    });
    const { token } = (await login.json()) as { token: string };
    const auth = { Authorization: `Bearer ${token}` };
    await context.request.post(`${FRONTEND}/api/cart/items`, {
      data: { bookId: 'book-007', quantity: 1 },
      headers: auth,
    });
    await context.request.post(`${FRONTEND}/api/orders`, { headers: auth });

    // Reload the detail page — stock now one lower
    await steps.navigateTo('/books/book-007');
    const after = parseInt(
      (await steps.getText('bookDetailStock', 'BookDetailPage')).replace(/\D/g, ''),
      10,
    );
    expect(after).toBe(before - 1);
  });

  test('brand-new signup can immediately buy a book end-to-end', async ({
    context,
    steps,
    page,
  }) => {
    const suffix = Date.now();
    const username = `fresh${suffix}`;
    const email = `${username}@bookhive.test`;
    const password = 'Test1234!';

    await steps.navigateTo('/signup');
    await steps.fill('signupUsername', 'SignupPage', username);
    await steps.fill('signupEmail', 'SignupPage', email);
    await steps.fill('signupPassword', 'SignupPage', password);
    await steps.click('signupSubmit', 'SignupPage');
    await steps.verifyPresence('userBalance', 'Shell');

    // Immediately buy book-008
    await steps.navigateTo('/books/book-008');
    const price = parseFloat(
      (await steps.getText('bookDetailPrice', 'BookDetailPage')).replace(/[^0-9.]/g, ''),
    );
    await steps.click('addToCartDetail', 'BookDetailPage');
    await steps.navigateTo('/cart');
    await steps.click('checkoutBtn', 'CartPage');

    await expect(page).toHaveURL(/\/orders\/[0-9a-f]+/);
    await steps.verifyTextContains('orderStatus', 'OrderDetailPage', 'COMPLETED');
    await steps.verifyTextContains('orderTotal', 'OrderDetailPage', price.toFixed(2));

    // API-assert balance = starter - price
    const me = (await (
      await context.request.get(`${FRONTEND}/api/auth/me`)
    ).json()) as { balance: number; email: string };
    expect(me.email).toBe(email);
    expect(me.balance).toBeGreaterThan(0);
    expect(me.balance).toBeLessThan(100);
  });
});
