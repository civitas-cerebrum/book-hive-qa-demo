import { test, expect } from '../fixtures/base';
import { TEST_USERS, resetAndSeed } from '../helpers/api';

test.describe('J11 — Logout clears session (P3)', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('after logout, gated routes redirect back to /login', async ({ page, steps }) => {
    await steps.navigateTo('/login');
    await steps.fill('loginEmail', 'LoginPage', TEST_USERS.user1.email);
    await steps.fill('loginPassword', 'LoginPage', TEST_USERS.user1.password);
    await steps.click('loginSubmit', 'LoginPage');
    await steps.verifyPresence('userBalance', 'Shell');

    await steps.click('logoutBtn', 'Shell');
    await steps.verifyPresence('navLogin', 'Shell');
    await steps.verifyPresence('navSignup', 'Shell');
    await steps.verifyAbsence('userBalance', 'Shell');

    // Hitting any gated route now lands on /login
    await steps.navigateTo('/cart');
    await expect(page).toHaveURL(/\/login$/);
  });
});
