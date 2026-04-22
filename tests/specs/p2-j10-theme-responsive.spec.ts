import { test, expect } from '../fixtures/base';

test.describe('J10 — Theme toggle + responsive layout (P2)', () => {
  test('theme toggle flips data-theme on <html> and persists via localStorage', async ({
    page,
    steps,
  }) => {
    await steps.navigateTo('/');
    const initial = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(['light', 'dark']).toContain(initial);

    await steps.click('themeToggle', 'Shell');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
      .not.toBe(initial);

    const flipped = await page.evaluate(() => document.documentElement.dataset.theme);
    const stored = await page.evaluate(() => localStorage.getItem('bookhive_theme'));
    expect(stored).toBe(flipped);

    // Survives a reload
    await steps.navigateTo('/');
    const afterReload = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(afterReload).toBe(flipped);
  });

  test('mobile viewport exposes the topbar hamburger and mobile buttons', async ({
    steps,
  }) => {
    await steps.setViewport(400, 800);
    await steps.navigateTo('/');
    await steps.verifyState('topbar', 'Shell', 'visible');
    await steps.verifyState('sidebarToggle', 'Shell', 'visible');
    await steps.verifyState('mobileSearchBtn', 'Shell', 'visible');
    await steps.verifyState('mobileCartBtn', 'Shell', 'visible');
  });
});
