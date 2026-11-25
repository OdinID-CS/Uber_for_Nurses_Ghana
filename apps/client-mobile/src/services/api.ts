import { io, Socket } from 'socket.io-client';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchQuote(serviceId: string, landmark: string, durationMinutes = 60) {
  const res = await fetch(`${API_BASE}/v1/care-requests/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId,
      scheduledStart: new Date(Date.now() + 3600000).toISOString(),
      location: { latitude: 5.5801, longitude: -0.1712 },
      landmark,
      durationMinutes,
    }),
  });
  if (!res.ok) throw new Error('Failed to fetch quote');
  return res.json();
}

export async function submitCareRequest(params: {
  quoteId: string;
  serviceId: string;
  recipientDisplayName: string;
  recipientPhone: string;
  landmark: string;
  careSummary: string;
}) {
  const idempotencyKey = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const res = await fetch(`${API_BASE}/v1/care-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({
      quoteId: params.quoteId,
      serviceId: params.serviceId,
      scheduledStart: new Date(Date.now() + 3600000).toISOString(),
      durationMinutes: 60,
      location: { latitude: 5.5801, longitude: -0.1712 },
      addressPrivate: params.landmark,
      landmark: params.landmark,
      careSummaryPrivate: params.careSummary,
      recipientDisplayName: params.recipientDisplayName,
      recipientPhone: params.recipientPhone,
    }),
  });
  if (!res.ok) throw new Error('Failed to submit care request');
  return res.json();
}

export async function fetchBooking(bookingId: string) {
  const res = await fetch(`${API_BASE}/v1/bookings/${bookingId}`);
  if (!res.ok) throw new Error('Failed to fetch booking');
  return res.json();
}

export function subscribeToBookingUpdates(
  bookingId: string,
  onUpdate: (data: any) => void,
): Socket {
  const socket = io(API_BASE, { transports: ['websocket', 'polling'] });
  socket.on('connect', () => {
    socket.emit('join:booking', { bookingId });
  });
  socket.on('booking.status.changed', (data: any) => {
    if (data.bookingId === bookingId) {
      onUpdate(data);
    }
  });
  return socket;
}

