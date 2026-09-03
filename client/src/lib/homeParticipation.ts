import type { PostWithTranslations, SurveySettings } from '@shared/schema';

export type HomeSurvey = Pick<
  SurveySettings,
  'id' | 'title' | 'description' | 'externalUrl' | 'isActive' | 'startsAt' | 'endsAt'
>;

export type HomeParticipationItem =
  | {
      kind: 'event';
      id: string;
      post: PostWithTranslations;
      sortTimestamp: number | null;
      stableIndex: number;
    }
  | {
      kind: 'survey';
      id: string;
      survey: HomeSurvey;
      sortTimestamp: number | null;
      stableIndex: number;
    };

export function getHomeParticipationTimestamp(value: unknown): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }

  if (typeof value !== 'string' || !value.trim()) return null;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

/**
 * Sort dated cards first by their start time, while keeping the source order
 * deterministic for undated cards and ties.
 */
export function sortHomeParticipationItems(
  items: HomeParticipationItem[],
): HomeParticipationItem[] {
  return [...items].sort((left, right) => {
    if (left.sortTimestamp === null && right.sortTimestamp !== null) return 1;
    if (left.sortTimestamp !== null && right.sortTimestamp === null) return -1;

    if (
      left.sortTimestamp !== null
      && right.sortTimestamp !== null
      && left.sortTimestamp !== right.sortTimestamp
    ) {
      return left.sortTimestamp - right.sortTimestamp;
    }

    return left.stableIndex - right.stableIndex;
  });
}