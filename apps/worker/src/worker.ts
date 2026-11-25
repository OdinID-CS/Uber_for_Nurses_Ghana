import { QueueService } from './queues/queue.service';
import { processOfferExpiry, BookingStateSnapshot, ExpiryResult } from './processors/offer-expiry';
import { processHeartbeatReap, NursePresenceSnapshot, HeartbeatReapResult } from './processors/heartbeat';
import { processArrivalWatchdog, ScheduledVisitSnapshot, WatchdogAlert } from './processors/arrival-watchdog';
import { processPaymentReconciliation, PendingPaymentSnapshot, ReconciliationResult } from './processors/payment-reconciliation';
import {
  OfferExpireJobData,
  HeartbeatReapJobData,
  ArrivalWatchdogJobData,
  PaymentReconcileJobData,
} from './types/jobs';

export class WorkerManager {
  public queue: QueueService;

  constructor() {
    this.queue = new QueueService();
    this.registerProcessors();
  }

  private registerProcessors() {
    this.queue.registerHandler<OfferExpireJobData>('offer:expire', async (job) => {
      console.log(`[Worker] Processing offer expiry for booking ${job.data.bookingId}, round sequence ${job.data.sequence}`);
      // Simulated state lookup for execution
      return processOfferExpiry(job.data, () => ({
        id: job.data.bookingId,
        status: 'SEARCHING',
        roundId: job.data.roundId,
      }));
    });

    this.queue.registerHandler<HeartbeatReapJobData>('heartbeat:reap', async (job) => {
      console.log(`[Worker] Running heartbeat reaper (threshold: ${job.data.staleThresholdSeconds}s)`);
      return processHeartbeatReap(job.data, []);
    });

    this.queue.registerHandler<ArrivalWatchdogJobData>('arrival:watchdog', async (job) => {
      console.log(`[Worker] Running arrival watchdog (lead time: ${job.data.leadTimeMinutes}m)`);
      return processArrivalWatchdog([]);
    });

    this.queue.registerHandler<PaymentReconcileJobData>('payment:reconcile', async (job) => {
      console.log(`[Worker] Running payment reconciliation (max age: ${job.data.maxAgeMinutes}m)`);
      return processPaymentReconciliation([]);
    });
  }

  start() {
    console.log('[Worker] WorkerManager running with 4 registered processors.');
  }

  stop() {
    this.queue.shutdown();
  }
}

