import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { getUserLatestWorkspace } from "@/features/workspaces/queries";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrent();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has a default workspace set
  if (user.defaultWorkspaceId) {
    // Verify user is still a member of their default workspace
    const membership = await prisma.member.findFirst({
      where: {
        userId: user.id,
        workspaceId: user.defaultWorkspaceId,
      },
    });

    if (membership) {
      // User is still a member, redirect to default workspace
      redirect(`/workspaces/${user.defaultWorkspaceId}`);
    } else {
      // User is no longer a member of their default workspace, clear it
      await prisma.user.update({
        where: { id: user.id },
        data: { defaultWorkspaceId: null },
      });
    }
  }

  // Get user's latest workspace (most recently joined) as fallback
  let latestWorkspace;
  try {
    latestWorkspace = await getUserLatestWorkspace();
  } catch (error) {
    console.error("Error loading latest workspace:", error);
    redirect("/no-workspace");
  }

  // If user has a latest workspace, redirect there
  if (latestWorkspace && latestWorkspace.id) {
    redirect(`/workspaces/${latestWorkspace.id}`);
  }

  // Only redirect to no-workspace if user truly has no workspaces
  redirect("/no-workspace");
};
