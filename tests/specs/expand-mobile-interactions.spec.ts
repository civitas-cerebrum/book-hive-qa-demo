import { test, expect } from '../fixtures/base';
import { resetAndSeed } from '../helpers/api';

test.describe('Expansion — mobile sidebar toggle', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('sidebar-toggle opens the sidebar on mobile; its nav links are interactive', async ({
    steps,
    page,
  }) => {
    await steps.navigateTo('/');
    await steps.verifyState('topbar', 'Shell', 'visible');
    await steps.verifyState('sidebarToggle', 'Shell', 'visible');

    // On mobile the sidebar is off-canvas. Tap the hamburger to reveal it,
    // then navigate via a genre link and assert the URL.
    await steps.click('sidebarToggle', 'Shell');
    await steps.click('genreFilterMystery', 'Shell');
    await expect(page).toHaveURL(/genre=Mystery/);
    await steps.verifyCount('bookCards', 'HomePage', { exactly: 9 });
  });
});

test.describe('Expansion — search by author', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('search finds books by author name, not just title', async ({ steps }) => {
    await steps.navigateTo('/');
    // Keystroke-driven debounce — fill() doesn't trigger the backend fetch.
    await steps.click('searchInput', 'HomePage');
    await steps.typeSequentially('searchInput', 'HomePage', 'orwell', 50);

    // 1984 is George Orwell's work; Animal Farm is not in the seed,
    // so search for "orwell" should match exactly one book.
    await steps.verifyCount('bookCards', 'HomePage', { exactly: 1 });
    const titles = await steps.getAll('bookTitles', 'HomePage');
    expect(titles[0]).toBe('1984');
  });
});
