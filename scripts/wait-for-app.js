#!/usr/bin/env node
/**
 * Polls the BookHive stack until /api/health responds 200 and /api/seed
 * has populated the catalogue. Used by `npm run app:up` so the test run
 * doesn't race the container startup.
 */
const http = require('http');

const API_URL = process.env.BOOKHIVE_API_URL ?? 'http://localhost:8080';
const MAX_SECONDS = 120;

function get(path) {
  return new Promise((resolve, reject) => {
    http
      .get(`${API_URL}${path}`, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      })
      .on('error', reject);
  });
}

function post(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${API_URL}${path}`,
      { method: 'POST', headers: { 'Content-Length': 0 } },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function waitForApp() {
  process.stdout.write('Waiting for BookHive');
  for (let i = 0; i < MAX_SECONDS; i++) {
    try {
      const res = await get('/api/health');
      if (res.status === 200) {
        process.stdout.write(` up after ${i}s — seeding...\n`);
        const seed = await post('/api/seed');
        if (seed.status === 200) {
          console.log('seeded.');
          return;
        }
        throw new Error(`seed failed: ${seed.status} ${seed.body}`);
      }
    } catch {}
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`BookHive did not come up within ${MAX_SECONDS}s`);
}

if (require.main === module) {
  waitForApp().catch((err) => {
    console.error('\n' + err.message);
    process.exit(1);
  });
}

module.exports = { waitForApp };
