import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getHomeParticipationTimestamp,
  sortHomeParticipationItems,
  type HomeParticipationItem,
} from './homeParticipation';
import type { PostWithTranslations } from '@shared/schema';

function item(
  kind: HomeParticipationItem['kind'],
  id: string,
  sortTimestamp: number | null,
  stableIndex: number,
): HomeParticipationItem {
  if (kind === 'event') {
    return {
      kind,
      id,
      post: { id } as PostWithTranslations,
      sortTimestamp,
      stableIndex,
    };
  }

  return {
    kind,
    id,
    survey: {
      id,
      title: id,
      description: '',
      externalUrl: null,
      isActive: true,
      startsAt: null,
      endsAt: null,
    },
    sortTimestamp,
    stableIndex,
  };
}

test('home participation timestamps accept valid dates and reject invalid values', () => {
  assert.equal(
    getHomeParticipationTimestamp('2026-09-03T09:00:00.000Z'),
    Date.parse('2026-09-03T09:00:00.000Z'),
  );
  assert.equal(
    getHomeParticipationTimestamp(new Date('2026-09-03T09:00:00.000Z')),
    Date.parse('2026-09-03T09:00:00.000Z'),
  );
  assert.equal(getHomeParticipationTimestamp('not-a-date'), null);
  assert.equal(getHomeParticipationTimestamp(''), null);
});

test('home participation cards sort events and surveys together by start time', () => {
  const cards = [
    item('survey', 'survey-later', Date.parse('2026-09-08T00:00:00.000Z'), 3),
    item('event', 'event-first', Date.parse('2026-09-04T00:00:00.000Z'), 0),
    item('survey', 'survey-first', Date.parse('2026-09-03T00:00:00.000Z'), 2),
    item('event', 'event-later', Date.parse('2026-09-07T00:00:00.000Z'), 1),
  ];

  assert.deepEqual(
    sortHomeParticipationItems(cards).map(({ kind, id }) => `${kind}:${id}`),
    [
      'survey:survey-first',
      'event:event-first',
      'event:event-later',
      'survey:survey-later',
    ],
  );
});

test('undated and equally dated cards keep deterministic source order', () => {
  const sameTimestamp = Date.parse('2026-09-03T00:00:00.000Z');
  const cards = [
    item('survey', 'undated-first', null, 0),
    item('event', 'dated-second', sameTimestamp, 1),
    item('survey', 'dated-first', sameTimestamp, 2),
    item('event', 'undated-second', null, 3),
  ];

  assert.deepEqual(
    sortHomeParticipationItems(cards).map(({ id }) => id),
    ['dated-second', 'dated-first', 'undated-first', 'undated-second'],
  );
});