import { test, expect } from '../fixtures/base';
import { TEST_USERS, resetAndSeed } from '../helpers/api';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('J2 — Return a completed order within the 10-minute window (P0)', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('COMPLETED order can be returned; status flips and balance is refunded', async ({
    context,
    steps,
  }) => {
    // Seed: API-login, add book-001 to cart, checkout via API so we start
    // the UI test already on a COMPLETED order within the window.
    const loginRes = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    const { token } = (await loginRes.json()) as { token: string };
    const auth = { Authorization: `Bearer ${token}` };

    const balBefore = (await (await context.request.get(`${FRONTEND}/api/auth/me`, { headers: auth })).json()) as { balance: number };

    await context.request.post(`${FRONTEND}/api/cart/items`, {
      data: { bookId: 'book-001', quantity: 1 },
      headers: auth,
    });
    const orderRes = await context.request.post(`${FRONTEND}/api/orders`, { headers: auth });
    const order = (await orderRes.json()) as { id: string; totalPrice: number; status: string };
    expect(order.status).toBe('COMPLETED');

    const balAfterCheckout = (await (await context.request.get(`${FRONTEND}/api/auth/me`, { headers: auth })).json()) as { balance: number };
    expect(balAfterCheckout.balance).toBeCloseTo(balBefore.balance - order.totalPrice, 2);

    // Log into the UI and navigate to the seeded order
    await steps.navigateTo('/login');
    await steps.fill('loginEmail', 'LoginPage', TEST_USERS.user1.email);
    await steps.fill('loginPassword', 'LoginPage', TEST_USERS.user1.password);
    await steps.click('loginSubmit', 'LoginPage');
    await steps.navigateTo(`/orders/${order.id}`);

    // Confirm the countdown is live (> 0), the button is visible, status is COMPLETED
    await steps.verifyPresence('orderDetailPage', 'OrderDetailPage');
    await steps.verifyTextContains('orderStatus', 'OrderDetailPage', 'COMPLETED');
    const countdownText = await steps.getText('returnCountdown', 'OrderDetailPage');
    expect(countdownText).toMatch(/\d+:\d{2}/);

    // Click Return — use the listed element entry since testid carries the order id
    await steps.click('returnOrderButton', 'OrderDetailPage');

    // Status must flip to RETURNED and the return button must disappear
    await steps.verifyTextContains('orderStatus', 'OrderDetailPage', 'RETURNED');
    await steps.verifyAbsence('returnOrderButton', 'OrderDetailPage');

    // Balance has been refunded back to the pre-checkout amount
    const balAfterReturn = (await (await context.request.get(`${FRONTEND}/api/auth/me`, { headers: auth })).json()) as { balance: number };
    expect(balAfterReturn.balance).toBeCloseTo(balBefore.balance, 2);
  });
});
