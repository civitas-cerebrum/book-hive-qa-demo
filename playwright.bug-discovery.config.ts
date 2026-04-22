import baseConfig from './playwright.config';
import { defineConfig } from '@playwright/test';

// Runs only the bug-discovery reproduction tests. They are EXPECTED TO FAIL
// until the corresponding bugs are fixed — do not include them in the default
// green suite.
export default defineConfig({
  ...baseConfig,
  testDir: './tests/bug-discovery',
  reporter: [['list']],
});
