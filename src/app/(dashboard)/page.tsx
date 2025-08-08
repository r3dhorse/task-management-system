import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { getUserLatestWorkspace } from "@/features/workspaces/queries";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrent();
  
  if (!user) { 
    redirect("/sign-in"); 
  }

  // Get user's latest workspace (most recently joined)
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
