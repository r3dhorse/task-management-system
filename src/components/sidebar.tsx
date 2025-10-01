"use client";

import { DottedSeparator } from "./dotted-separator";
import { Navigation } from "./navigation";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { UserInfoCard } from "./user-info-card";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { Button } from "./ui/button";
import { Plus } from "@/lib/lucide-icons";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";
import { useCurrent } from "@/features/auth/api/use-current";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Member, MemberRole } from "@/features/members/types";




export const Sidebar = () => {
  const workspaceId = useWorkspaceId();
  const { open } = useCreateTaskModal();

  // Get current user and member information to check visitor role
  const { data: currentUser } = useCurrent();
  const { data: members } = useGetMembers({ workspaceId });

  // Find current user's member record to check role
  const currentMember = members?.documents.find(member =>
    (member as Member).userId === currentUser?.id
  ) as Member;

  const isVisitor = currentMember?.role === MemberRole.VISITOR;

  return (
    <aside
      className="h-full w-[270px] sm:w-[290px] lg:w-[270px] bg-neutral-100 p-4 sm:p-6 border-r overflow-hidden"
      aria-label="Sidebar"
    >
      <div className="overflow-x-hidden overflow-y-auto h-full">
        <div className="mb-4 sm:mb-6">
          <UserInfoCard />
        </div>

        <DottedSeparator className="my-3 sm:my-4" />
        <NotificationDropdown />
        <Button
          onClick={() => open()}
          className="w-full mt-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all duration-200 justify-start"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
        <DottedSeparator className="my-3 sm:my-4" />
        <WorkspaceSwitcher />
        <DottedSeparator className="my-3 sm:my-4" />
        <Navigation />
      </div>
    </aside>
  );
};
