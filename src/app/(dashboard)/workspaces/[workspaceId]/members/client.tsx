"use client";

import { MembersList } from "@/features/workspaces/components/members-list";
import { UserWelcomeBadge } from "@/components/user-welcome-badge";

export const WorkspaceMembersClient = () => {
  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 px-4 sm:px-0">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">Workspace Members</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage your workspace members and their roles</p>
        </div>
        
        {/* User Welcome Badge - Same style as Tasks page */}
        <div className="hidden sm:block">
          <UserWelcomeBadge />
        </div>
      </div>
      
      <MembersList />
    </div>
  );
};