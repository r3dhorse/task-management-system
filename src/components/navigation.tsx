"use client";

import { useState } from "react";
import { SettingsIcon, UsersIcon, ListTodo, Shield, RefreshCw, FileTextIcon, ChevronDown, ChevronRight } from "@/lib/lucide-icons";
import Link from "next/link";
import { GoCheckCircle, GoCheckCircleFill, GoHome, GoHomeFill } from "react-icons/go";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCurrent } from "@/features/auth/api/use-current";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { Member, MemberRole } from "@/features/members/types";
import { UserManagementModal } from "@/components/user-management-modal";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCreatedTasksModal } from "@/features/tasks/hooks/use-created-tasks-modal";

interface Route {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  activeIcon: React.ComponentType<{ className?: string }>;
  serviceAware: boolean;
  restrictedForVisitors: boolean;
  isModal?: boolean;
  children?: Route[];
}

const routes: Route[] = [
  {
    label: "Home",
    href: "",
    icon: GoHome,
    activeIcon: GoHomeFill,
    serviceAware: false,
    restrictedForVisitors: true,
  },
  {
    label: "Tasks",
    href: "/workspace-tasks",
    icon: ListTodo,
    activeIcon: ListTodo,
    serviceAware: false,
    restrictedForVisitors: false,
    children: [
      {
        label: "Workspace Tasks",
        href: "/workspace-tasks",
        icon: ListTodo,
        activeIcon: ListTodo,
        serviceAware: false,
        restrictedForVisitors: false,
      },
      {
        label: "My Tasks",
        href: "/tasks",
        icon: GoCheckCircle,
        activeIcon: GoCheckCircleFill,
        serviceAware: true,
        restrictedForVisitors: true,
      },
      {
        label: "Created Tasks",
        href: "#created-tasks",
        icon: FileTextIcon,
        activeIcon: FileTextIcon,
        serviceAware: false,
        restrictedForVisitors: true,
        isModal: true,
      },
    ],
  },
  {
    label: "Members",
    href: "/members",
    icon: UsersIcon,
    activeIcon: UsersIcon,
    serviceAware: true,
    restrictedForVisitors: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: SettingsIcon,
    activeIcon: SettingsIcon,
    serviceAware: true,
    restrictedForVisitors: true,
  },
];

