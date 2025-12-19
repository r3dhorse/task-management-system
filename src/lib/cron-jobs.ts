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

// Track routinary tasks execution
let lastRoutinaryExecution: Date | null = null;
let isRoutinaryRunning = false;

// Track overdue tasks execution
let lastOverdueExecution: Date | null = null;
let isOverdueRunning = false;

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
        assignees: {
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

// Execute overdue tasks with safeguards
const executeOverdueTasks = async () => {
  const timezone = 'Asia/Manila';
  const currentTime = new Date().toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Prevent concurrent executions
  if (isOverdueRunning) {
    console.log(`[CRON] ⏭️ Overdue tasks update already running, skipping at ${currentTime}`);
    return;
  }

  isOverdueRunning = true;
  console.log(`[CRON] ⏰ Overdue tasks update started at ${currentTime} (${timezone})`);

  try {
    const result = await updateOverdueTasks();
    lastOverdueExecution = new Date();

    // Log execution for monitoring
    lastExecutionLog = {
      timestamp: new Date(),
      success: true,
      tasksUpdated: result.updatedCount
    };

    console.log(`[CRON] ✅ Overdue tasks update completed. Updated ${result.updatedCount} tasks at ${currentTime}`);
  } catch (error) {
    // Log failed execution for monitoring
    lastExecutionLog = {
      timestamp: new Date(),
      success: false,
      tasksUpdated: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    console.error(`[CRON] ❌ Overdue tasks update failed at ${currentTime}:`, error);
  } finally {
    isOverdueRunning = false;
  }
};

// Execute routinary tasks with safeguards
const executeRoutinaryTasks = async () => {
  const timezone = 'Asia/Manila';
  const currentTime = new Date().toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Prevent concurrent executions
  if (isRoutinaryRunning) {
    console.log(`[CRON] ⏭️ Routinary tasks already running, skipping at ${currentTime}`);
    return;
  }

  isRoutinaryRunning = true;
  console.log(`[CRON] ⏰ Routinary tasks creation started at ${currentTime} (${timezone})`);

  try {
    const result = await createRoutinaryTasks();
    lastRoutinaryExecution = new Date();
    console.log(`[CRON] ✅ Routinary tasks creation completed. Created ${result.created} tasks, skipped ${result.skipped} at ${currentTime}`);
  } catch (error) {
    console.error(`[CRON] ❌ Routinary tasks creation failed at ${currentTime}:`, error);
  } finally {
    isRoutinaryRunning = false;
  }
};

let routinaryInterval: NodeJS.Timeout | null = null;
let overdueInterval: NodeJS.Timeout | null = null;

export const initializeCronJobs = () => {
  if (routinaryInterval && overdueInterval) {
    console.log('[CRON] Cron jobs already initialized');
    return;
  }

  const timezone = 'Asia/Manila';

  // Overdue tasks job - runs every 6 hours using setInterval for reliability
  // 6 hours = 6 * 60 * 60 * 1000 = 21600000ms
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

  // Run overdue check on startup after a short delay
  setTimeout(async () => {
    console.log('[CRON] 🚀 Running initial overdue tasks check on startup...');
    await executeOverdueTasks();
  }, 5000); // 5 second delay for startup

  // Then run every 6 hours
  overdueInterval = setInterval(async () => {
    await executeOverdueTasks();
  }, SIX_HOURS_MS);

  console.log(`[CRON] Initialized overdue tasks scheduler. Will run every 6 hours using setInterval (${timezone} time).`);

  // Routinary tasks job - runs every 3 hours using setInterval for reliability
  // 3 hours = 3 * 60 * 60 * 1000 = 10800000ms
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

  // Run immediately on startup after a short delay (to let the server fully start)
  setTimeout(async () => {
    console.log('[CRON] 🚀 Running initial routinary tasks check on startup...');
    await executeRoutinaryTasks();
  }, 10000); // 10 second delay for startup

  // Then run every 3 hours
  routinaryInterval = setInterval(async () => {
    await executeRoutinaryTasks();
  }, THREE_HOURS_MS);

  console.log(`[CRON] Initialized routinary tasks scheduler. Will run every 3 hours using setInterval (${timezone} time).`);

  if (process.env.NODE_ENV === 'development') {
    console.log('[CRON] Development mode: You can manually trigger jobs using the /api/cron/* endpoints');
  }
};

export const stopCronJobs = () => {
  if (routinaryInterval) {
    clearInterval(routinaryInterval);
    routinaryInterval = null;
  }
  if (overdueInterval) {
    clearInterval(overdueInterval);
    overdueInterval = null;
  }
  console.log('[CRON] All cron jobs stopped');
};

export const getCronJobStatus = () => {
  return {
    overdueTasks: {
      isRunning: overdueInterval !== null,
      interval: '6 hours (setInterval)',
      timezone: 'Asia/Manila',
      description: 'Runs every 6 hours using setInterval for reliability',
      lastExecution: lastOverdueExecution ? {
        timestamp: lastOverdueExecution,
        ...lastExecutionLog
      } : lastExecutionLog,
      isCurrentlyRunning: isOverdueRunning
    },
    routinaryTasks: {
      isRunning: routinaryInterval !== null,
      interval: '3 hours (setInterval)',
      timezone: 'Asia/Manila',
      description: 'Runs every 3 hours using setInterval for reliability',
      lastExecution: lastRoutinaryExecution ? {
        timestamp: lastRoutinaryExecution,
        ...getRoutinaryTasksStatus().lastExecution
      } : getRoutinaryTasksStatus().lastExecution,
      isCurrentlyRunning: isRoutinaryRunning
    }
  };
};
