import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof prismaClientSingleton> | undefined;
};

const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasourceUrl: process.env.DATABASE_URL,
    errorFormat: process.env.NODE_ENV === "development" ? "pretty" : "minimal",
  }).$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.take = args.take ?? 1000;
          return query(args);
        },
      },
      task: {
        async findMany({ args, query }) {
          if (!args.include?.assignees && !args.include?.followers) {
            args.select = {
              ...args.select,
              id: true,
              name: true,
              description: true,
              status: true,
              position: true,
              dueDate: true,
              isConfidential: true,
              workspaceId: true,
              serviceId: true,
              creatorId: true,
              createdAt: true,
              updatedAt: true,
            };
          }
          return query(args);
        },
      },
    },
  });
};


const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}

export async function batchOperations<T>(
  items: T[],
  operation: (batch: T[]) => Promise<void>,
  batchSize = 100
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await operation(batch);
  }
}