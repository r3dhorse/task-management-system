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
    case "BIDAILY":
      return addDays(date, 1); // Twice a day - creates 2 tasks per day, next run is tomorrow
    case "DAILY":
      return addDays(date, 1);
    case "WEEKLY":
      return addWeeks(date, 1);
    case "MONTHLY":
      return addMonths(date, 1);
    case "QUARTERLY":
      return addMonths(date, 3);
    case "BIYEARLY":
      return addMonths(date, 6); // Twice a year (every 6 months)
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
// For bi-daily tasks, adds suffix like "1st" or "2nd"
const generateTaskTitle = (serviceName: string, taskDate: Date, suffix?: string): string => {
  const monthYear = format(taskDate, 'MMMM yyyy'); // e.g., "July 2026"
  const dayOfMonth = format(taskDate, 'd'); // e.g., "15"

  if (suffix) {
    // For bi-daily: "Service Name - December 6 (1st)"
    return `${serviceName} - ${format(taskDate, 'MMMM d')} (${suffix})`;
  }

  return `${serviceName} - ${monthYear}`;
};

// Generate task title for daily frequency (includes day)
const generateDailyTaskTitle = (serviceName: string, taskDate: Date): string => {
  return `${serviceName} - ${format(taskDate, 'MMMM d, yyyy')}`; // e.g., "Service Name - December 6, 2025"
};

// Calculate SLA due date based on service configuration
// For DAILY and BIDAILY frequencies, due date is end of the same day
const calculateDueDate = (slaDays: number | null, includeWeekends: boolean, frequency?: RoutinaryFrequency): Date => {
  const startDate = new Date();

  // For daily/bi-daily tasks, due date is end of today (same day SLA)
  if (frequency === "DAILY" || frequency === "BIDAILY") {
    const endOfDay = new Date(startDate);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }

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

    console.log(`[CRON] System user (superadmin) found: ${systemUser ? systemUser.id : 'NOT FOUND'}`);

    if (!systemUser) {
      throw new Error('No superadmin user found to perform automated task creation');
    }

    // Get end of today in Philippine timezone for comparison
    // This ensures we only process services due on or before today in PHT
    const todayEndPHT = getTodayEndInPHT();

    console.log(`[CRON] Using PHT timezone. Today ends at: ${todayEndPHT.toISOString()} (UTC)`);

    // First, let's see ALL routinary services regardless of date
    const allRoutinaryServices = await prisma.service.findMany({
      where: {
        isRoutinary: true
      },
      select: {
        id: true,
        name: true,
        routinaryFrequency: true,
        routinaryNextRunDate: true,
        routinaryStartDate: true,
      }
    });

    console.log(`[CRON] Total routinary services in database: ${allRoutinaryServices.length}`);
    for (const svc of allRoutinaryServices) {
      console.log(`[CRON] Service "${svc.name}": frequency=${svc.routinaryFrequency}, nextRunDate=${svc.routinaryNextRunDate?.toISOString() || 'NULL'}, startDate=${svc.routinaryStartDate?.toISOString() || 'NULL'}`);
    }

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

    console.log(`[CRON] Found ${routinaryServices.length} routinary services to process (with nextRunDate <= ${todayEndPHT.toISOString()})`);

    let createdCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const service of routinaryServices) {
      try {
        const frequency = service.routinaryFrequency as RoutinaryFrequency;
        const taskDate = new Date(); // Current date for task title
        const dueDate = calculateDueDate(service.slaDays, service.includeWeekends, frequency);

        // Determine how many tasks to create and their names
        let tasksToCreate: { name: string; suffix?: string }[] = [];

        if (frequency === "BIDAILY") {
          // Create 2 tasks for bi-daily frequency
          tasksToCreate = [
            { name: generateTaskTitle(service.name, taskDate, "1st"), suffix: "1st" },
            { name: generateTaskTitle(service.name, taskDate, "2nd"), suffix: "2nd" }
          ];
        } else if (frequency === "DAILY") {
          // Daily tasks include the full date
          tasksToCreate = [{ name: generateDailyTaskTitle(service.name, taskDate) }];
        } else {
          // Other frequencies use month/year format
          tasksToCreate = [{ name: generateTaskTitle(service.name, taskDate) }];
        }

        let allTasksExist = true;
        let someTasksExist = false;

        // Check which tasks already exist
        for (const taskInfo of tasksToCreate) {
          const existingTask = await prisma.task.findFirst({
            where: {
              serviceId: service.id,
              name: taskInfo.name
            }
          });
          if (existingTask) {
            someTasksExist = true;
            console.log(`[CRON] Task "${taskInfo.name}" already exists for service ${service.name}`);
          } else {
            allTasksExist = false;
          }
        }

        // If all tasks exist, skip and update next run date
        if (allTasksExist) {
          console.log(`[CRON] Skipping service ${service.name} - all tasks already exist`);

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

        // Create tasks that don't exist yet
        await prisma.$transaction(async (tx) => {
          for (const taskInfo of tasksToCreate) {
            // Check if this specific task exists
            const existingTask = await tx.task.findFirst({
              where: {
                serviceId: service.id,
                name: taskInfo.name
              }
            });

            if (existingTask) {
              console.log(`[CRON] Skipping task "${taskInfo.name}" - already exists`);
              continue;
            }

            // Generate task number using the transaction client to see uncommitted tasks
            const taskNumber = await generateTaskNumber(tx);

            // Create the task
            const task = await tx.task.create({
              data: {
                taskNumber,
                name: taskInfo.name,
                description: "Auto Generated Task",
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
                details: `Automatically created by routinary schedule for service: ${service.name} (${frequency}${taskInfo.suffix ? ` - ${taskInfo.suffix}` : ''})`
              }
            });

            console.log(`[CRON] Created routinary task "${taskInfo.name}" (${taskNumber}) for service ${service.name}`);
            createdCount++;
          }

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

          console.log(`[CRON] Service ${service.name} next run: ${nextRunDate.toISOString()}`);
        });

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
