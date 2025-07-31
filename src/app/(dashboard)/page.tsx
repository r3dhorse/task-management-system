import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { getWorkspaces } from "@/features/workspaces/queries";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrent();
  
  if (!user) { 
    redirect("/sign-in"); 
  }

  let workspaces;
  try {
    workspaces = await getWorkspaces();
  } catch (error) {
    console.error("Error loading workspaces:", error);
    redirect("/no-workspace");
  }
  
  // Check if user has any workspaces (as member or owner)
  if (workspaces && workspaces.total > 0 && workspaces.documents && workspaces.documents.length > 0) {
    // Redirect to the most recently created workspace (which the user has access to)
    const latestWorkspace = workspaces.documents[0];
    if (latestWorkspace && latestWorkspace.id) {
      redirect(`/workspaces/${latestWorkspace.id}`);
    }
  }
  
  // Only redirect to no-workspace if user truly has no workspaces
  redirect("/no-workspace");
};
