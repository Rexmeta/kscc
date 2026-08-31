export type EventRegistrationState = 'available' | 'registered' | 'full' | 'closed';

export function getEventRegistrationState({
  isRegistered,
  isPastEvent,
  isRegistrationClosed,
  capacity,
  registrationCount,
}: {
  isRegistered: boolean;
  isPastEvent: boolean;
  isRegistrationClosed: boolean;
  capacity: number | null;
  registrationCount?: number;
}): EventRegistrationState {
  if (isRegistered) return 'registered';
  if (isPastEvent || isRegistrationClosed) return 'closed';
  if (typeof capacity === 'number' && typeof registrationCount === 'number' && registrationCount >= capacity) {
    return 'full';
  }
  return 'available';
}