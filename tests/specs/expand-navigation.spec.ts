import { test, expect } from '../fixtures/base';
import { resetAndSeed } from '../helpers/api';

const EXPECTED_COUNTS: Record<string, { chip: string; count: number }> = {
  genreFilterFiction: { chip: 'Fiction', count: 8 },
  genreFilterSciFi: { chip: 'Sci-Fi', count: 9 },
  genreFilterNonFiction: { chip: 'Non-Fiction', count: 8 },
  genreFilterBiography: { chip: 'Biography', count: 8 },
  genreFilterFantasy: { chip: 'Fantasy', count: 8 },
  genreFilterMystery: { chip: 'Mystery', count: 9 },
};

test.describe('Expansion — navigation & routing', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  for (const [element, { chip, count }] of Object.entries(EXPECTED_COUNTS)) {
    test(`sidebar ${chip} filter shows exactly the ${chip} books`, async ({ steps, page }) => {
      await steps.navigateTo('/');
      await steps.click(element, 'Shell');
      await expect(page).toHaveURL(new RegExp(`genre=${encodeURIComponent(chip)}`));
      await steps.verifyCount('bookCards', 'HomePage', { exactly: count });
      const genres = await steps.getAll('bookGenres', 'HomePage');
      for (const g of genres) expect(g.trim()).toBe(chip);
    });
  }

  test('clicking a book card navigates to its detail page', async ({ page, steps }) => {
    await steps.navigateTo('/');
    await steps.click('bookCardBook001', 'HomePage');
    await expect(page).toHaveURL(/\/books\/book-001$/);
    await steps.verifyPresence('bookDetailPage', 'BookDetailPage');
    await steps.verifyText('bookDetailTitle', 'BookDetailPage', 'To Kill a Mockingbird');
  });

  test('pagination Next is disabled on the last page (5/5)', async ({ steps }) => {
    await steps.navigateTo('/');
    // Click Next until we reach page 5, then verify the button disables
    for (let i = 0; i < 4; i++) {
      await steps.click('paginationNext', 'HomePage');
    }
    await steps.verifyTextContains('paginationInfo', 'HomePage', '5 / 5');
    await steps.verifyState('paginationNext', 'HomePage', 'disabled');
  });

  test('unknown route renders the shell with an empty main area', async ({ steps, page }) => {
    await steps.navigateTo('/this-route-does-not-exist-404');
    await steps.verifyPresence('sidebar', 'Shell');
    // No route-level page testid (homePage / cartPage / etc.) is present
    await steps.verifyAbsence('homePage', 'HomePage');
    const mainText = await page.locator('main').innerText();
    expect(mainText.trim()).toBe('');
  });
});
