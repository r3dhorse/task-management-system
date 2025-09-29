import { PrismaClient } from '@prisma/client';

/**
 * Generate the next sequential task number in the format "Task #0000001"
 */
export async function generateTaskNumber(prisma: PrismaClient): Promise<string> {
  // Get the highest existing task number
  const lastTask = await prisma.task.findFirst({
    where: {
      taskNumber: {
        startsWith: 'Task #'
      }
    },
    orderBy: {
      taskNumber: 'desc'
    }
  });

  let nextNumber = 1;

  if (lastTask && lastTask.taskNumber) {
    // Extract the number from "Task #0000001" format
    const match = lastTask.taskNumber.match(/Task #(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Format with leading zeros (7 digits)
  const formattedNumber = nextNumber.toString().padStart(7, '0');
  return `Task #${formattedNumber}`;
}