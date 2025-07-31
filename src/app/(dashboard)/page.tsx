import { getCurrent } from "@/features/auth/queries";

import { redirect } from "next/navigation";
import { getWorkspaces } from "@/features/workspaces/queries";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrent();
  if (!user) { redirect("/sign-in"); }

  const workspaces = await getWorkspaces();
  if (!workspaces || workspaces.total === 0 || !workspaces.documents || workspaces.documents.length === 0) {
    redirect("/no-workspace");
  }
  else {
    const firstWorkspace = workspaces.documents[0];
    if (firstWorkspace && firstWorkspace.$id) {
      redirect(`/workspaces/${firstWorkspace.$id}`);
    } else {
      redirect("/no-workspace");
    }
  }
};
