import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MemoryStore } from '../src/domain/store';

describe('Uber for Nurses Dispatch & Clinical Safety API (e2e)', () => {
  let app: INestApplication;
  let store: MemoryStore;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    store = app.get<MemoryStore>(MemoryStore);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /health returns status ok', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('uber-for-nurses-api');
  });

  it('PUT /v1/nurses/me/availability updates nurse mode and settings', async () => {
    const res = await request(app.getHttpServer())
      .put('/v1/nurses/me/availability')
      .set('x-nurse-id', 'nurse-florence-01')
      .send({
        mode: 'ONLINE_NOW',
        serviceZoneIds: ['accra_metro', 'cantonments'],
        maxTravelKm: 12,
        acceptedServiceIds: ['home_wound_care'],
        locationConsent: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('ONLINE_NOW');
    expect(res.body.locationConsent).toBe(true);
    expect(res.body.nurseId).toBe('nurse-florence-01');
  });

  it('POST /v1/nurses/me/presence records nurse location coordinates', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/nurses/me/presence')
      .set('x-nurse-id', 'nurse-florence-01')
      .send({
        coordinates: { latitude: 5.6037, longitude: -0.187 },
        capturedAt: '2026-11-24T10:30:00Z',
        accuracyMeters: 25,
      });

    expect(res.status).toBe(200);
    expect(res.body.coordinates.latitude).toBe(5.6037);
    expect(res.body.accuracyMeters).toBe(25);
  });

  it('Completes the full booking, dispatch, PIN check-in, clinical check-out, and split payout', async () => {
    // 1. Client requests a quote
    const quoteRes = await request(app.getHttpServer())
      .post('/v1/care-requests/quote')
      .send({
        serviceId: 'home_wound_care',
        scheduledStart: '2026-11-25T14:00:00Z',
        location: { latitude: 5.5801, longitude: -0.1712 },
        landmark: 'Near Cantonments Post Office',
        durationMinutes: 60,
      });

    expect(quoteRes.status).toBe(200);
    expect(quoteRes.body.quoteId).toBeDefined();
    expect(quoteRes.body.currency).toBe('GHS');
    expect(quoteRes.body.totalAmountMinor).toBe(20500); // 18000 + 2500
    const quoteId = quoteRes.body.quoteId;

    // 2. Client submits the care request
    const idempotencyKey = 'req-idempotency-' + Date.now();
    const reqRes = await request(app.getHttpServer())
      .post('/v1/care-requests')
      .set('idempotency-key', idempotencyKey)
      .send({
        quoteId,
        serviceId: 'home_wound_care',
        scheduledStart: '2026-11-25T14:00:00Z',
        durationMinutes: 60,
        location: { latitude: 5.5801, longitude: -0.1712 },
        addressPrivate: 'House 14 Cantonments Road',
        landmark: 'Near Cantonments Post Office',
        accessInstructions: 'Call on gate buzzer',
        careSummaryPrivate: 'Diabetic wound dressing change',
        recipientDisplayName: 'Ama Serwaa',
        recipientPhone: '+233244000111',
      });

    expect(reqRes.status).toBe(201);
    expect(reqRes.body.status).toBe('SEARCHING');
    const bookingId = reqRes.body.bookingId;

    // 3. Nurse Florence receives and accepts offer
    const florenceOffersRes = await request(app.getHttpServer())
      .get('/v1/nurses/me/offers')
      .set('x-nurse-id', 'nurse-florence-01');

    const florenceOffer = florenceOffersRes.body.find((o: any) => o.bookingId === bookingId);
    expect(florenceOffer).toBeDefined();

    const acceptRes = await request(app.getHttpServer())
      .post(`/v1/offers/${florenceOffer.offerId}/accept`)
      .set('x-nurse-id', 'nurse-florence-01')
      .send({});

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.status).toBe('ASSIGNED');
    expect(acceptRes.body.visitPin).toBeDefined();
    const visitPin = acceptRes.body.visitPin;

    // Sibling offer is closed
    const kwameOffersRes = await request(app.getHttpServer())
      .get('/v1/nurses/me/offers')
      .set('x-nurse-id', 'nurse-kwame-02');
    const kwameOffer = kwameOffersRes.body.find((o: any) => o.bookingId === bookingId);
    const kwameAccept = await request(app.getHttpServer())
      .post(`/v1/offers/${kwameOffer.offerId}/accept`)
      .set('x-nurse-id', 'nurse-kwame-02')
      .send({});
    expect(kwameAccept.status).toBe(409);

    // 4. Client retrieves authoritative booking state and sees assigned nurse + Visit PIN
    const bookingRes = await request(app.getHttpServer()).get(`/v1/bookings/${bookingId}`);
    expect(bookingRes.status).toBe(200);
    expect(bookingRes.body.visitPin).toBe(visitPin);
    expect(bookingRes.body.assignedNurse.displayName).toBe('Florence Mensah');

    // 5. Nurse checks in with PIN
    // Wrong PIN rejected
    const badPinRes = await request(app.getHttpServer())
      .post(`/v1/bookings/${bookingId}/check-in`)
      .send({ pin: '0000' });
    expect(badPinRes.status).toBe(400);

    // Valid PIN accepted
    const checkInRes = await request(app.getHttpServer())
      .post(`/v1/bookings/${bookingId}/check-in`)
      .send({ pin: visitPin });
    expect(checkInRes.status).toBe(200);
    expect(checkInRes.body.status).toBe('IN_PROGRESS');

    // 6. Nurse completes visit with clinical checklist
    const checkOutRes = await request(app.getHttpServer())
      .post(`/v1/bookings/${bookingId}/check-out`)
      .send({
        vitals: {
          bloodPressure: '120/80',
          heartRateBpm: 72,
          temperatureCelsius: 36.6,
        },
        procedureSummary: 'Sterile dressing change on left leg ulcer. Granulation tissue healthy.',
        woundDressingType: 'Hydrocolloid dressing applied',
        patientObservations: 'Patient comfortable, pain score 2/10.',
        escalationRequired: false,
      });

    expect(checkOutRes.status).toBe(200);
    expect(checkOutRes.body.status).toBe('COMPLETED');
    expect(checkOutRes.body.clinicalRecord).toBeDefined();
    expect(checkOutRes.body.clinicalRecord.woundDressingType).toBe('Hydrocolloid dressing applied');

    // 7. Verify payment was captured and split recorded
    const paymentsRes = await request(app.getHttpServer()).get('/v1/admin/payments');
    expect(paymentsRes.status).toBe(200);
    const tx = paymentsRes.body.find((p: any) => p.bookingId === bookingId);
    expect(tx).toBeDefined();
    expect(tx.status).toBe('CAPTURED');
    expect(tx.amountMinor).toBe(20500);
    expect(tx.nursePayoutMinor).toBe(17425); // 85% of 20500
    expect(tx.platformFeeMinor).toBe(3075); // 15%
  });

  it('Admin operations can review and approve pending nurse credentials', async () => {
    // 1. Fetch pending credentials queue
    const pendingRes = await request(app.getHttpServer()).get('/v1/admin/nurses/pending');
    expect(pendingRes.status).toBe(200);
    const nurse = pendingRes.body.find((n: any) => n.id === 'nurse-ama-03');
    expect(nurse).toBeDefined();
    expect(nurse.credentialStatus).toBe('PENDING_REVIEW');

    // 2. Approve credential
    const approveRes = await request(app.getHttpServer())
      .post('/v1/admin/nurses/nurse-ama-03/approve')
      .send({ reviewer: 'Dr. Mensah (Clinical Lead)' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.credentialStatus).toBe('APPROVED');
    expect(approveRes.body.reviewedBy).toBe('Dr. Mensah (Clinical Lead)');

    // 3. Nurse is no longer in pending queue
    const updatedPending = await request(app.getHttpServer()).get('/v1/admin/nurses/pending');
    const stillPending = updatedPending.body.find((n: any) => n.id === 'nurse-ama-03');
    expect(stillPending).toBeUndefined();
  });
});
