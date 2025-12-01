import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";

interface GetServiceProps {
  serviceId: string;
}

export const getService = async ({ serviceId }: GetServiceProps) => {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  const service = await prisma.service.findUnique({
    where: {
      id: serviceId,
    },
    select: {
      id: true,
      name: true,
      workspaceId: true,
      isPublic: true,
      slaDays: true,
      includeWeekends: true,
      // Routinary fields
      isRoutinary: true,
      routinaryFrequency: true,
      routinaryStartDate: true,
      routinaryNextRunDate: true,
      routinaryLastRunDate: true,
      createdAt: true,
      updatedAt: true,
      workspace: true,
    },
  });

  if (!service) {
    throw new Error("Service not found");
  }

  // Check if user is a member of the workspace
  const member = await prisma.member.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: service.workspaceId,
      },
    },
  });

  if (!member) {
    throw new Error("Unauthorized");
  }

  return service;
};