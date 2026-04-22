import { test } from '../fixtures/base';
import { resetAndSeed } from '../helpers/api';

test.describe('J9 — Guest views a book detail (P2)', () => {
  test.beforeAll(async () => {
    await resetAndSeed();
  });

  test('detail fields render and Add-to-Cart is NOT exposed to guests', async ({ steps }) => {
    await steps.navigateTo('/books/book-001');
    await steps.verifyPresence('bookDetailPage', 'BookDetailPage');
    await steps.verifyText('bookDetailTitle', 'BookDetailPage', 'To Kill a Mockingbird');
    await steps.verifyText('bookDetailAuthor', 'BookDetailPage', 'Harper Lee');
    await steps.verifyText('bookDetailGenre', 'BookDetailPage', 'Fiction');
    await steps.verifyText('bookDetailDescription', 'BookDetailPage');
    await steps.verifyText('bookDetailPrice', 'BookDetailPage', '$12.99');
    await steps.verifyText('bookDetailStock', 'BookDetailPage');

    // Guest-state assertion: no Add-to-Cart button, and the guest nav links exist
    await steps.verifyAbsence('addToCartDetail', 'BookDetailPage');
    await steps.verifyPresence('navLogin', 'Shell');
    await steps.verifyPresence('navSignup', 'Shell');
  });
});
