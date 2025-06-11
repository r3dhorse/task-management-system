import { getCurrent } from "@/features/auth/queries";
import { getWorkspace } from "@/features/workspaces/queries";
import { EnhancedWorkspaceSettings } from "@/features/workspaces/components/enhanced-workspace-settings";
import { redirect } from "next/navigation";

interface WorkspaceIdSettingsPageProps {
  params: {
    workspaceId: string;
  };
}

const WorkspaceIdSettingsPage = async ({
  params,
}: WorkspaceIdSettingsPageProps) => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  const workspace = await getWorkspace({ workspaceId: params.workspaceId });
  
  return <EnhancedWorkspaceSettings initialValues={workspace} />;
};

export default WorkspaceIdSettingsPage;