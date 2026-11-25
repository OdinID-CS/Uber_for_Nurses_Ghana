import { io, Socket } from 'socket.io-client';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export async function setNurseAvailability(nurseId: string, mode: 'ONLINE_NOW' | 'OFFLINE') {
  const res = await fetch(`${API_BASE}/v1/nurses/me/availability`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-nurse-id': nurseId,
    },
    body: JSON.stringify({
      mode,
      serviceZoneIds: ['accra_metro', 'cantonments'],
      maxTravelKm: 15,
      acceptedServiceIds: ['home_wound_care', 'post_discharge_support', 'older_adult_support'],
      locationConsent: mode === 'ONLINE_NOW',
    }),
  });
  if (!res.ok) throw new Error('Failed to update availability');
  return res.json();
}

export async function acceptOfferApi(offerId: string, nurseId: string) {
  const idempotencyKey = `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const res = await fetch(`${API_BASE}/v1/offers/${offerId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-nurse-id': nurseId,
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({ idempotencyKey }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Failed to accept offer');
  }
  return res.json();
}

export async function declineOfferApi(offerId: string, nurseId: string, reasonCode = 'UNAVAILABLE') {
  const res = await fetch(`${API_BASE}/v1/offers/${offerId}/decline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-nurse-id': nurseId,
    },
    body: JSON.stringify({ reasonCode }),
  });
  if (!res.ok) throw new Error('Failed to decline offer');
  return res.json();
}

export async function checkInWithPinApi(bookingId: string, pin: string) {
  const res = await fetch(`${API_BASE}/v1/bookings/${bookingId}/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Invalid Visit PIN');
  }
  return res.json();
}

export async function checkOutVisitApi(
  bookingId: string,
  clinicalSummary: {
    vitals: { bloodPressure?: string; heartRateBpm?: number; temperatureCelsius?: number };
    procedureSummary: string;
    woundDressingType?: string;
    patientObservations: string;
    escalationRequired: boolean;
  },
) {
  const res = await fetch(`${API_BASE}/v1/bookings/${bookingId}/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clinicalSummary),
  });
  if (!res.ok) throw new Error('Failed to check out visit');
  return res.json();
}

export function subscribeToNurseOffers(
  nurseId: string,
  onOffer: (offer: any) => void,
  onClosed: (data: any) => void,
): Socket {
  const socket = io(API_BASE, { transports: ['websocket', 'polling'] });
  socket.on('connect', () => {
    socket.emit('join:nurse', { nurseId });
  });
  socket.on('dispatch.offer.created', (offer: any) => {
    onOffer(offer);
  });
  socket.on('dispatch.offer.closed', (data: any) => {
    onClosed(data);
  });
  return socket;
}

