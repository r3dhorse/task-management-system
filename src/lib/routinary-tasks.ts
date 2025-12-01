import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@/features/tasks/types';
import { TaskHistoryAction } from '@/features/tasks/types/history';
import { generateTaskNumber } from '@/lib/task-number-generator';
import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns';
import { RoutinaryFrequency } from '@/features/services/schemas';

// Store last execution info for monitoring
let lastRoutinaryExecutionLog: {
  timestamp: Date;
  success: boolean;
  tasksCreated: number;
  error?: string;
} | null = null;

// Helper to calculate next run date based on frequency
const calculateNextRunDate = (currentDate: Date, frequency: RoutinaryFrequency): Date => {
  switch (frequency) {
    case "DAILY":
      return addDays(currentDate, 1);
    case "WEEKLY":
      return addWeeks(currentDate, 1);
    case "BIWEEKLY":
      return addWeeks(currentDate, 2);
    case "MONTHLY":
      return addMonths(currentDate, 1);
    case "QUARTERLY":
      return addMonths(currentDate, 3);
    case "YEARLY":
      return addYears(currentDate, 1);
    default:
      return addMonths(currentDate, 1);
  }
};

// Generate task title based on service name and current date
// Format: "Service Name - Month Year" (e.g., "Fire Cabinet Inspection - July 2026")
const generateTaskTitle = (serviceName: string, taskDate: Date): string => {
  const monthYear = format(taskDate, 'MMMM yyyy'); // e.g., "July 2026"
  return `${serviceName} - ${monthYear}`;
};

// Calculate SLA due date based on service configuration
const calculateDueDate = (slaDays: number | null, includeWeekends: boolean): Date => {
  const startDate = new Date();

  if (!slaDays) {
    // Default to 7 days if no SLA configured
    return addDays(startDate, 7);
  }

  if (includeWeekends) {
    return addDays(startDate, slaDays);
  }

  // Skip weekends if not included
  let daysAdded = 0;
  const result = new Date(startDate);

  while (daysAdded < slaDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return result;
};

export const createRoutinaryTasks = async () => {
  try {
    console.log('[CRON] Starting routinary tasks creation job at', new Date().toISOString());

    // Get a system user (superadmin) for audit trail
    const systemUser = await prisma.user.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true }
    });

    if (!systemUser) {
      throw new Error('No superadmin user found to perform automated task creation');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all services where:
    // 1. isRoutinary is true
    // 2. routinaryFrequency is set
    // 3. routinaryNextRunDate is today or in the past
    const routinaryServices = await prisma.service.findMany({
      where: {
        isRoutinary: true,
        routinaryFrequency: {
          not: null
        },
        routinaryNextRunDate: {
          lte: today
        }
      },
      include: {
        workspace: true
      }
    });

    console.log(`[CRON] Found ${routinaryServices.length} routinary services to process`);

    let createdCount = 0;
    let failedCount = 0;

    for (const service of routinaryServices) {
      try {
        const frequency = service.routinaryFrequency as RoutinaryFrequency;
        const taskNumber = await generateTaskNumber(prisma);
        const taskDate = new Date(); // Current date for task title
        const taskName = generateTaskTitle(service.name, taskDate);
        const dueDate = calculateDueDate(service.slaDays, service.includeWeekends);

        await prisma.$transaction(async (tx) => {
          // Create the task
          const task = await tx.task.create({
            data: {
              taskNumber,
              name: taskName,
              description: "Auto Generate Task",
              status: TaskStatus.TODO,
              workspaceId: service.workspaceId,
              serviceId: service.id,
              dueDate,
              position: 1000,
              creatorId: systemUser.id,
              isConfidential: false,
            }
          });

          // Create history entry
          await tx.taskHistory.create({
            data: {
              taskId: task.id,
              userId: systemUser.id,
              action: TaskHistoryAction.CREATED,
              details: `Automatically created by routinary schedule for service: ${service.name} (${frequency})`
            }
          });

          // Update service with next run date
          const nextRunDate = calculateNextRunDate(
            service.routinaryNextRunDate || new Date(),
            frequency
          );

          await tx.service.update({
            where: { id: service.id },
            data: {
              routinaryLastRunDate: new Date(),
              routinaryNextRunDate: nextRunDate
            }
          });

          console.log(`[CRON] Created routinary task "${taskName}" (${taskNumber}) for service ${service.name}. Next run: ${nextRunDate.toISOString()}`);
        });

        createdCount++;
      } catch (error) {
        console.error(`[CRON] Failed to create routinary task for service ${service.id} (${service.name}):`, error);
        failedCount++;
      }
    }

    console.log(`[CRON] Routinary tasks job completed. Created: ${createdCount}, Failed: ${failedCount}`);

    // Update execution log
    lastRoutinaryExecutionLog = {
      timestamp: new Date(),
      success: true,
      tasksCreated: createdCount
    };

    return {
      total: routinaryServices.length,
      created: createdCount,
      failed: failedCount
    };
  } catch (error) {
    console.error('[CRON] Error in routinary tasks creation job:', error);

    lastRoutinaryExecutionLog = {
      timestamp: new Date(),
      success: false,
      tasksCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    throw error;
  }
};

export const getRoutinaryTasksStatus = () => {
  return {
    lastExecution: lastRoutinaryExecutionLog
  };
};
