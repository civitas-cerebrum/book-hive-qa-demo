import { test, expect } from '../fixtures/base';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('Bug Discovery — context-derived observations', () => {
  /**
   * @bug BUG-006
   * @severity No impact (DOM-only)
   * @visibility dom-only
   * @phase 4
   * @steps
   * 1. Open any guest page (e.g. /).
   * 2. Capture console errors.
   * @observation Every guest page load fires a GET /api/auth/me that
   *   returns 403 because the user is not authenticated. The frontend
   *   handles the response correctly (renders guest nav) but the failed
   *   request shows up as an error in Devtools on every load, which is
   *   noisy for anyone inspecting the app. Consider swallowing the 403
   *   for the guest-bootstrap fetch, or using a dedicated endpoint that
   *   returns 200 + null when there is no session.
   */
  test('@dom-only guest page load should not log any console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`${FRONTEND}/`);
    await page.waitForLoadState('networkidle');

    expect(
      errors,
      `guest page load logged errors: ${errors.join(' | ')}`,
    ).toHaveLength(0);
  });
});
