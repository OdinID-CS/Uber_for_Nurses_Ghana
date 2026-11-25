import { HeartbeatReapJobData } from '../types/jobs';

export interface NursePresenceSnapshot {
  nurseId: string;
  mode: 'ONLINE_NOW' | 'OFFLINE';
  lastSeenAt: string; // ISO-8601
}

export interface HeartbeatReapResult {
  reapedNurseIds: string[];
  checkedCount: number;
}

export function processHeartbeatReap(
  data: HeartbeatReapJobData,
  nurses: NursePresenceSnapshot[],
  nowMs = Date.now(),
): HeartbeatReapResult {
  const reapedNurseIds: string[] = [];
  const staleThresholdMs = (data.staleThresholdSeconds || 300) * 1000; // default 5 mins

  for (const nurse of nurses) {
    if (nurse.mode === 'ONLINE_NOW') {
      const lastSeenMs = new Date(nurse.lastSeenAt).getTime();
      const ageMs = nowMs - lastSeenMs;

      if (ageMs > staleThresholdMs) {
        reapedNurseIds.push(nurse.nurseId);
      }
    }
  }

  return {
    reapedNurseIds,
    checkedCount: nurses.length,
  };
}

