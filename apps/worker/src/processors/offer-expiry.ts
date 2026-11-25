import { OfferExpireJobData } from '../types/jobs';

export interface BookingStateSnapshot {
  id: string;
  status: 'SEARCHING' | 'ASSIGNED' | 'CANCELLED' | 'NO_NURSE_FOUND';
  roundId: string;
}

export interface ExpiryResult {
  bookingId: string;
  action: 'IGNORED_ALREADY_ASSIGNED' | 'WIDEN_COHORT' | 'TRANSITION_NO_NURSE_FOUND';
  newSequence?: number;
  newRadiusKm?: number;
}

export function processOfferExpiry(
  data: OfferExpireJobData,
  getBookingSnapshot: (id: string) => BookingStateSnapshot | undefined,
): ExpiryResult {
  const booking = getBookingSnapshot(data.bookingId);
  if (!booking || booking.status !== 'SEARCHING') {
    return {
      bookingId: data.bookingId,
      action: 'IGNORED_ALREADY_ASSIGNED',
    };
  }

  const MAX_DISPATCH_ROUNDS = 3;

  if (data.sequence < MAX_DISPATCH_ROUNDS) {
    const newSequence = data.sequence + 1;
    const newRadiusKm = data.radiusKm + 5; // Widen search radius by 5 km (10km -> 15km -> 20km)

    return {
      bookingId: data.bookingId,
      action: 'WIDEN_COHORT',
      newSequence,
      newRadiusKm,
    };
  }

  // Final round expired with no nurse acceptance
  return {
    bookingId: data.bookingId,
    action: 'TRANSITION_NO_NURSE_FOUND',
  };
}

