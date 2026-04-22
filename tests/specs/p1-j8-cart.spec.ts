import { test, expect } from '../fixtures/base';
import { TEST_USERS, resetAndSeed } from '../helpers/api';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('J8 — Cart management (P1)', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('increment, decrement clamp at 1, remove, and clear-all all behave correctly', async ({
    context,
    steps,
    page,
  }) => {
    // Seed a cart with one copy of book-001 via API
    const login = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    const { token } = (await login.json()) as { token: string };
    const auth = { Authorization: `Bearer ${token}` };

    await context.request.post(`${FRONTEND}/api/cart/items`, {
      data: { bookId: 'book-001', quantity: 1 },
      headers: auth,
    });

    await context.clearCookies();

    // UI log-in and go to /cart
    await steps.navigateTo('/login');
    await steps.fill('loginEmail', 'LoginPage', TEST_USERS.user1.email);
    await steps.fill('loginPassword', 'LoginPage', TEST_USERS.user1.password);
    await steps.click('loginSubmit', 'LoginPage');
    await steps.verifyPresence('userBalance', 'Shell');
    await steps.navigateTo('/cart');
    await steps.verifyPresence('cartPage', 'CartPage');

    const qtyField = page.getByTestId(/^cart-qty-[^plus^minus]/).first();
    const plusButton = page.getByTestId(/^cart-qty-plus-/).first();
    const minusButton = page.getByTestId(/^cart-qty-minus-/).first();
    const removeButton = page.getByTestId(/^cart-remove-/).first();

    // Baseline: qty = 1; minus is disabled; total matches To Kill a Mockingbird $12.99
    await expect(qtyField).toHaveText('1');
    await expect(minusButton).toBeDisabled();
    await steps.verifyTextContains('cartTotal', 'CartPage', '12.99');

    // Increment twice → qty 3, total 38.97
    await plusButton.click();
    await plusButton.click();
    await expect(qtyField).toHaveText('3');
    await steps.verifyTextContains('cartTotal', 'CartPage', '38.97');
    await expect(minusButton).toBeEnabled();

    // Decrement down to 1, then the minus button disables again
    await minusButton.click();
    await expect(qtyField).toHaveText('2');
    await minusButton.click();
    await expect(qtyField).toHaveText('1');
    await expect(minusButton).toBeDisabled();

    // Remove → empty state
    await removeButton.click();
    await steps.verifyPresence('cartEmptyByText', 'CartPage');

    // Add three different items via API then hit clear-cart in the UI
    await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    for (const bookId of ['book-002', 'book-003', 'book-004']) {
      await context.request.post(`${FRONTEND}/api/cart/items`, {
        data: { bookId, quantity: 1 },
        headers: auth,
      });
    }
    await steps.navigateTo('/cart');
    await steps.verifyPresence('cartClear', 'CartPage');
    await steps.click('cartClear', 'CartPage');

    // Clear-cart empties the cart entirely
    await steps.verifyPresence('cartEmptyByText', 'CartPage');

    const cart = (await (
      await context.request.get(`${FRONTEND}/api/cart`, { headers: auth })
    ).json()) as { items: unknown[] };
    expect(cart.items ?? []).toHaveLength(0);
  });
});
