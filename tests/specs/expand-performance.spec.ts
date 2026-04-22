import { test, expect } from '../fixtures/base';

test.describe('Expansion — performance smoke (P0 entry page)', () => {
  test('home loads and renders the grid within 5 seconds', async ({ steps }) => {
    const start = Date.now();
    await steps.navigateTo('/');
    await steps.verifyPresence('bookGrid', 'HomePage');
    // First book card must be present, proving the grid hydrated
    await steps.verifyPresence('bookCardBook001', 'HomePage');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
