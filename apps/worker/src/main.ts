import { WorkerManager } from './worker';

async function bootstrap() {
  console.log('[Uber for Nurses] Starting background worker process...');
  const manager = new WorkerManager();
  manager.start();

  // Schedule recurring 2-minute heartbeat reaper check
  setInterval(() => {
    manager.queue.enqueue('heartbeat:reap', { staleThresholdSeconds: 300 });
  }, 120000);

  // Schedule recurring 5-minute arrival watchdog check
  setInterval(() => {
    manager.queue.enqueue('arrival:watchdog', { leadTimeMinutes: 30 });
  }, 300000);

  console.log('[Uber for Nurses] Worker successfully started and listening for jobs.');
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

