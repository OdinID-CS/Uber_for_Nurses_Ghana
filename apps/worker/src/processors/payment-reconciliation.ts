export interface PendingPaymentSnapshot {
  id: string;
  bookingId: string;
  status: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED';
  createdAt: string;
}

export interface ReconciliationResult {
  reconciledIds: string[];
  flaggedStaleIds: string[];
}

export function processPaymentReconciliation(
  payments: PendingPaymentSnapshot[],
  nowMs = Date.now(),
  maxAgeMinutes = 10,
): ReconciliationResult {
  const reconciledIds: string[] = [];
  const flaggedStaleIds: string[] = [];
  const maxAgeMs = maxAgeMinutes * 60000;

  for (const tx of payments) {
    if (tx.status === 'AUTHORIZED' || tx.status === 'PENDING') {
      const ageMs = nowMs - new Date(tx.createdAt).getTime();
      if (ageMs > maxAgeMs) {
        flaggedStaleIds.push(tx.id);
      } else {
        reconciledIds.push(tx.id);
      }
    }
  }

  return { reconciledIds, flaggedStaleIds };
}

