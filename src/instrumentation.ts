export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeCronJobs } = await import('@/lib/cron-jobs');

    initializeCronJobs();

    console.log('[INSTRUMENTATION] Cron jobs initialized successfully');

    process.on('SIGTERM', async () => {
      const { stopCronJobs } = await import('@/lib/cron-jobs');
      stopCronJobs();
      console.log('[INSTRUMENTATION] Cron jobs stopped on SIGTERM');
    });

    process.on('SIGINT', async () => {
      const { stopCronJobs } = await import('@/lib/cron-jobs');
      stopCronJobs();
      console.log('[INSTRUMENTATION] Cron jobs stopped on SIGINT');
    });
  }
}