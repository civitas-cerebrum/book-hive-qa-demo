import { test, expect } from '../fixtures/base';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';
import { TEST_USERS, resetAndSeed } from '../helpers/api';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('J6 — Create a marketplace listing (P1)', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('authed user lists a book; it appears on marketplace and profile', async ({
    context,
    steps,
  }) => {
    // Log in via UI
    await steps.navigateTo('/login');
    await steps.fill('loginEmail', 'LoginPage', TEST_USERS.user1.email);
    await steps.fill('loginPassword', 'LoginPage', TEST_USERS.user1.password);
    await steps.click('loginSubmit', 'LoginPage');
    await steps.verifyPresence('userBalance', 'Shell');

    // Fill the create-listing form
    await steps.navigateTo('/marketplace/sell');
    await steps.verifyPresence('createListingPage', 'CreateListingPage');

    await steps.selectDropdown('listingBookSelect', 'CreateListingPage', {
      type: DropdownSelectType.VALUE,
      value: 'book-015',
    });
    await steps.selectDropdown('listingCondition', 'CreateListingPage', {
      type: DropdownSelectType.VALUE,
      value: 'LIKE_NEW',
    });
    await steps.fill('listingPrice', 'CreateListingPage', '9.25');
    await steps.click('listingCreate', 'CreateListingPage');

    // After submit we either land on /marketplace or /profile. Either way:
    // profile must list the listing with a cancel control.
    await steps.navigateTo('/profile');
    await steps.verifyCount('myListings', 'ProfilePage', { exactly: 1 });
    await steps.verifyCount('cancelListingButtons', 'ProfilePage', { exactly: 1 });

    // Marketplace shows the listing with correct price/condition
    await steps.navigateTo('/marketplace');
    await steps.verifyCount('listingCards', 'MarketplacePage', { exactly: 1 });

    // API-assert: exactly one ACTIVE listing owned by testuser1
    const me = (await (
      await context.request.post(`${FRONTEND}/api/auth/login`, {
        data: { email: TEST_USERS.user1.email, password: TEST_USERS.user1.password },
      })
    ).json()) as { token: string; userId: string };

    const listings = (await (
      await context.request.get(`${FRONTEND}/api/marketplace`)
    ).json()) as Array<{ sellerId: string; status: string; price: number; condition: string }>;
    const mine = listings.filter((l) => l.sellerId === me.userId);
    expect(mine).toHaveLength(1);
    expect(mine[0].status).toBe('ACTIVE');
    expect(mine[0].condition).toBe('LIKE_NEW');
    expect(mine[0].price).toBeCloseTo(9.25, 2);
  });
});
