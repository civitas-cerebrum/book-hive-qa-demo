import { test, expect } from '../fixtures/base';
import { TEST_USERS, resetAndSeed } from '../helpers/api';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('Expansion — cart extras', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('Add-to-Cart on a book card updates the cart-badge count', async ({ steps }) => {
    await steps.navigateTo('/login');
    await steps.fill('loginEmail', 'LoginPage', TEST_USERS.user1.email);
    await steps.fill('loginPassword', 'LoginPage', TEST_USERS.user1.password);
    await steps.click('loginSubmit', 'LoginPage');
    await steps.verifyPresence('userBalance', 'Shell');

    await steps.navigateTo('/');
    // Badge is absent when cart is empty
    await steps.verifyAbsence('cartBadge', 'Shell');

    await steps.click('addToCartBook001', 'HomePage');
    await steps.verifyText('cartBadge', 'Shell', '1');

    await steps.click('addToCartBook002', 'HomePage');
    await steps.verifyText('cartBadge', 'Shell', '2');

    await steps.click('addToCartBook003', 'HomePage');
    await steps.verifyText('cartBadge', 'Shell', '3');

    // Cart page shows the three distinct titles — wait for the rows to hydrate
    await steps.navigateTo('/cart');
    await steps.verifyPresence('cartPage', 'CartPage');
    await steps.verifyCount('cartItemTitles', 'CartPage', { exactly: 3 });
    const titles = await steps.getAll('cartItemTitles', 'CartPage');
    expect(new Set(titles).size).toBe(3);
  });

  test('multi-item checkout sums totals and deducts exactly once', async ({ context, steps, page }) => {
    const login = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user2.email, password: TEST_USERS.user2.password },
    });
    const { token } = (await login.json()) as { token: string };
    const auth = { Authorization: `Bearer ${token}` };

    const meBefore = (await (
      await context.request.get(`${FRONTEND}/api/auth/me`, { headers: auth })
    ).json()) as { balance: number };

    // Seed cart directly: book-005 ($11.49) + book-006 ($8.99) = $20.48
    for (const bookId of ['book-005', 'book-006']) {
      await context.request.post(`${FRONTEND}/api/cart/items`, {
        data: { bookId, quantity: 1 },
        headers: auth,
      });
    }
    await context.clearCookies();

    // UI login and checkout
    await steps.navigateTo('/login');
    await steps.fill('loginEmail', 'LoginPage', TEST_USERS.user2.email);
    await steps.fill('loginPassword', 'LoginPage', TEST_USERS.user2.password);
    await steps.click('loginSubmit', 'LoginPage');
    await steps.verifyPresence('userBalance', 'Shell');

    await steps.navigateTo('/cart');
    await steps.verifyTextContains('cartTotal', 'CartPage', '20.48');

    await steps.click('checkoutBtn', 'CartPage');

    await steps.verifyPresence('orderDetailPage', 'OrderDetailPage');
    await expect(page).toHaveURL(/\/orders\/[0-9a-f]+/);
    await steps.verifyTextContains('orderStatus', 'OrderDetailPage', 'COMPLETED');
    await steps.verifyTextContains('orderTotal', 'OrderDetailPage', '20.48');
    // Two items on the order
    await steps.verifyCount('orderItems', 'OrderDetailPage', { exactly: 2 });

    const meAfter = (await (
      await context.request.get(`${FRONTEND}/api/auth/me`, { headers: auth })
    ).json()) as { balance: number };
    expect(meAfter.balance).toBeCloseTo(meBefore.balance - 20.48, 2);

    // Cart is empty after checkout and the badge vanishes
    await steps.navigateTo('/cart');
    await steps.verifyPresence('cartEmptyByText', 'CartPage');
    await steps.verifyAbsence('cartBadge', 'Shell');
  });
});
