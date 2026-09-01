interface UpcomingEventsSectionState {
  eventCount: number;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Keep the section available for transient query states, but omit it after a
 * successful query confirms there are no upcoming events.
 */
export function shouldRenderUpcomingEvents({
  eventCount,
  isLoading,
  isError,
}: UpcomingEventsSectionState): boolean {
  return isLoading || isError || eventCount > 0;
}