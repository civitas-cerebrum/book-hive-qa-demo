import { test, expect } from '../fixtures/base';

const FRONTEND = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

test.describe('Expansion — API authentication guardrails', () => {
  const PROTECTED: Array<{ method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; data?: unknown }> = [
    { method: 'GET', path: '/api/auth/me' },
    { method: 'GET', path: '/api/cart' },
    { method: 'POST', path: '/api/cart/items', data: { bookId: 'book-001', quantity: 1 } },
    { method: 'GET', path: '/api/orders' },
    { method: 'POST', path: '/api/orders' },
    { method: 'POST', path: '/api/marketplace/listings', data: { bookId: 'book-001', condition: 'GOOD', price: 5 } },
  ];

  for (const { method, path, data } of PROTECTED) {
    test(`${method} ${path} rejects an unauthenticated request`, async ({ page }) => {
      // Playwright's context.request won't inherit a cookie jar we haven't set,
      // but to be safe we issue the call in a guest browser context.
      await page.goto(`${FRONTEND}/`);
      const res = await page.evaluate(
        async ({ m, p, d }) => {
          const r = await fetch(p, {
            method: m,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'omit',
            body: d ? JSON.stringify(d) : undefined,
          });
          return { status: r.status };
        },
        { m: method, p: path, d: data },
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  }

  test('public endpoints do NOT require authentication', async ({ page }) => {
    await page.goto(`${FRONTEND}/`);
    const results = await page.evaluate(async () => {
      const calls = [
        { method: 'GET', path: '/api/health' },
        { method: 'GET', path: '/api/books' },
        { method: 'GET', path: '/api/books/book-001' },
        { method: 'GET', path: '/api/marketplace' },
      ];
      const out: Array<{ path: string; status: number }> = [];
      for (const c of calls) {
        const r = await fetch(c.path, { method: c.method, credentials: 'omit' });
        out.push({ path: c.path, status: r.status });
      }
      return out;
    });
    for (const r of results) expect(r.status, `${r.path} should be 200`).toBe(200);
  });
});
