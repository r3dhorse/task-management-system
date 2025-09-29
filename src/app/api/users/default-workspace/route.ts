import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        defaultWorkspace: true,
        memberships: {
          include: {
            workspace: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const workspaces = user.memberships.map(m => m.workspace);

    return NextResponse.json({
      defaultWorkspaceId: user.defaultWorkspaceId,
      defaultWorkspace: user.defaultWorkspace,
      availableWorkspaces: workspaces
    });
  } catch (error) {
    console.error("Failed to get default workspace:", error);
    return NextResponse.json(
      { error: "Failed to get default workspace" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await req.json();

    // If workspaceId is null, clear the default workspace
    if (workspaceId === null) {
      const user = await prisma.user.update({
        where: { id: session.user.id },
        data: { defaultWorkspaceId: null }
      });
      return NextResponse.json({ message: "Default workspace cleared", user });
    }

    // Check if user is a member of the workspace
    const membership = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: workspaceId
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this workspace" },
        { status: 403 }
      );
    }

    // Update user's default workspace
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { defaultWorkspaceId: workspaceId },
      include: {
        defaultWorkspace: true
      }
    });

    return NextResponse.json({
      message: "Default workspace updated successfully",
      user,
      defaultWorkspace: user.defaultWorkspace
    });
  } catch (error) {
    console.error("Failed to update default workspace:", error);
    return NextResponse.json(
      { error: "Failed to update default workspace" },
      { status: 500 }
    );
  }
}