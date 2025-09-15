import * as cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@/features/tasks/types';
import { TaskHistoryAction } from '@/features/tasks/types/history';

export const updateOverdueTasks = async () => {
  try {
    console.log('[CRON] Starting overdue tasks update job at', new Date().toISOString());

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
                userId: 'system',
                action: TaskHistoryAction.STATUS_CHANGED,
                oldValue: task.status,
                newValue: TaskStatus.BACKLOG,
                details: `Task automatically moved to backlog due to overdue date (${task.dueDate?.toLocaleDateString()}). Previous status: ${task.status}`,
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
      try {
        await updateOverdueTasks();
      } catch (error) {
        console.error('[CRON] Failed to execute overdue tasks update:', error);
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