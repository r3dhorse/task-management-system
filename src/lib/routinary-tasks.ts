import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@/features/tasks/types';
import { TaskHistoryAction } from '@/features/tasks/types/history';
import { generateTaskNumber } from '@/lib/task-number-generator';
import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns';
import { RoutinaryFrequency } from '@/features/services/schemas';

// Philippine timezone offset (UTC+8)
const PHT_OFFSET_HOURS = 8;

// Store last execution info for monitoring
let lastRoutinaryExecutionLog: {
  timestamp: Date;
  success: boolean;
  tasksCreated: number;
  error?: string;
} | null = null;

// Get today's date at start of day in Philippine timezone (for comparison)
// This returns a Date object representing the START of today in PHT (as UTC timestamp)
const getTodayStartInPHT = (): Date => {
  const now = new Date();
  // Get current time in PHT by adding offset
  const phtNow = new Date(now.getTime() + (PHT_OFFSET_HOURS * 60 * 60 * 1000));
  // Get the date components in PHT
  const year = phtNow.getUTCFullYear();
  const month = phtNow.getUTCMonth();
  const day = phtNow.getUTCDate();
  // Create start of day in PHT, converted back to UTC
  // PHT midnight = UTC 16:00 previous day
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - (PHT_OFFSET_HOURS * 60 * 60 * 1000));
};

// Get today's date at end of day in Philippine timezone (for comparison)
const getTodayEndInPHT = (): Date => {
  const now = new Date();
  // Get current time in PHT by adding offset
  const phtNow = new Date(now.getTime() + (PHT_OFFSET_HOURS * 60 * 60 * 1000));
  // Get the date components in PHT
  const year = phtNow.getUTCFullYear();
  const month = phtNow.getUTCMonth();
  const day = phtNow.getUTCDate();
  // Create end of day in PHT, converted back to UTC
  // PHT 23:59:59.999 = UTC 15:59:59.999 same day
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - (PHT_OFFSET_HOURS * 60 * 60 * 1000));
};

// Helper to add one frequency interval to a date
const addFrequencyInterval = (date: Date, frequency: RoutinaryFrequency): Date => {
  switch (frequency) {
    case "DAILY":
      return addDays(date, 1);
    case "WEEKLY":
      return addWeeks(date, 1);
    case "BIWEEKLY":
      return addWeeks(date, 2);
    case "MONTHLY":
      return addMonths(date, 1);
    case "QUARTERLY":
      return addMonths(date, 3);
    case "YEARLY":
      return addYears(date, 1);
    default:
      return addMonths(date, 1);
  }
};

// Helper to calculate next run date based on frequency
// Ensures the next run date is always in the future (after today in PHT)
const calculateNextRunDate = (currentDate: Date, frequency: RoutinaryFrequency): Date => {
  // Use end of today in PHT for comparison
  const todayEndPHT = getTodayEndInPHT();

  let nextDate = addFrequencyInterval(currentDate, frequency);

  // Keep adding intervals until the date is in the future (after today in PHT)
  // This handles cases where routinaryNextRunDate was in the past
  while (nextDate <= todayEndPHT) {
    nextDate = addFrequencyInterval(nextDate, frequency);
  }

  return nextDate;
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

    // Get end of today in Philippine timezone for comparison
    // This ensures we only process services due on or before today in PHT
    const todayEndPHT = getTodayEndInPHT();

    console.log(`[CRON] Using PHT timezone. Today ends at: ${todayEndPHT.toISOString()} (UTC)`);

    // Find all services where:
    // 1. isRoutinary is true
    // 2. routinaryFrequency is set
    // 3. routinaryNextRunDate is today or in the past (in PHT)
    const routinaryServices = await prisma.service.findMany({
      where: {
        isRoutinary: true,
        routinaryFrequency: {
          not: null
        },
        routinaryNextRunDate: {
          lte: todayEndPHT
        }
      },
      include: {
        workspace: true
      }
    });

    console.log(`[CRON] Found ${routinaryServices.length} routinary services to process`);

    let createdCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const service of routinaryServices) {
      try {
        const frequency = service.routinaryFrequency as RoutinaryFrequency;
        const taskDate = new Date(); // Current date for task title
        const taskName = generateTaskTitle(service.name, taskDate);

        // Check if a task with the same name already exists for this service
        // This prevents duplicate creation when manual cron is triggered
        const existingTask = await prisma.task.findFirst({
          where: {
            serviceId: service.id,
            name: taskName
          }
        });

        if (existingTask) {
          console.log(`[CRON] Skipping service ${service.name} - task "${taskName}" already exists (ID: ${existingTask.id})`);

          // Still update the next run date to prevent this service from being picked up again
          const nextRunDate = calculateNextRunDate(
            service.routinaryNextRunDate || new Date(),
            frequency
          );

          await prisma.service.update({
            where: { id: service.id },
            data: {
              routinaryLastRunDate: new Date(),
              routinaryNextRunDate: nextRunDate
            }
          });

          skippedCount++;
          continue;
        }

        const taskNumber = await generateTaskNumber(prisma);
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

    console.log(`[CRON] Routinary tasks job completed. Created: ${createdCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`);

    // Update execution log
    lastRoutinaryExecutionLog = {
      timestamp: new Date(),
      success: true,
      tasksCreated: createdCount
    };

    return {
      total: routinaryServices.length,
      created: createdCount,
      skipped: skippedCount,
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
