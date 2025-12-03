import * as cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@/features/tasks/types';
import { TaskHistoryAction } from '@/features/tasks/types/history';
import { createRoutinaryTasks, getRoutinaryTasksStatus } from './routinary-tasks';

// Store last execution info for monitoring
let lastExecutionLog: {
  timestamp: Date;
  success: boolean;
  tasksUpdated: number;
  error?: string;
} | null = null;

export const updateOverdueTasks = async () => {
  try {
    console.log('[CRON] Starting overdue tasks update job at', new Date().toISOString());

    // Get a system user (superadmin) for audit trail
    const systemUser = await prisma.user.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true }
    });

    if (!systemUser) {
      throw new Error('No superadmin user found to perform automated task updates');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = await prisma.task.findMany({
      where: {
        AND: [
          {
            status: {
              in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW]
            }
          },
          {
            dueDate: {
              lt: today
            }
          }
        ]
      },
      include: {
        service: true,
        assignee: {
          include: {
            user: true
          }
        }
      }
    });

    console.log(`[CRON] Found ${overdueTasks.length} overdue tasks to update`);

    const updateResults = await Promise.allSettled(
      overdueTasks.map(async (task) => {
        try {
          await prisma.$transaction(async (tx) => {
            await tx.task.update({
              where: { id: task.id },
              data: {
                status: TaskStatus.BACKLOG,
                updatedAt: new Date()
              }
            });

            await tx.taskHistory.create({
              data: {
                taskId: task.id,
                userId: systemUser.id,
                action: TaskHistoryAction.STATUS_CHANGED,
                oldValue: task.status,
                newValue: TaskStatus.BACKLOG,
                details: `Task automatically moved to backlog due to overdue date (${task.dueDate?.toLocaleDateString()}). Previous status: ${task.status}. (Automated system update)`,
                createdAt: new Date()
              }
            });
          });

          console.log(`[CRON] Successfully updated task ${task.id} to BACKLOG`);
          return { success: true, taskId: task.id };
        } catch (error) {
          console.error(`[CRON] Failed to update task ${task.id}:`, error);
          return { success: false, taskId: task.id, error };
        }
      })
    );

    const successCount = updateResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failureCount = updateResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    console.log(`[CRON] Overdue tasks update completed. Success: ${successCount}, Failed: ${failureCount}`);

    return {
      total: overdueTasks.length,
      updatedCount: successCount,
      success: successCount,
      failed: failureCount
    };
  } catch (error) {
    console.error('[CRON] Error in overdue tasks update job:', error);
    throw error;
  }
};

let cronJob: cron.ScheduledTask | null = null;
let routinaryCronJob: cron.ScheduledTask | null = null;

export const initializeCronJobs = () => {
  if (cronJob && routinaryCronJob) {
    console.log('[CRON] Cron jobs already initialized');
    return;
  }

  const timezone = 'Asia/Manila';

  // Overdue tasks job - runs at midnight
  const overdueCronExpression = '0 0 * * *';
  cronJob = cron.schedule(
    overdueCronExpression,
    async () => {
      const currentTime = new Date().toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      console.log(`[CRON] ⏰ Automated overdue tasks update started at ${currentTime} (${timezone})`);

      try {
        const result = await updateOverdueTasks();

        // Log execution for monitoring
        lastExecutionLog = {
          timestamp: new Date(),
          success: true,
          tasksUpdated: result.updatedCount
        };

        console.log(`[CRON] ✅ Automated execution completed successfully. Updated ${result.updatedCount} tasks at ${currentTime}`);
      } catch (error) {
        // Log failed execution for monitoring
        lastExecutionLog = {
          timestamp: new Date(),
          success: false,
          tasksUpdated: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        };

        console.error(`[CRON] ❌ Automated execution failed at ${currentTime}:`, error);
      }
    },
    {
      timezone: timezone
    }
  );

  cronJob.start();

  console.log(`[CRON] Initialized overdue tasks cron job. Will run at midnight ${timezone} time daily.`);

  // Routinary tasks job - runs every 12 hours (1 AM and 1 PM) to ensure scheduled recurring tasks are created
  const routinaryCronExpression = '0 1,13 * * *';
  routinaryCronJob = cron.schedule(
    routinaryCronExpression,
    async () => {
      const currentTime = new Date().toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      console.log(`[CRON] ⏰ Routinary tasks creation started at ${currentTime} (${timezone})`);

      try {
        const result = await createRoutinaryTasks();
        console.log(`[CRON] ✅ Routinary tasks creation completed. Created ${result.created} tasks, skipped ${result.skipped} at ${currentTime}`);
      } catch (error) {
        console.error(`[CRON] ❌ Routinary tasks creation failed at ${currentTime}:`, error);
      }
    },
    {
      timezone: timezone
    }
  );

  routinaryCronJob.start();

  console.log(`[CRON] Initialized routinary tasks cron job. Will run every 12 hours (1 AM and 1 PM) ${timezone} time.`);

  if (process.env.NODE_ENV === 'development') {
    console.log('[CRON] Development mode: You can manually trigger jobs using the /api/cron/* endpoints');
  }
};

export const stopCronJobs = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
  if (routinaryCronJob) {
    routinaryCronJob.stop();
    routinaryCronJob = null;
  }
  console.log('[CRON] All cron jobs stopped');
};

export const getCronJobStatus = () => {
  return {
    overdueTasks: {
      isRunning: cronJob !== null,
      cronExpression: '0 0 * * *',
      timezone: 'Asia/Manila',
      nextExecution: cronJob ? getNextExecution(0) : null,
      lastExecution: lastExecutionLog
    },
    routinaryTasks: {
      isRunning: routinaryCronJob !== null,
      cronExpression: '0 1,13 * * *',
      timezone: 'Asia/Manila',
      description: 'Runs every 12 hours at 1 AM and 1 PM',
      nextExecution: routinaryCronJob ? getNextRoutinaryExecution() : null,
      lastExecution: getRoutinaryTasksStatus().lastExecution
    }
  };
};

const getNextExecution = (hour: number = 0) => {
  try {
    // Calculate next execution time in Manila timezone
    const now = new Date();
    const manila = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    const nextExecution = new Date(manila);

    // If the hour has already passed today, schedule for tomorrow
    if (manila.getHours() >= hour) {
      nextExecution.setDate(nextExecution.getDate() + 1);
    }
    nextExecution.setHours(hour, 0, 0, 0);

    return nextExecution.toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return 'Unable to calculate';
  }
};

// Get next execution for routinary tasks (runs at 1 AM and 1 PM)
const getNextRoutinaryExecution = () => {
  try {
    const now = new Date();
    const manila = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    const currentHour = manila.getHours();
    const nextExecution = new Date(manila);

    // Determine next run: 1 AM or 1 PM (13:00)
    if (currentHour < 1) {
      // Before 1 AM - next run is 1 AM today
      nextExecution.setHours(1, 0, 0, 0);
    } else if (currentHour < 13) {
      // Between 1 AM and 1 PM - next run is 1 PM today
      nextExecution.setHours(13, 0, 0, 0);
    } else {
      // After 1 PM - next run is 1 AM tomorrow
      nextExecution.setDate(nextExecution.getDate() + 1);
      nextExecution.setHours(1, 0, 0, 0);
    }

    return nextExecution.toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return 'Unable to calculate';
  }
};