import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { prisma } from "./prisma"
import { redirect } from "next/navigation"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  
  return {
    id: (session.user as any).id,
    email: session.user.email!,
    name: session.user.name,
    isAdmin: (session.user as any).isAdmin || false,
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  if (!(user as any).isAdmin) {
    redirect("/")
  }
  return user
}

export async function getUserWithMemberships(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          workspace: true,
        },
      },
      ownedWorkspaces: true,
    },
  })
}

export async function getWorkspaceMember(workspaceId: string, userId: string) {
  return await prisma.member.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    include: {
      user: true,
      workspace: true,
    },
  })
}

export async function requireWorkspaceAccess(workspaceId: string) {
  const user = await requireAuth()
  const member = await getWorkspaceMember(workspaceId, user.id)
  
  if (!member) {
    redirect("/")
  }
  
  return { user, member }
}

export async function requireWorkspaceAdmin(workspaceId: string) {
  const { user, member } = await requireWorkspaceAccess(workspaceId)
  
  if (member.role !== "ADMIN") {
    redirect(`/workspaces/${workspaceId}`)
  }
  
  return { user, member }
}