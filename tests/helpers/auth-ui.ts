import { APIRequestContext, BrowserContext, Page } from '@playwright/test';
import { TEST_USERS } from './api';

export type KnownUser = keyof typeof TEST_USERS;

const FRONTEND_BASE = process.env.BOOKHIVE_URL ?? 'http://localhost:7547';

/**
 * Logs in via the frontend proxy (Set-Cookie lands in the browser's jar),
 * then returns the bearer token so specs can assert against the API.
 */
export async function loginViaCookie(
  context: BrowserContext,
  user: KnownUser = 'user1',
): Promise<{ token: string; userId: string }> {
  const { email, password } = TEST_USERS[user];
  const req = await context.request.post(`${FRONTEND_BASE}/api/auth/login`, {
    data: { email, password },
  });
  if (!req.ok()) throw new Error(`login failed: ${req.status()} ${await req.text()}`);
  const body = (await req.json()) as { token: string; user: { id: string } };
  return { token: body.token, userId: body.user.id };
}

export async function authedRequest(
  context: BrowserContext,
  token: string,
  path: string,
  init: { method?: string; data?: unknown } = {},
): Promise<APIRequestContext extends never ? never : unknown> {
  const res = await context.request.fetch(`${FRONTEND_BASE}${path}`, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}` },
    data: init.data as any,
  });
  if (!res.ok()) throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export async function gotoAuthed(
  page: Page,
  context: BrowserContext,
  url: string,
  user: KnownUser = 'user1',
): Promise<{ token: string; userId: string }> {
  const creds = await loginViaCookie(context, user);
  await page.goto(url);
  return creds;
}
