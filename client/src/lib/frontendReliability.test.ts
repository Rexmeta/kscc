import assert from 'node:assert/strict';
import test from 'node:test';
import { getPageNumbers } from '@/components/PagePagination';
import { getEventRegistrationState } from './eventRegistrationState';
import { ApiRequestError, fetchJson } from './queryClient';
import { formatLocalizedNumber, getCurrentLanguage, getLocale, setLanguage } from './i18n';

test('pagination keeps the current page visible when navigating past page five', () => {
  assert.deepEqual(getPageNumbers(1, 10), [1, 2, 3, 4, 5]);
  assert.deepEqual(getPageNumbers(6, 10), [4, 5, 6, 7, 8]);
  assert.deepEqual(getPageNumbers(10, 10), [6, 7, 8, 9, 10]);
});

test('event registration state blocks registered, closed, and full events', () => {
  assert.equal(getEventRegistrationState({
    isRegistered: true,
    isPastEvent: false,
    isRegistrationClosed: false,
    capacity: 10,
    registrationCount: 2,
  }), 'registered');
  assert.equal(getEventRegistrationState({
    isRegistered: false,
    isPastEvent: false,
    isRegistrationClosed: true,
    capacity: 10,
    registrationCount: 2,
  }), 'closed');
  assert.equal(getEventRegistrationState({
    isRegistered: false,
    isPastEvent: false,
    isRegistrationClosed: false,
    capacity: 10,
    registrationCount: 10,
  }), 'full');
  assert.equal(getEventRegistrationState({
    isRegistered: false,
    isPastEvent: false,
    isRegistrationClosed: false,
    capacity: 0,
  }), 'available');
});

test('shared JSON fetch handling rejects HTTP failures instead of returning empty data', async () => {
  const previousFetch = globalThis.fetch;
  const previousStorage = (globalThis as any).localStorage;
  (globalThis as any).localStorage = { getItem: () => null };
  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });

  await assert.rejects(
    () => fetchJson('/api/private'),
    (error: unknown) => error instanceof ApiRequestError && error.status === 403,
  );

  globalThis.fetch = previousFetch;
  (globalThis as any).localStorage = previousStorage;
});

test('language switching updates the active locale used by presentation helpers', () => {
  const previousStorage = (globalThis as any).localStorage;
  const previousDocument = (globalThis as any).document;
  (globalThis as any).localStorage = { setItem: () => undefined };
  (globalThis as any).document = { documentElement: { lang: '', className: '' } };

  setLanguage('zh', false);
  assert.equal(getCurrentLanguage(), 'zh');
  assert.equal(getLocale(), 'zh-CN');

  setLanguage('ko', false);
  (globalThis as any).localStorage = previousStorage;
  (globalThis as any).document = previousDocument;
});

test('number formatting does not crash when an API count is temporarily unavailable', () => {
  assert.equal(formatLocalizedNumber(undefined, 'ko'), '—');
  assert.equal(formatLocalizedNumber(null, 'en'), '—');
  assert.equal(formatLocalizedNumber(Number.NaN, 'zh'), '—');
  assert.equal(formatLocalizedNumber(1234, 'ko'), '1,234');
});