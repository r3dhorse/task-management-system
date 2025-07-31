"use client";

import { SettingsIcon, UsersIcon, ListTodo } from "lucide-react";
import Link from "next/link";
import { GoCheckCircle, GoCheckCircleFill, GoHome, GoHomeFill } from "react-icons/go";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCurrent } from "@/features/auth/api/use-current";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { Member, MemberRole } from "@/features/members/types";

const routes = [
  {
    label: "Home",
    href: "",
    icon: GoHome,
    activeIcon: GoHomeFill,
    serviceAware: false, // Home always goes to workspace level
    restrictedForVisitors: true, // Visitors can't access Home
  },
  {
    label: "Tasks",
    href: "/workspace-tasks",
    icon: ListTodo,
    activeIcon: ListTodo,
    serviceAware: false, // Always workspace-level
    restrictedForVisitors: false, // Visitors can access Tasks
  },
  {
    label: "My Tasks",
    href: "/tasks",
    icon: GoCheckCircle,
    activeIcon: GoCheckCircleFill,
    serviceAware: true, // Can be service-specific
    restrictedForVisitors: true, // Visitors can't access My Tasks
  },
  {
    label: "Members",
    href: "/members",
    icon: UsersIcon,
    activeIcon: UsersIcon,
    serviceAware: true, // Can be service-specific
    restrictedForVisitors: true, // Visitors can't access Members
  },
   {
    label: "Setting",
    href: "/settings",
    icon: SettingsIcon,
    activeIcon: SettingsIcon,
    serviceAware: true, // Can be service-specific
    restrictedForVisitors: true, // Visitors can't access Settings
  },
];

export const Navigation = () => {
  const workspaceId = useWorkspaceId();
  const pathname = usePathname();
  
  // Get current user and member information
  const { data: currentUser } = useCurrent();
  const { data: members } = useGetMembers({ workspaceId });
  
  // Find current user's member record to check role
  const currentMember = members?.documents.find(member => 
    (member as Member).userId === currentUser?.id
  ) as Member;
  
  const isVisitor = currentMember?.role === MemberRole.VISITOR;
  
  // Check if we're currently in a service context
  const isInServiceContext = pathname.includes('/services/');
  const serviceId = isInServiceContext ? pathname.match(/\/services\/([^\/]+)/)?.[1] : null;

  return (
    <ul className="flex flex-col">
      {routes.map((item) => {
        // Check if this item should be disabled for visitors
        const isRestrictedForCurrentUser = isVisitor && item.restrictedForVisitors;
        
        // Determine the href based on service context
        let fullHref: string;
        
        if (item.serviceAware && isInServiceContext && serviceId) {
          // Navigate to service-specific version
          fullHref = `/workspaces/${workspaceId}/services/${serviceId}${item.href}`;
        } else {
          // Navigate to workspace-level version
          fullHref = `/workspaces/${workspaceId}${item.href}`;
        }
        
        const isActive = pathname === fullHref || 
          (item.serviceAware && isInServiceContext && pathname.startsWith(fullHref));
        const Icon = isActive ? item.activeIcon : item.icon;

        // If restricted for current user, render as disabled div instead of Link
        if (isRestrictedForCurrentUser) {
          return (
            <div key={item.href}>
              <div
                className={cn(
                  "flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-md font-medium text-neutral-300 cursor-not-allowed min-h-[44px] touch-manipulation opacity-50"
                )}
              >
                <Icon className="size-5 flex-shrink-0 text-neutral-300" />
                <span className="text-sm sm:text-base truncate">{item.label}</span>
              </div>
            </div>
          );
        }

        return (
          <Link key={item.href} href={fullHref}>
            <div
              className={cn(
                "flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-md font-medium hover:text-primary transition text-neutral-500 min-h-[44px] touch-manipulation",
                isActive && "bg-white shadow-sm hover:opacity-100 text-primary"
              )}
            >
              <Icon className={cn("size-5 flex-shrink-0", isActive ? "text-primary" : "text-neutral-500")} />
              <span className="text-sm sm:text-base truncate">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </ul>
  );
};
