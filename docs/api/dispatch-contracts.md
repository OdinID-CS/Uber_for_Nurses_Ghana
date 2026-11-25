# Dispatch and Availability Contracts

These contracts define the first client/server boundary for nurse availability and simultaneous dispatch. The server is authoritative for eligibility, offer expiry, and assignment. Mobile clients must treat notifications as prompts to refetch state.

## Shared terms

- All timestamps are ISO-8601 UTC. Nurse schedules also include an IANA timezone.
- Money is integer minor units plus ISO currency (`GHS`); never use floating point.
- Coordinates are WGS84 `{ latitude, longitude }`. Exact client address and health notes are private fields and are never sent in dispatch push payloads.
- Every mutation accepts an `Idempotency-Key` and returns the original result on safe retry.
- IDs are opaque UUIDs. `version` increments on authoritative state changes.

## Nurse availability

`PUT /v1/nurses/me/availability`

```json
{
  "mode": "ONLINE_NOW",
  "serviceZoneIds": ["zone_opaque_id"],
  "maxTravelKm": 12,
  "acceptedServiceIds": ["home_wound_care"],
  "locationConsent": true
}
```

Mode values: `ONLINE_NOW`, `OFFLINE`. Scheduled windows are managed separately by `PUT /v1/nurses/me/availability-blocks` with start/end UTC and the nurse's timezone. The API rejects invalid intervals and overlapping blocks that conflict with confirmed work. `ONLINE_NOW` is heartbeat-bound; going stale turns off immediate offers automatically.

`POST /v1/nurses/me/presence`

```json
{
  "coordinates": { "latitude": 5.6037, "longitude": -0.1870 },
  "capturedAt": "2026-11-24T10:30:00Z",
  "accuracyMeters": 35
}
```

Only accept presence while the nurse has explicitly selected `ONLINE_NOW` or is working an assigned visit. Reject stale/out-of-order samples. Apply a short retention policy to precise location history; retain only coarse operational aggregates where possible.

## Client request and quote

`POST /v1/care-requests/quote`

```json
{
  "serviceId": "home_wound_care",
  "scheduledStart": "2026-11-25T14:00:00Z",
  "location": { "latitude": 5.6037, "longitude": -0.1870 },
  "landmark": "Near the community clinic",
  "durationMinutes": 60
}
```

Response includes itemized integer minor-unit amounts, currency, quote expiry, cancellation terms version, and service description. Do not expose nurse identity at quote stage.

`POST /v1/care-requests`

```json
{
  "quoteId": "quote_uuid",
  "serviceId": "home_wound_care",
  "scheduledStart": "2026-11-25T14:00:00Z",
  "durationMinutes": 60,
  "location": { "latitude": 5.6037, "longitude": -0.1870 },
  "addressPrivate": "House 12, example street",
  "landmark": "Near the community clinic",
  "accessInstructions": "Call on arrival",
  "careSummaryPrivate": "Minimum necessary service-specific context",
  "recipientDisplayName": "Ama"
}
```

Response: `{ bookingId, status: "SEARCHING", version, createdAt }`. Never log request body. Validate service-specific required details server-side and store restricted fields separately from ordinary booking metadata.

## Offer and acceptance

Socket event to each selected nurse:

```json
{
  "eventId": "uuid",
  "type": "dispatch.offer.created",
  "occurredAt": "2026-11-24T10:30:00Z",
  "offer": {
    "offerId": "uuid",
    "bookingId": "uuid",
    "serviceLabel": "Home nursing visit",
    "generalArea": "Cantonments",
    "scheduledStart": "2026-11-25T14:00:00Z",
    "durationMinutes": 60,
    "estimatedTravelMinutes": 18,
    "nurseEarningMinor": 18000,
    "currency": "GHS",
    "requiredSkillLabels": ["Verified wound-care experience"],
    "expiresAt": "2026-11-24T10:30:25Z"
  }
}
```

Do not include exact patient address, name, phone number, or diagnosis. Push notifications contain only a generic new-offer prompt and opaque offer ID.

`POST /v1/offers/{offerId}/accept`

```json
{ "idempotencyKey": "client-generated-uuid" }
```

Responses:

- `200`: accepted and assigned, includes booking version and minimum necessary visit details.
- `409 OFFER_CLOSED`: another nurse accepted, offer expired, or request was cancelled.
- `409 NO_LONGER_ELIGIBLE`: credential/availability/schedule changed; refresh nurse state.

Acceptance performs server-side eligibility revalidation and an atomic winner transaction. First **committed valid server acceptance** wins. On success close every sibling offer in the dispatch round and emit `booking.assigned` through the outbox. Repeated request with same idempotency key returns the same outcome.

`POST /v1/offers/{offerId}/decline` accepts `{ reasonCode? }`; reason is optional and controlled from a finite enum. Do not penalize nurses for declining unsuitable work.

## Booking state and events

```text
QUOTED -> SEARCHING -> ASSIGNED -> EN_ROUTE -> ARRIVED -> IN_PROGRESS -> COMPLETED
                   \-> NO_NURSE_FOUND
Any eligible pre-completion state -> CANCELLED
COMPLETED -> DISPUTED (support workflow only)
```

Status event envelope:

```json
{
  "eventId": "uuid",
  "type": "booking.status.changed",
  "aggregateId": "booking_uuid",
  "version": 4,
  "occurredAt": "2026-11-24T10:31:00Z",
  "data": { "status": "ASSIGNED", "estimatedArrival": "2026-11-25T13:42:00Z" }
}
```

Clients discard duplicate/older versions and call `GET /v1/bookings/{id}` after reconnect. Socket delivery is at-least-once/best-effort, not a source of truth.

## Transaction invariants

1. At most one active assigned nurse per booking.
2. At most one winning acceptance per dispatch round/booking.
3. Offer acceptance is rejected if offer is closed/expired or nurse is no longer eligible.
4. A nurse cannot be assigned overlapping visits, accounting for expected duration and buffers.
5. Every command writes state and an outbox event in the same database transaction.
6. Payment webhook references are unique and signature-verified; a payment callback cannot independently assign a nurse.

Implement winner arbitration with a database transaction and row lock/conditional update, plus a unique partial constraint for active assignments. Redis is not the lock authority.

## Error codes

Stable machine codes include `INVALID_SERVICE`, `INVALID_SCHEDULE`, `LOCATION_REQUIRED`, `QUOTE_EXPIRED`, `OFFER_CLOSED`, `NO_LONGER_ELIGIBLE`, `BOOKING_NOT_CANCELLABLE`, `NO_NURSE_FOUND`, `RATE_LIMITED`, `PAYMENT_PENDING`, `PAYMENT_FAILED`, and `SUPPORT_REQUIRED`. User-facing copy is localized in clients, not leaked from internal exceptions.
