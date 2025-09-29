import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { WorkspaceTasksClient } from "./client";

const WorkspaceTasksPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <WorkspaceTasksClient />;
};

export default WorkspaceTasksPage;