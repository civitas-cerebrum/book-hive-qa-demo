import { test, expect } from '../fixtures/base';

test.describe('J12 — Invalid login error (P3)', () => {
  test('bad credentials render login-error and keep the user on /login', async ({
    page,
    steps,
  }) => {
    await steps.navigateTo('/login');
    await steps.fill('loginEmail', 'LoginPage', 'no-such-user@bookhive.test');
    await steps.fill('loginPassword', 'LoginPage', 'wrong-password');
    await steps.click('loginSubmit', 'LoginPage');

    await steps.verifyPresence('loginError', 'LoginPage');
    await steps.verifyTextContains('loginError', 'LoginPage', 'Invalid');
    await expect(page).toHaveURL(/\/login$/);
  });
});
