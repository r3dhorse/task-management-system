import { PrismaClient } from "@prisma/client"

interface getMemberProps {
  prisma: PrismaClient;
  workspaceId: string;
  userId: string;
};

export const getMember = async ({
  prisma,
  workspaceId,
  userId,
}: getMemberProps) => {
  const member = await prisma.member.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return member;
};


