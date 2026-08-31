import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchPublicPartners } from './publicPartners';

test('public partner loader extracts partners from the paginated API response', async () => {
  const originalFetch = globalThis.fetch;
  const partners = [{ id: 'partner-1', name: 'Partner One' }];
  globalThis.fetch = async () => new Response(JSON.stringify({
    partners,
    total: 1,
    page: 1,
    totalPages: 1,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    assert.deepEqual(await fetchPublicPartners(), partners);
  } finally {
    globalThis.fetch = originalFetch;
  }
});