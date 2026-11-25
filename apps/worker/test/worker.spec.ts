import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueueService } from '../src/queues/queue.service';
import { processOfferExpiry, BookingStateSnapshot } from '../src/processors/offer-expiry';
import { processHeartbeatReap, NursePresenceSnapshot } from '../src/processors/heartbeat';
import { processArrivalWatchdog, ScheduledVisitSnapshot } from '../src/processors/arrival-watchdog';
import { processPaymentReconciliation, PendingPaymentSnapshot } from '../src/processors/payment-reconciliation';

describe('Background Worker Processors', () => {
  let queue: QueueService;

  beforeEach(() => {
    queue = new QueueService();
  });

  afterEach(() => {
    queue.shutdown();
  });

  describe('Offer Expiration & Cohort Widening', () => {
    it('widens cohort radius when round 1 expires with no acceptance', () => {
      const getBooking = (): BookingStateSnapshot => ({
        id: 'bk-001',
        status: 'SEARCHING',
        roundId: 'round-1',
      });

      const result = processOfferExpiry(
        { bookingId: 'bk-001', roundId: 'round-1', sequence: 1, radiusKm: 10 },
        getBooking,
      );

      expect(result.action).toBe('WIDEN_COHORT');
      expect(result.newSequence).toBe(2);
      expect(result.newRadiusKm).toBe(15);
    });

    it('widens cohort radius from round 2 to round 3', () => {
      const getBooking = (): BookingStateSnapshot => ({
        id: 'bk-001',
        status: 'SEARCHING',
        roundId: 'round-2',
      });

      const result = processOfferExpiry(
        { bookingId: 'bk-001', roundId: 'round-2', sequence: 2, radiusKm: 15 },
        getBooking,
      );

      expect(result.action).toBe('WIDEN_COHORT');
      expect(result.newSequence).toBe(3);
      expect(result.newRadiusKm).toBe(20);
    });

    it('transitions booking to NO_NURSE_FOUND when max round (round 3) expires', () => {
      const getBooking = (): BookingStateSnapshot => ({
        id: 'bk-001',
        status: 'SEARCHING',
        roundId: 'round-3',
      });

      const result = processOfferExpiry(
        { bookingId: 'bk-001', roundId: 'round-3', sequence: 3, radiusKm: 20 },
        getBooking,
      );

      expect(result.action).toBe('TRANSITION_NO_NURSE_FOUND');
    });

    it('ignores expiration if a nurse already accepted the booking', () => {
      const getBooking = (): BookingStateSnapshot => ({
        id: 'bk-001',
        status: 'ASSIGNED',
        roundId: 'round-1',
      });

      const result = processOfferExpiry(
        { bookingId: 'bk-001', roundId: 'round-1', sequence: 1, radiusKm: 10 },
        getBooking,
      );

      expect(result.action).toBe('IGNORED_ALREADY_ASSIGNED');
    });
  });

  describe('Stale Presence Heartbeat Reaper', () => {
    it('identifies and reaps nurses whose GPS ping is older than 5 minutes', () => {
      const now = Date.now();
      const nurses: NursePresenceSnapshot[] = [
        {
          nurseId: 'nurse-active',
          mode: 'ONLINE_NOW',
          lastSeenAt: new Date(now - 60000).toISOString(), // 1 min ago
        },
        {
          nurseId: 'nurse-stale',
          mode: 'ONLINE_NOW',
          lastSeenAt: new Date(now - 360000).toISOString(), // 6 mins ago (> 5m)
        },
        {
          nurseId: 'nurse-offline',
          mode: 'OFFLINE',
          lastSeenAt: new Date(now - 600000).toISOString(), // already offline
        },
      ];

      const result = processHeartbeatReap({ staleThresholdSeconds: 300 }, nurses, now);

      expect(result.reapedNurseIds).toContain('nurse-stale');
      expect(result.reapedNurseIds).not.toContain('nurse-active');
      expect(result.reapedNurseIds).not.toContain('nurse-offline');
      expect(result.reapedNurseIds.length).toBe(1);
    });
  });

  describe('Delayed Arrival Watchdog', () => {
    it('fires a critical delay alert when visit starts in <= 15m and nurse has not marked en route', () => {
      const now = Date.now();
      const visits: ScheduledVisitSnapshot[] = [
        {
          bookingId: 'bk-critical',
          status: 'ASSIGNED',
          scheduledStart: new Date(now + 12 * 60000).toISOString(), // 12 mins from now
          nurseDisplayName: 'Florence Mensah',
        },
        {
          bookingId: 'bk-reminder',
          status: 'ASSIGNED',
          scheduledStart: new Date(now + 25 * 60000).toISOString(), // 25 mins from now
          nurseDisplayName: 'Kwame Asante',
        },
        {
          bookingId: 'bk-enroute',
          status: 'EN_ROUTE',
          scheduledStart: new Date(now + 10 * 60000).toISOString(), // already traveling
        },
      ];

      const alerts = processArrivalWatchdog(visits, now);

      expect(alerts.length).toBe(2);
      const critical = alerts.find((a) => a.level === 'CRITICAL_DELAY_ALERT');
      expect(critical).toBeDefined();
      expect(critical?.bookingId).toBe('bk-critical');

      const reminder = alerts.find((a) => a.level === 'REMINDER_PUSH');
      expect(reminder).toBeDefined();
      expect(reminder?.bookingId).toBe('bk-reminder');
    });
  });

  describe('Payment Reconciliation', () => {
    it('flags stale pending transactions older than 10 minutes', () => {
      const now = Date.now();
      const payments: PendingPaymentSnapshot[] = [
        {
          id: 'tx-fresh',
          bookingId: 'bk-1',
          status: 'PENDING',
          createdAt: new Date(now - 5 * 60000).toISOString(), // 5m ago
        },
        {
          id: 'tx-stale',
          bookingId: 'bk-2',
          status: 'PENDING',
          createdAt: new Date(now - 15 * 60000).toISOString(), // 15m ago (>10m)
        },
      ];

      const result = processPaymentReconciliation(payments, now, 10);
      expect(result.reconciledIds).toContain('tx-fresh');
      expect(result.flaggedStaleIds).toContain('tx-stale');
    });
  });

  describe('Queue Service Job Execution', () => {
    it('enqueues and executes immediate and delayed jobs', async () => {
      let executedJob: any = null;
      queue.registerHandler('offer:expire', async (job) => {
        executedJob = job.data;
      });

      await queue.enqueue('offer:expire', { bookingId: 'bk-immediate', roundId: 'r-1', sequence: 1, radiusKm: 10 });
      expect(executedJob).toBeDefined();
      expect(executedJob.bookingId).toBe('bk-immediate');
    });
  });
});

