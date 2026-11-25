export type JobName =
  | 'offer:expire'
  | 'heartbeat:reap'
  | 'arrival:watchdog'
  | 'payment:reconcile';

export interface OfferExpireJobData {
  bookingId: string;
  roundId: string;
  sequence: number;
  radiusKm: number;
}

export interface HeartbeatReapJobData {
  staleThresholdSeconds: number;
}

export interface ArrivalWatchdogJobData {
  leadTimeMinutes: number;
}

export interface PaymentReconcileJobData {
  maxAgeMinutes: number;
}

export interface QueueJob<T = any> {
  id: string;
  name: JobName;
  data: T;
  delayMs?: number;
  runAt: number;
}

