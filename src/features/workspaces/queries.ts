
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";

export const getWorkspaces = async () => {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  const workspaceMembers = await prisma.member.findMany({
    where: {
      userId: user.id,
    },
    include: {
      workspace: true,
    },
    orderBy: [
      {
        // First, prioritize by role (ADMIN first, then MEMBER, then VISITOR)
        role: 'asc', // Since ADMIN comes first in enum, this puts ADMIN first
      },
      {
        // Then order by most recent join date within each role
        joinedAt: 'desc',
      },
    ],
  });

  const workspaces = workspaceMembers.map(member => member.workspace);
  
  return { 
    documents: workspaces, 
    total: workspaces.length 
  };
};

interface GetWorkspaceProps {
  workspaceId: string;
}

export const getWorkspace = async ({ workspaceId }: GetWorkspaceProps) => {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Check if user is a member of this workspace
  const member = await prisma.member.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
  });

  if (!member) {
    throw new Error("Unauthorized");
  }

  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId,
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  return workspace;
};

interface GetWorkspaceInfoProps {
  workspaceId: string;
}

export const getWorkspaceInfo = async ({ workspaceId }: GetWorkspaceInfoProps) => {
  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      name: true,
      description: true,
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  return workspace;
};

/**
 * Get the user's most recently joined workspace as MEMBER or ADMIN (latest default workspace)
 * Prioritizes MEMBER/ADMIN roles over VISITOR roles
 */
export const getUserLatestWorkspace = async () => {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  // First try to find the most recent MEMBER or ADMIN membership
  const latestMemberOrAdminMembership = await prisma.member.findFirst({
    where: {
      userId: user.id,
      role: {
        in: ['MEMBER', 'ADMIN'],
      },
    },
    include: {
      workspace: true,
    },
    orderBy: {
      joinedAt: 'desc',
    },
  });

  if (latestMemberOrAdminMembership) {
    return latestMemberOrAdminMembership.workspace;
  }

  // If no MEMBER/ADMIN memberships, fall back to latest VISITOR membership
  const latestVisitorMembership = await prisma.member.findFirst({
    where: {
      userId: user.id,
      role: 'VISITOR',
    },
    include: {
      workspace: true,
    },
    orderBy: {
      joinedAt: 'desc',
    },
  });

  if (!latestVisitorMembership) {
    return null;
  }

  return latestVisitorMembership.workspace;
};
