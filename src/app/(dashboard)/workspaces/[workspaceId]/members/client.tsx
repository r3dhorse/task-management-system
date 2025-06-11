"use client";

import { MembersList } from "@/features/workspaces/components/members-list";
import { UserWelcomeBadge } from "@/components/user-welcome-badge";

export const WorkspaceMembersClient = () => {
  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold">Workspace Members</h1>
          <p className="text-sm text-muted-foreground">Manage your workspace members and their roles</p>
        </div>
        
        {/* User Welcome Badge - Same style as Tasks page */}
        <UserWelcomeBadge />
      </div>
      
      <MembersList />
    </div>
  );
};