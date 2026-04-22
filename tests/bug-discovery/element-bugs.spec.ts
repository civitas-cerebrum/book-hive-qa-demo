import { test, expect } from '../fixtures/base';
import { resetAndSeed, TEST_USERS } from '../helpers/api';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('Bug Discovery — element / API boundary bugs', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  /**
   * @bug BUG-001
   * @severity Medium
   * @phase 1a
   * @visibility user-visible
   * @steps
   * 1. Open /signup
   * 2. Submit username + valid email + a 1-character password
   * 3. Observe the rendered signup-error text
   * @expected A field-level validation message such as "Password must be at
   *   least N characters" or inline help on the password field.
   * @actual Generic "An unexpected error occurred" is rendered from a 500
   *   response — the user has no clue what to correct.
   */
  test('@bug-discovery signup with a short password surfaces a specific validation message, not a generic error', async ({
    steps,
    page,
  }) => {
    await steps.navigateTo('/signup');
    await steps.verifyPresence('signupPage', 'SignupPage');

    const unique = `short${Date.now()}`;
    await steps.fill('signupUsername', 'SignupPage', unique);
    await steps.fill('signupEmail', 'SignupPage', `${unique}@bookhive.test`);
    await steps.fill('signupPassword', 'SignupPage', 'a');
    await steps.click('signupSubmit', 'SignupPage');

    await steps.verifyPresence('signupError', 'SignupPage');
    const errText = await steps.getText('signupError', 'SignupPage');
    // The error must mention the specific problem, not be a generic catch-all.
    expect(errText.toLowerCase(), `actual error: ${errText}`).not.toContain('unexpected');
    expect(errText.toLowerCase()).toMatch(/password|length|at least|characters|short/);
  });

  /**
   * @bug BUG-002
   * @severity Low
   * @phase 1a
   * @visibility api-only
   * @steps
   * 1. Log in to obtain a bearer token.
   * 2. POST /api/cart/items with { quantity: 0 } and with { quantity: -1 }.
   * @expected 400 Bad Request with a validation error body.
   * @actual 500 Internal Server Error.
   */
  test('@bug-discovery POST /api/cart/items rejects quantity<=0 with 400 (not 500)', async ({
    context,
  }) => {
    const login = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    const { token } = (await login.json()) as { token: string };

    for (const quantity of [0, -1, -100]) {
      const res = await context.request.post(`${FRONTEND}/api/cart/items`, {
        data: { bookId: 'book-001', quantity },
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status(), `quantity=${quantity} should be a 4xx not a 5xx`).toBeGreaterThanOrEqual(400);
      expect(res.status(), `quantity=${quantity} should be a 4xx not a 5xx`).toBeLessThan(500);
    }
  });

  /**
   * @bug BUG-004
   * @severity Low
   * @phase 1a
   * @visibility api-only
   * @steps
   * 1. Log in as a seller.
   * 2. POST /api/marketplace/listings with a condition outside the enum
   *    (e.g., "WHATEVER").
   * @expected 400 Bad Request (backend enforces an allow-list).
   * @actual 200 OK; listing stored with condition="WHATEVER" and rendered on
   *   /marketplace exactly as submitted.
   */
  test('@bug-discovery POST /api/marketplace/listings rejects unknown condition values', async ({
    context,
  }) => {
    const login = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    const { token } = (await login.json()) as { token: string };
    const res = await context.request.post(`${FRONTEND}/api/marketplace/listings`, {
      data: { bookId: 'book-010', condition: 'WHATEVER', price: 4.99 },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status(), 'unknown condition should be rejected').toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  /**
   * @bug BUG-005
   * @severity Low
   * @phase 1a
   * @visibility api-only
   * @steps
   * 1. Log in.
   * 2. POST /api/marketplace/listings with price = 0, price = -1, and
   *    a 51-character condition string.
   * @expected 400 Bad Request for each, with a structured validation payload.
   * @actual 500 Internal Server Error.
   */
  test('@bug-discovery POST /api/marketplace/listings returns 4xx (not 5xx) for bad price/condition length', async ({
    context,
  }) => {
    const login = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    const { token } = (await login.json()) as { token: string };
    const cases = [
      { bookId: 'book-011', condition: 'GOOD', price: 0 },
      { bookId: 'book-012', condition: 'GOOD', price: -5 },
      { bookId: 'book-013', condition: 'A'.repeat(51), price: 10 },
    ];
    for (const body of cases) {
      const res = await context.request.post(`${FRONTEND}/api/marketplace/listings`, {
        data: body,
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(
        res.status(),
        `body=${JSON.stringify(body)} should be a 4xx not a 5xx`,
      ).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    }
  });
});
