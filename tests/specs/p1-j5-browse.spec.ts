import { test, expect } from '../fixtures/base';
import { resetAndSeed } from '../helpers/api';

test.describe('J5 — Browse / filter / search / paginate (P1)', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('default landing shows 12 books and 5 pages', async ({ steps }) => {
    await steps.navigateTo('/');
    await steps.verifyPresence('homePage', 'HomePage');
    await steps.verifyCount('bookCards', 'HomePage', { exactly: 12 });
    await steps.verifyTextContains('paginationInfo', 'HomePage', '1 / 5');
  });

  test('Fantasy filter narrows the grid to the 8 Fantasy books', async ({ steps }) => {
    await steps.navigateTo('/');
    // Desktop filters the catalog via the sidebar link; the genre-chip row is mobile-only.
    await steps.click('genreFilterFantasy', 'Shell');

    // All visible cards must be Fantasy
    await steps.verifyCount('bookCards', 'HomePage', { exactly: 8 });
    const genres = await steps.getAll('bookGenres', 'HomePage');
    expect(genres.length).toBe(8);
    for (const g of genres) expect(g.trim()).toBe('Fantasy');
  });

  test('pagination Next increments the page and enables Previous', async ({ steps }) => {
    await steps.navigateTo('/');
    await steps.verifyTextContains('paginationInfo', 'HomePage', '1 / 5');

    await steps.click('paginationNext', 'HomePage');
    await steps.verifyTextContains('paginationInfo', 'HomePage', '2 / 5');
    await steps.verifyState('paginationPrevious', 'HomePage', 'enabled');
  });

  test('search filters the grid by query (keystroke-driven debounce)', async ({ steps }) => {
    await steps.navigateTo('/');
    // React's controlled input needs actual keystrokes to fire the debounced fetch,
    // so use typeSequentially (one character at a time) rather than fill().
    await steps.click('searchInput', 'HomePage');
    await steps.typeSequentially('searchInput', 'HomePage', 'gatsby', 50);

    // Only The Great Gatsby (book-002) should remain
    await steps.verifyCount('bookCards', 'HomePage', { exactly: 1 });
    const titles = await steps.getAll('bookTitles', 'HomePage');
    expect(titles[0]).toContain('The Great Gatsby');
  });
});
