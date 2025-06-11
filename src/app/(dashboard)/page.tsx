import { getCurrent } from "@/features/auth/queries";

import { redirect } from "next/navigation";
import { getWorkspaces } from "@/features/workspaces/queries";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrent();
  if (!user) { redirect("/sign-in"); }

  const workspaces = await getWorkspaces();
  if (workspaces.total === 0) {
    redirect("/no-workspace");
  }
  else {
    redirect(`/workspaces/${workspaces.documents[0].$id}`);
  }


};
