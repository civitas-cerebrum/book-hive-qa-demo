import path from 'path';
import { test as base, expect } from '@playwright/test';
import { baseFixture } from '@civitas-cerebrum/element-interactions';

const repoPath = path.resolve(__dirname, '../data/page-repository.json');

export const test = baseFixture(base, repoPath, {
  timeout: 15_000,
  screenshotOnFailure: true,
});

export { expect };
