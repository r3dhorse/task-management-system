"use client";

import { DottedSeparator } from "./dotted-separator";
import { Navigation } from "./navigation";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { ServiceSwitcher } from "./service-switcher";
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
      className="h-full w-64 sm:w-72 lg:w-64 bg-neutral-100 p-4 sm:p-6 border-r"
      aria-label="Sidebar"
    >
      <div>
        <div className="mb-4 sm:mb-6">
          <UserInfoCard />
        </div>

        <DottedSeparator className="my-3 sm:my-4" />
        <NotificationDropdown />
        <DottedSeparator className="my-3 sm:my-4" />
        <WorkspaceSwitcher />
        <DottedSeparator className="my-3 sm:my-4" />
        < Navigation />
        <DottedSeparator className="my-3 sm:my-4" />
        {!isVisitor && (
          <>
            <Button
              onClick={() => open()}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
            <DottedSeparator className="my-3 sm:my-4" />
          </>
        )}
        < ServiceSwitcher />
      </div>
    </aside>
  );
};
