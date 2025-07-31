"use client";

import { useCurrent } from "@/features/auth/api/use-current";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { Member, MemberRole } from "@/features/members/types";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

export const UserWelcomeBadge = () => {
  const workspaceId = useWorkspaceId();
  const { data: currentUser } = useCurrent();
  
  // Only fetch members if we have a valid workspaceId
  const { data: members } = useGetMembers({ 
    workspaceId
  });
  
  // Find current user's member record to get role
  const currentMember = workspaceId && members?.documents.find(member => 
    (member as Member).userId === currentUser?.$id
  ) as Member;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-lg backdrop-blur-sm">
      <div className={`w-3 h-3 rounded-full shadow-sm ${
        currentUser ? 'bg-green-500 animate-pulse shadow-green-200' : 'bg-gray-400 animate-pulse'
      }`}></div>
      <div className="flex flex-col">
        <span className="text-sm font-bold text-blue-900 tracking-wide leading-tight">
          {currentUser?.name ? `Welcome, ${currentUser.name}` : 'Welcome, User'}
        </span>
        <span className="text-xs font-medium text-blue-700 opacity-90">
          {currentMember?.role ? (
            <span className={`inline-flex items-center gap-1 ${
              currentMember.role === MemberRole.ADMIN ? 'text-purple-700' :
              currentMember.role === MemberRole.MEMBER ? 'text-blue-700' :
              'text-gray-600'
            }`}>
              {currentMember.role === MemberRole.ADMIN && '👑'}
              {currentMember.role === MemberRole.MEMBER && '👤'}
              {currentMember.role === MemberRole.VISITOR && '👁️'}
              {currentMember.role.charAt(0).toUpperCase() + currentMember.role.slice(1).toLowerCase()}
            </span>
          ) : (
            'Loading role...'
          )}
        </span>
      </div>
    </div>
  );
};