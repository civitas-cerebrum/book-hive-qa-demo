import { test, expect } from '../fixtures/base';
import { resetAndSeed, TEST_USERS } from '../helpers/api';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('Bug Discovery — flow / race-condition bugs', () => {
  test.beforeEach(async () => {
    // Reset between tests — the ghost-order scenario leaves very unusual state.
    await resetAndSeed();
  });

  /**
   * @bug BUG-003
   * @severity Critical
   * @phase 1b
   * @visibility user-visible
   * @steps
   * 1. Log in, add 1× book-001 to the cart (stock 15, price $12.99).
   * 2. Fire 3 concurrent POST /api/orders calls with the same bearer token.
   * 3. Check orders list and balance.
   * @expected Exactly one order created; the other concurrent calls must
   *   fail with a clean error (e.g. 409 Conflict) because the cart has
   *   already been converted. Stock decremented by one, balance debited
   *   once.
   * @actual N orders created (one per concurrent request), each with
   *   status=COMPLETED and the same items. Balance debited only once and
   *   stock decremented only once — the duplicate "ghost" orders look real
   *   to the user but represent no sale. Returning a ghost order REFUNDS
   *   money the user never paid, yielding a net positive exploit.
   */
  test('@bug-discovery concurrent /api/orders must not create duplicate ghost orders', async ({
    context,
  }) => {
    const login = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    const { token } = (await login.json()) as { token: string };
    const auth = { Authorization: `Bearer ${token}` };

    await context.request.post(`${FRONTEND}/api/cart/items`, {
      data: { bookId: 'book-001', quantity: 1 },
      headers: auth,
    });

    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        context.request.post(`${FRONTEND}/api/orders`, { headers: auth }),
      ),
    );
    const succeeded = results.filter((r) => r.ok());
    expect(succeeded.length, 'at most one /api/orders call should succeed').toBe(1);

    const orders = (await (
      await context.request.get(`${FRONTEND}/api/orders`, { headers: auth })
    ).json()) as Array<{ status: string }>;
    expect(orders, 'only one persisted order should exist').toHaveLength(1);
  });

  /**
   * @bug BUG-003 (corollary exploit path)
   * @severity Critical
   * @phase 1b
   * @visibility user-visible
   * @steps
   * 1. Trigger the ghost-order race above to get 3 orders from 1 item.
   * 2. POST /api/orders/{id}/return on each "ghost" order.
   * 3. Compare final balance to the pre-exploit balance.
   * @expected Final balance == starting balance (or exactly one refund).
   * @actual Each ghost-order return credits another $12.99, so the final
   *   balance exceeds the starting balance — free money per exploit run.
   */
  test('@bug-discovery returning ghost orders must NOT credit money that was never charged', async ({
    context,
  }) => {
    const login = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    const { token } = (await login.json()) as { token: string };
    const auth = { Authorization: `Bearer ${token}` };

    const me0 = (await (
      await context.request.get(`${FRONTEND}/api/auth/me`, { headers: auth })
    ).json()) as { balance: number };
    const startBalance = me0.balance;

    await context.request.post(`${FRONTEND}/api/cart/items`, {
      data: { bookId: 'book-001', quantity: 1 },
      headers: auth,
    });
    await Promise.all(
      Array.from({ length: 3 }, () =>
        context.request.post(`${FRONTEND}/api/orders`, { headers: auth }),
      ),
    );

    const orders = (await (
      await context.request.get(`${FRONTEND}/api/orders`, { headers: auth })
    ).json()) as Array<{ id: string; status: string }>;

    for (const o of orders) {
      await context.request.post(`${FRONTEND}/api/orders/${o.id}/return`, { headers: auth });
    }

    const meFinal = (await (
      await context.request.get(`${FRONTEND}/api/auth/me`, { headers: auth })
    ).json()) as { balance: number };

    // A user who played the race and returned all resulting orders must end
    // up with AT MOST the balance they started with — never more.
    expect(
      meFinal.balance,
      `free-money exploit: started with ${startBalance}, ended with ${meFinal.balance}`,
    ).toBeLessThanOrEqual(startBalance + 0.005);
  });
});
