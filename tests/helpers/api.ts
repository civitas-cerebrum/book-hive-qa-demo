const API_URL = process.env.BOOKHIVE_API_URL ?? 'http://localhost:8080';

type FetchLike = typeof fetch;

async function req<T = unknown>(
  path: string,
  init: RequestInit = {},
  fetchImpl: FetchLike = fetch,
): Promise<T> {
  const res = await fetchImpl(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status} ${body}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : ({} as T));
}

export async function resetAndSeed(): Promise<void> {
  await req('/api/reset', { method: 'POST' });
}

export async function seedIfEmpty(): Promise<void> {
  await req('/api/seed', { method: 'POST' });
}

export interface LoginResult {
  token: string;
  user: { id: string; username: string; email: string; balance: number };
}

export async function loginApi(email: string, password: string): Promise<LoginResult> {
  return req<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signupApi(input: {
  username: string;
  email: string;
  password: string;
}): Promise<LoginResult> {
  return req<LoginResult>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getMe(token: string): Promise<LoginResult['user']> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET /api/auth/me → ${res.status}`);
  return res.json() as Promise<LoginResult['user']>;
}

export async function createListingApi(
  token: string,
  input: { bookId: string; condition: 'EXCELLENT' | 'GOOD' | 'FAIR'; price: number },
): Promise<{ id: string; sellerId: string; bookId: string; price: number; status: string }> {
  return req('/api/marketplace/listings', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export const TEST_USERS = {
  user1: { email: 'testuser1@bookhive.test', password: 'Test1234!' },
  user2: { email: 'testuser2@bookhive.test', password: 'Test1234!' },
} as const;
