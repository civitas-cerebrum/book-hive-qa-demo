import { test, expect } from '../fixtures/base';
import { resetAndSeed } from '../helpers/api';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('J3 — Sign up + starter balance (P0)', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('new user lands authenticated on profile with a starter balance', async ({
    page,
    context,
    steps,
  }) => {
    const suffix = `${Date.now()}`;
    const username = `newu${suffix}`;
    const email = `${username}@bookhive.test`;
    const password = 'Test1234!';

    await steps.navigateTo('/signup');
    await steps.verifyPresence('signupPage', 'SignupPage');
    await steps.fill('signupUsername', 'SignupPage', username);
    await steps.fill('signupEmail', 'SignupPage', email);
    await steps.fill('signupPassword', 'SignupPage', password);
    await steps.click('signupSubmit', 'SignupPage');

    // Auto-login should redirect away from /signup
    await expect(page).not.toHaveURL(/\/signup$/);

    // Authed nav must be present
    await steps.verifyPresence('navProfile', 'Shell');
    await steps.verifyPresence('logoutBtn', 'Shell');
    await steps.verifyPresence('userBalance', 'Shell');

    // Profile page reflects the new user's identity and starter balance
    await steps.navigateTo('/profile');
    await steps.verifyText('profileUsername', 'ProfilePage', username);
    await steps.verifyText('profileEmail', 'ProfilePage', email);
    const balText = await steps.getText('profileBalance', 'ProfilePage');
    const balance = parseFloat(balText.replace(/[^0-9.]/g, ''));
    expect(balance).toBeGreaterThan(0);

    // Same value via /api/auth/me (session cookie is set by signup)
    const meRes = await context.request.get(`${FRONTEND}/api/auth/me`);
    expect(meRes.ok()).toBeTruthy();
    const me = (await meRes.json()) as { email: string; balance: number };
    expect(me.email).toBe(email);
    expect(me.balance).toBeCloseTo(balance, 2);
  });

  test('duplicate email is rejected on the signup page', async ({ page, context, steps }) => {
    // Prime a user via API
    const suffix = `${Date.now()}`;
    const username = `dup${suffix}`;
    const email = `${username}@bookhive.test`;
    const password = 'Test1234!';
    const first = await context.request.post(`${FRONTEND}/api/auth/signup`, {
      data: { username, email, password },
    });
    expect(first.ok()).toBeTruthy();

    // Clear the session cookie set by the prime call so we're back to guest state
    await context.clearCookies();

    await steps.navigateTo('/signup');
    await steps.fill('signupUsername', 'SignupPage', `${username}_other`);
    await steps.fill('signupEmail', 'SignupPage', email); // same email as prime
    await steps.fill('signupPassword', 'SignupPage', password);
    await steps.click('signupSubmit', 'SignupPage');

    // Must stay on /signup with an error surfaced
    await expect(page).toHaveURL(/\/signup$/);
    await steps.verifyPresence('signupError', 'SignupPage');
  });
});
