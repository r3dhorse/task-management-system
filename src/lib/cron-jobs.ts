import * as cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@/features/tasks/types';
import { TaskHistoryAction } from '@/features/tasks/types/history';

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

export const initializeCronJobs = () => {
  if (cronJob) {
    console.log('[CRON] Cron jobs already initialized');
    return;
  }

  const cronExpression = '0 0 * * *';
  const timezone = 'Asia/Manila';

  cronJob = cron.schedule(
    cronExpression,
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

  if (process.env.NODE_ENV === 'development') {
    console.log('[CRON] Development mode: You can manually trigger the job using the /api/cron/overdue-tasks endpoint');
  }
};

export const stopCronJobs = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[CRON] Cron jobs stopped');
  }
};

export const getCronJobStatus = () => {
  return {
    isRunning: cronJob !== null,
    cronExpression: '0 0 * * *',
    timezone: 'Asia/Manila',
    nextExecution: cronJob ? getNextExecution() : null,
    lastExecution: lastExecutionLog
  };
};

const getNextExecution = () => {
  try {
    // Calculate next midnight in Manila timezone
    const now = new Date();
    const manila = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    const nextMidnight = new Date(manila);
    nextMidnight.setHours(24, 0, 0, 0); // Next midnight

    return nextMidnight.toLocaleString('en-US', {
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