export const Navigation = () => {
  const workspaceId = useWorkspaceId();
  const pathname = usePathname();
  const [userManagementModalOpen, setUserManagementModalOpen] = useState(false);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { open: openCreatedTasks } = useCreatedTasksModal();

  // Get current user and member information
  const { data: currentUser } = useCurrent();
  const { data: members } = useGetMembers({ workspaceId });

  // Find current user's member record to check role
  const currentMember = members?.documents.find(member =>
    (member as Member).userId === currentUser?.id
  ) as Member;

  const isVisitor = currentMember?.role === MemberRole.VISITOR;
  const isSuperAdmin = currentUser?.isSuperAdmin || false;

  // Check if we're currently in a service context
  const isInServiceContext = pathname.includes('/services/');
  const serviceId = isInServiceContext ? pathname.match(/\/services\/([^\/]+)/)?.[1] : null;

  const handleTaskAudit = async () => {
    setIsRunningAudit(true);
    try {
      const response = await fetch('/api/cron/overdue-tasks', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        const updatedCount = result.result?.updatedCount || 0;

        if (updatedCount > 0) {
          // Invalidate all task-related queries to refresh the UI
          await queryClient.invalidateQueries({ queryKey: ['tasks'] });
          await queryClient.invalidateQueries({ queryKey: ['workspace-tasks'] });

          // Refresh the current page to show updated data
          router.refresh();

          alert(`Task audit completed successfully! ${updatedCount} tasks were moved to backlog. The page will refresh to show the changes.`);
        } else {
          alert('Task audit completed successfully! No overdue tasks were found.');
        }
      } else {
        const error = await response.json();
        alert(`Task audit failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Task audit error:', error);
      alert('Failed to run task audit. Please try again.');
    } finally {
      setIsRunningAudit(false);
    }
  };

  const renderMenuItem = (item: Route, isChild: boolean = false) => {
    const isRestrictedForCurrentUser = isVisitor && item.restrictedForVisitors;

    if (isRestrictedForCurrentUser) {
      return null;
    }

    let fullHref: string;
    if (item.serviceAware && isInServiceContext && serviceId) {
      fullHref = `/workspaces/${workspaceId}/services/${serviceId}${item.href}`;
    } else {
      fullHref = `/workspaces/${workspaceId}${item.href}`;
    }

    const isActive = pathname === fullHref ||
      (item.serviceAware && isInServiceContext && pathname.startsWith(fullHref));
    const Icon = isActive ? item.activeIcon : item.icon;

    // Handle modal items
    if (item.isModal) {
      const handleModalClick = () => {
        if (item.href === "#created-tasks") {
          openCreatedTasks();
        }
      };

      return (
        <div
          key={item.href}
          onClick={handleModalClick}
          className={cn(
            "flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-md font-medium hover:text-primary transition text-neutral-500 min-h-[44px] touch-manipulation cursor-pointer hover:bg-white/50",
            isChild && "pl-10"
          )}
        >
          <Icon className="size-4 flex-shrink-0 text-neutral-500" />
          <span className="text-sm truncate">{item.label}</span>
        </div>
      );
    }

    // Handle items with children (collapsible)
    if (item.children && item.children.length > 0) {
      const hasActiveChild = item.children.some(child => {
        let childHref: string;
        if (child.serviceAware && isInServiceContext && serviceId) {
          childHref = `/workspaces/${workspaceId}/services/${serviceId}${child.href}`;
        } else {
          childHref = `/workspaces/${workspaceId}${child.href}`;
        }
        return pathname === childHref || pathname.startsWith(childHref);
      });

      const ChevronIcon = tasksExpanded ? ChevronDown : ChevronRight;

      return (
        <div key={item.href}>
          <div
            onClick={() => setTasksExpanded(!tasksExpanded)}
            className={cn(
              "flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-md font-medium hover:text-primary transition text-neutral-500 min-h-[44px] touch-manipulation cursor-pointer",
              hasActiveChild && "bg-white/70 text-primary"
            )}
          >
            <Icon className={cn("size-5 flex-shrink-0", hasActiveChild ? "text-primary" : "text-neutral-500")} />
            <span className="text-sm sm:text-base truncate flex-1">{item.label}</span>
            <ChevronIcon className="size-4 flex-shrink-0 text-neutral-400" />
          </div>
          {tasksExpanded && (
            <div className="mt-1 space-y-1">
              {item.children.map(child => renderMenuItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    // Regular menu items
    return (
      <Link key={item.href} href={fullHref}>
        <div
          className={cn(
            "flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-md font-medium hover:text-primary transition text-neutral-500 min-h-[44px] touch-manipulation",
            isActive && "bg-white shadow-sm hover:opacity-100 text-primary",
            isChild && "pl-10"
          )}
        >
          <Icon className={cn(isChild ? "size-4" : "size-5", "flex-shrink-0", isActive ? "text-primary" : "text-neutral-500")} />
          <span className={cn(isChild ? "text-sm" : "text-sm sm:text-base", "truncate")}>{item.label}</span>
        </div>
      </Link>
    );
  };

  return (
    <>
      <nav className="flex flex-col space-y-1">
        {routes.map((item) => renderMenuItem(item))}

        {/* Super Admin Section */}
        {isSuperAdmin && (
          <>
            <div className="my-3 border-t border-neutral-200 pt-3">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-2 mb-2">
                Super Admin
              </div>
              <div
                onClick={() => setUserManagementModalOpen(true)}
                className={cn(
                  "flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-md font-medium hover:text-primary transition text-neutral-500 min-h-[44px] touch-manipulation cursor-pointer hover:bg-white/50"
                )}
              >
                <Shield className="size-5 flex-shrink-0 text-neutral-500" />
                <span className="text-sm sm:text-base truncate">User Management</span>
              </div>
              <div
                onClick={handleTaskAudit}
                className={cn(
                  "flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-md font-medium hover:text-primary transition text-neutral-500 min-h-[44px] touch-manipulation cursor-pointer hover:bg-white/50",
                  isRunningAudit && "opacity-50 cursor-not-allowed"
                )}
              >
                <RefreshCw className={cn("size-5 flex-shrink-0 text-neutral-500", isRunningAudit && "animate-spin")} />
                <span className="text-sm sm:text-base truncate">
                  {isRunningAudit ? "Running Audit..." : "Run Task Audit"}
                </span>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* User Management Modal */}
      <UserManagementModal
        open={userManagementModalOpen}
        onOpenChange={setUserManagementModalOpen}
      />
    </>
  );
};
