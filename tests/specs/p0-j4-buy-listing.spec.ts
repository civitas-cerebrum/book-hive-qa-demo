import { test, expect } from '../fixtures/base';
import { TEST_USERS, resetAndSeed } from '../helpers/api';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('J4 — Buy a marketplace listing (P0)', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('logged-in user buys another user\'s listing; balances and listing status update', async ({
    context,
    steps,
  }) => {
    // Seed: testuser2 lists book-003 for $7.50
    const sellerLogin = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user2.email, password: TEST_USERS.user2.password },
    });
    const sellerBody = (await sellerLogin.json()) as { token: string; userId: string; balance: number };
    const listPrice = 7.5;
    const listingRes = await context.request.post(`${FRONTEND}/api/marketplace/listings`, {
      data: { bookId: 'book-003', condition: 'GOOD', price: listPrice },
      headers: { Authorization: `Bearer ${sellerBody.token}` },
    });
    const listing = (await listingRes.json()) as { id: string; status: string };
    expect(listing.status).toBe('ACTIVE');

    // Capture buyer balance (testuser1) before purchase
    const buyerLogin = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    const buyerBody = (await buyerLogin.json()) as { token: string; balance: number };

    // Clear session cookies set by the priming calls so the UI starts as guest
    await context.clearCookies();

    // Log into the UI as testuser1 and navigate to the marketplace
    await steps.navigateTo('/login');
    await steps.fill('loginEmail', 'LoginPage', TEST_USERS.user1.email);
    await steps.fill('loginPassword', 'LoginPage', TEST_USERS.user1.password);
    await steps.click('loginSubmit', 'LoginPage');
    await steps.verifyPresence('userBalance', 'Shell');

    await steps.navigateTo('/marketplace');
    await steps.verifyPresence('marketplacePage', 'MarketplacePage');

    // Exactly one ACTIVE listing is visible and it has a Buy button
    await steps.verifyCount('listingCards', 'MarketplacePage', { exactly: 1 });
    await steps.verifyCount('listingBuyButtons', 'MarketplacePage', { exactly: 1 });

    // Buy it
    await steps.on('listingBuyButtons', 'MarketplacePage').first().click();

    // Listing disappears from marketplace (it becomes SOLD)
    await steps.verifyCount('listingCards', 'MarketplacePage', { exactly: 0 });

    // Buyer balance decreased by price; seller increased by price — via API
    const buyerAfter = (await (
      await context.request.get(`${FRONTEND}/api/auth/me`, {
        headers: { Authorization: `Bearer ${buyerBody.token}` },
      })
    ).json()) as { balance: number };
    const sellerAfter = (await (
      await context.request.get(`${FRONTEND}/api/auth/me`, {
        headers: { Authorization: `Bearer ${sellerBody.token}` },
      })
    ).json()) as { balance: number };

    expect(buyerAfter.balance).toBeCloseTo(buyerBody.balance - listPrice, 2);
    expect(sellerAfter.balance).toBeCloseTo(sellerBody.balance + listPrice, 2);
  });

  test('own listing does not expose a Buy button to the seller', async ({ context, steps }) => {
    // Seed: testuser1 lists book-004 at $8
    const meRes = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    const { token } = (await meRes.json()) as { token: string };
    const listRes = await context.request.post(`${FRONTEND}/api/marketplace/listings`, {
      data: { bookId: 'book-004', condition: 'GOOD', price: 8 },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();

    await context.clearCookies();

    // Log into the UI as the same user
    await steps.navigateTo('/login');
    await steps.fill('loginEmail', 'LoginPage', TEST_USERS.user1.email);
    await steps.fill('loginPassword', 'LoginPage', TEST_USERS.user1.password);
    await steps.click('loginSubmit', 'LoginPage');
    await steps.verifyPresence('userBalance', 'Shell');

    await steps.navigateTo('/marketplace');
    await steps.verifyPresence('marketplacePage', 'MarketplacePage');

    // The own listing is visible, but no Buy button is rendered on it
    await steps.verifyCount('listingCards', 'MarketplacePage', { greaterThan: 0 });
    await steps.verifyCount('listingBuyButtons', 'MarketplacePage', { exactly: 0 });
  });
});
