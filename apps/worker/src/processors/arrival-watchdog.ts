export interface ScheduledVisitSnapshot {
  bookingId: string;
  status: string; // ASSIGNED, EN_ROUTE, ARRIVED
  scheduledStart: string; // ISO-8601
  assignedNurseId?: string;
  nurseDisplayName?: string;
}

export interface WatchdogAlert {
  bookingId: string;
  level: 'REMINDER_PUSH' | 'CRITICAL_DELAY_ALERT';
  minutesUntilStart: number;
  message: string;
}

export function processArrivalWatchdog(
  visits: ScheduledVisitSnapshot[],
  nowMs = Date.now(),
): WatchdogAlert[] {
  const alerts: WatchdogAlert[] = [];

  for (const visit of visits) {
    // Only monitor visits that haven't transitioned to EN_ROUTE or ARRIVED
    if (visit.status === 'ASSIGNED') {
      const startMs = new Date(visit.scheduledStart).getTime();
      const diffMinutes = Math.round((startMs - nowMs) / 60000);

      if (diffMinutes <= 15 && diffMinutes > 0) {
        alerts.push({
          bookingId: visit.bookingId,
          level: 'CRITICAL_DELAY_ALERT',
          minutesUntilStart: diffMinutes,
          message: `Nurse ${visit.nurseDisplayName || visit.assignedNurseId} has not marked en route for visit starting in ${diffMinutes} minutes!`,
        });
      } else if (diffMinutes <= 30 && diffMinutes > 15) {
        alerts.push({
          bookingId: visit.bookingId,
          level: 'REMINDER_PUSH',
          minutesUntilStart: diffMinutes,
          message: `Reminder: Upcoming home care visit scheduled in ${diffMinutes} minutes. Please prepare to travel.`,
        });
      }
    }
  }

  return alerts;
}

