import { test, expect } from '../fixtures/base';
import { TEST_USERS, resetAndSeed } from '../helpers/api';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('J7 — Cancel own listing (P1)', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('cancelling from profile removes the listing from profile and marketplace', async ({
    context,
    steps,
  }) => {
    // Seed a listing for testuser1 via API so the test focuses on cancel
    const login = await context.request.post(`${FRONTEND}/api/auth/login`, {
      data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
    });
    const { token, userId } = (await login.json()) as { token: string; userId: string };
    const created = (await (
      await context.request.post(`${FRONTEND}/api/marketplace/listings`, {
        data: { bookId: 'book-020', condition: 'FAIR', price: 5.55 },
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()) as { id: string; status: string };
    expect(created.status).toBe('ACTIVE');

    await context.clearCookies();

    // UI log-in and navigate to profile
    await steps.navigateTo('/login');
    await steps.fill('loginEmail', 'LoginPage', TEST_USERS.user1.email);
    await steps.fill('loginPassword', 'LoginPage', TEST_USERS.user1.password);
    await steps.click('loginSubmit', 'LoginPage');
    await steps.verifyPresence('userBalance', 'Shell');

    await steps.navigateTo('/profile');
    await steps.verifyCount('myListings', 'ProfilePage', { exactly: 1 });

    // Cancel the listing
    await steps.click('cancelListingButtons', 'ProfilePage');

    // Profile now shows the no-listings state
    await steps.verifyPresence('noListings', 'ProfilePage');
    await steps.verifyCount('myListings', 'ProfilePage', { exactly: 0 });

    // Marketplace no longer shows it
    await steps.navigateTo('/marketplace');
    await steps.verifyCount('listingCards', 'MarketplacePage', { exactly: 0 });

    // API-assert: no ACTIVE listings for this user
    const listings = (await (
      await context.request.get(`${FRONTEND}/api/marketplace`)
    ).json()) as Array<{ sellerId: string; status: string }>;
    expect(listings.filter((l) => l.sellerId === userId && l.status === 'ACTIVE')).toHaveLength(0);
  });
});
