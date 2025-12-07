import { PrismaClient } from '@prisma/client';

// Type that works with both PrismaClient and transaction client
type PrismaTransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Generate the next sequential task number in the format "Task #0000001"
 * Accepts either PrismaClient or a transaction client for use inside transactions
 */
export async function generateTaskNumber(prisma: PrismaClient | PrismaTransactionClient): Promise<string> {
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