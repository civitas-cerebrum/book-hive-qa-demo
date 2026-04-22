import { test, expect } from '../fixtures/base';
import { TEST_USERS, resetAndSeed } from '../helpers/api';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('Expansion — mobile P0 checkout', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('mobile viewport completes the full checkout journey end-to-end', async ({
    page,
    context,
    steps,
  }) => {
    // Login on mobile
    await steps.navigateTo('/login');
    await steps.fill('loginEmail', 'LoginPage', TEST_USERS.user1.email);
    await steps.fill('loginPassword', 'LoginPage', TEST_USERS.user1.password);
    await steps.click('loginSubmit', 'LoginPage');
    await steps.verifyPresence('userBalance', 'Shell');

    // Capture balance before via API (authoritative)
    const loginRes = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    const { token } = (await loginRes.json()) as { token: string };
    const meBefore = (await (
      await context.request.get(`${FRONTEND}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()) as { balance: number };

    // Visit a book and add it from the detail page
    await steps.navigateTo('/books/book-004');
    await steps.verifyText('bookDetailTitle', 'BookDetailPage', 'Pride and Prejudice');
    const price = parseFloat((await steps.getText('bookDetailPrice', 'BookDetailPage'))
      .replace(/[^0-9.]/g, ''));
    await steps.click('addToCartDetail', 'BookDetailPage');

    // Use the mobile cart button to reach /cart
    await steps.click('mobileCartBtn', 'Shell');
    await steps.verifyPresence('cartPage', 'CartPage');
    await steps.verifyTextContains('cartTotal', 'CartPage', price.toFixed(2));

    await steps.click('checkoutBtn', 'CartPage');

    await steps.verifyPresence('orderDetailPage', 'OrderDetailPage');
    await expect(page).toHaveURL(/\/orders\/[0-9a-f]+/);
    await steps.verifyTextContains('orderStatus', 'OrderDetailPage', 'COMPLETED');
    await steps.verifyTextContains('orderTotal', 'OrderDetailPage', price.toFixed(2));

    const meAfter = (await (
      await context.request.get(`${FRONTEND}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()) as { balance: number };
    expect(meAfter.balance).toBeCloseTo(meBefore.balance - price, 2);
  });
});
