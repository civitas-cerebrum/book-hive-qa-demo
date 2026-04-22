import { test, expect } from '../fixtures/base';
import { TEST_USERS, resetAndSeed } from '../helpers/api';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('Expansion — orders list with multiple statuses', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('a user with COMPLETED + RETURNED orders sees both on /orders with correct statuses', async ({
    context,
    steps,
    page,
  }) => {
    // Seed two orders: one COMPLETED, one RETURNED
    const login = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    const { token } = (await login.json()) as { token: string };
    const auth = { Authorization: `Bearer ${token}` };

    // Order 1: book-002 → checkout → immediately return
    await context.request.post(`${FRONTEND}/api/cart/items`, {
      data: { bookId: 'book-002', quantity: 1 },
      headers: auth,
    });
    const order1 = (await (
      await context.request.post(`${FRONTEND}/api/orders`, { headers: auth })
    ).json()) as { id: string; status: string };
    await context.request.post(`${FRONTEND}/api/orders/${order1.id}/return`, { headers: auth });

    // Order 2: book-003 → checkout, leave as COMPLETED
    await context.request.post(`${FRONTEND}/api/cart/items`, {
      data: { bookId: 'book-003', quantity: 1 },
      headers: auth,
    });
    const order2 = (await (
      await context.request.post(`${FRONTEND}/api/orders`, { headers: auth })
    ).json()) as { id: string; status: string };

    await context.clearCookies();

    // UI login and open orders list
    await steps.navigateTo('/login');
    await steps.fill('loginEmail', 'LoginPage', TEST_USERS.user1.email);
    await steps.fill('loginPassword', 'LoginPage', TEST_USERS.user1.password);
    await steps.click('loginSubmit', 'LoginPage');
    await steps.verifyPresence('userBalance', 'Shell');

    await steps.navigateTo('/orders');
    await steps.verifyPresence('ordersPage', 'OrdersPage');
    await steps.verifyCount('orderCards', 'OrdersPage', { exactly: 2 });

    // Assert each order's status badge reflects the correct value
    await expect(page.getByTestId(`order-status-${order1.id}`)).toHaveText(/RETURNED/);
    await expect(page.getByTestId(`order-status-${order2.id}`)).toHaveText(/COMPLETED/);

    // Clicking the COMPLETED order navigates into its detail
    await page.getByTestId(`order-card-${order2.id}`).click();
    await expect(page).toHaveURL(new RegExp(`/orders/${order2.id}$`));
    await steps.verifyPresence('orderDetailPage', 'OrderDetailPage');
  });
});
