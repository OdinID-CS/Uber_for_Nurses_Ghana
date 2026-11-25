import { JobName, QueueJob } from '../types/jobs';
import { v4 as uuidv4 } from 'uuid';

export type JobHandler<T = any> = (job: QueueJob<T>) => Promise<any> | any;

export class QueueService {
  private handlers: Map<JobName, JobHandler> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private pendingJobs: Map<string, QueueJob> = new Map();
  public processedJobCount = 0;

  registerHandler<T>(name: JobName, handler: JobHandler<T>) {
    this.handlers.set(name, handler);
  }

  async enqueue<T>(name: JobName, data: T, delayMs = 0): Promise<string> {
    const jobId = uuidv4();
    const runAt = Date.now() + delayMs;
    const job: QueueJob<T> = { id: jobId, name, data, delayMs, runAt };
    this.pendingJobs.set(jobId, job);

    if (delayMs <= 0) {
      await this.executeJob(job);
    } else {
      const timer = setTimeout(async () => {
        this.scheduledJobs.delete(jobId);
        await this.executeJob(job);
      }, delayMs);
      this.scheduledJobs.set(jobId, timer);
    }

    return jobId;
  }

  private async executeJob(job: QueueJob) {
    const handler = this.handlers.get(job.name);
    if (handler) {
      try {
        await handler(job);
        this.processedJobCount++;
      } catch (err) {
        console.error(`[Worker] Error executing job ${job.name} (${job.id}):`, err);
      } finally {
        this.pendingJobs.delete(job.id);
      }
    }
  }

  cancelJob(jobId: string) {
    const timer = this.scheduledJobs.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.scheduledJobs.delete(jobId);
    }
    this.pendingJobs.delete(jobId);
  }

  getPendingJobs(): QueueJob[] {
    return Array.from(this.pendingJobs.values());
  }

  shutdown() {
    for (const timer of this.scheduledJobs.values()) {
      clearTimeout(timer);
    }
    this.scheduledJobs.clear();
    this.pendingJobs.clear();
  }
}

