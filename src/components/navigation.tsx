"use client";

import { useState } from "react";
import { SettingsIcon, UsersIcon, ListTodo, Shield, RefreshCw, FileTextIcon, ChevronDown, ChevronRight, Briefcase } from "@/lib/lucide-icons";
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
import { useGetServices } from "@/features/services/api/use-get-services";
import { RiAddCircleFill } from "react-icons/ri";
import { useCreateServiceModal } from "@/features/services/hooks/use-create-service-modal";

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
        restrictedForVisitors: false,
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
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { open: openCreatedTasks } = useCreatedTasksModal();
  const { open: openCreateService } = useCreateServiceModal();

  // Get current user and member information
  const { data: currentUser } = useCurrent();
  const { data: members } = useGetMembers({ workspaceId });
  const { data: services } = useGetServices({ workspaceId });

  // Find current user's member record to check role
  const currentMember = members?.documents.find(member =>
    (member as Member).userId === currentUser?.id
  ) as Member;

  const isVisitor = currentMember?.role === MemberRole.VISITOR;
  const isSuperAdmin = currentUser?.isSuperAdmin || false;
  const isAdmin = currentMember?.role === MemberRole.ADMIN;
  const canManageServices = isAdmin || isSuperAdmin;

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
        <button
          key={item.href}
          onClick={handleModalClick}
          className={cn(
            "w-full flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-md font-medium transition min-h-[44px] touch-manipulation group",
            "hover:bg-white/70 text-neutral-500 hover:text-primary",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            isChild && "pl-3"
          )}
        >
          <Icon className="size-4 flex-shrink-0 text-neutral-500 group-hover:text-primary transition-colors" />
          <span className="text-sm truncate text-left">{item.label}</span>
        </button>
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
        <div key={item.href} className="relative">
          <button
            onClick={() => setTasksExpanded(!tasksExpanded)}
            className={cn(
              "w-full flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-md font-medium transition min-h-[44px] touch-manipulation",
              "hover:bg-white/70 group",
              hasActiveChild ? "bg-white/70 text-primary shadow-sm" : "text-neutral-500",
              "focus:outline-none focus:ring-2 focus:ring-primary/20"
            )}
          >
            <Icon className={cn(
              "size-5 flex-shrink-0 transition-colors",
              hasActiveChild ? "text-primary" : "text-neutral-500 group-hover:text-primary"
            )} />
            <span className="text-sm sm:text-base truncate flex-1 text-left">
              {item.label}
            </span>
            <ChevronIcon className={cn(
              "size-4 flex-shrink-0 transition-transform duration-200",
              hasActiveChild ? "text-primary" : "text-neutral-400 group-hover:text-neutral-600"
            )} />
          </button>
          {tasksExpanded && (
            <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-neutral-200 pl-2">
              {item.children.map(child => renderMenuItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    // Regular menu items
    return (
      <Link key={item.href} href={fullHref} className="block">
        <button
          className={cn(
            "w-full flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-md font-medium transition min-h-[44px] touch-manipulation group",
            isActive
              ? "bg-white shadow-sm text-primary"
              : "text-neutral-500 hover:bg-white/70 hover:text-primary",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            isChild && "pl-3"
          )}
        >
          <Icon className={cn(
            isChild ? "size-4" : "size-5",
            "flex-shrink-0 transition-colors",
            isActive ? "text-primary" : "text-neutral-500 group-hover:text-primary"
          )} />
          <span className={cn(
            isChild ? "text-sm" : "text-sm sm:text-base",
            "truncate text-left"
          )}>
            {item.label}
          </span>
        </button>
      </Link>
    );
  };

  const renderServicesButton = () => (
    <>
      <button
        onClick={() => setServicesExpanded(!servicesExpanded)}
        className={cn(
          "w-full flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-md font-medium transition min-h-[44px] touch-manipulation",
          "hover:bg-white/70 group",
          servicesExpanded || isInServiceContext ? "bg-white/70 text-primary shadow-sm" : "text-neutral-500",
          "focus:outline-none focus:ring-2 focus:ring-primary/20"
        )}
      >
        <Briefcase className={cn(
          "size-5 flex-shrink-0 transition-colors",
          servicesExpanded || isInServiceContext ? "text-primary" : "text-neutral-500 group-hover:text-primary"
        )} />
        <span className="text-sm sm:text-base truncate flex-1 text-left">
          Services
        </span>
        <div className="flex items-center gap-1">
          {canManageServices && (
            <RiAddCircleFill
              onClick={(e) => {
                e.stopPropagation();
                openCreateService();
              }}
              className="size-5 text-blue-600 cursor-pointer hover:text-blue-700 hover:scale-110 transition-all duration-200"
            />
          )}
          {servicesExpanded ? (
            <ChevronDown className={cn(
              "size-4 flex-shrink-0 transition-transform duration-200",
              servicesExpanded || isInServiceContext ? "text-primary" : "text-neutral-400 group-hover:text-neutral-600"
            )} />
          ) : (
            <ChevronRight className={cn(
              "size-4 flex-shrink-0 transition-transform duration-200",
              servicesExpanded || isInServiceContext ? "text-primary" : "text-neutral-400 group-hover:text-neutral-600"
            )} />
          )}
        </div>
      </button>

      {servicesExpanded && (
        <div className={cn(
          "mt-1 ml-3 space-y-0.5 border-l-2 border-neutral-200 pl-2",
          services?.documents && services.documents.length > 3 ? "max-h-[220px] overflow-y-auto" : ""
        )}>
          {services?.documents?.map((service) => {
            const serviceHref = `/workspaces/${workspaceId}/services/${service.id}/settings`;
            const isActiveService = pathname.includes(`/services/${service.id}`);

            // Only render as clickable link for admins
            if (canManageServices) {
              return (
                <Link key={service.id} href={serviceHref} className="block">
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 p-2 rounded-md font-medium transition min-h-[44px] touch-manipulation group",
                      isActiveService
                        ? "bg-white shadow-sm text-primary"
                        : "text-neutral-500 hover:bg-white/70 hover:text-primary",
                      "focus:outline-none focus:ring-2 focus:ring-primary/20"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold uppercase flex-shrink-0",
                      isActiveService ? "bg-primary text-white" : "bg-blue-600 text-white group-hover:bg-primary"
                    )}>
                      {service.name.charAt(0)}
                    </div>
                    <span className="text-sm truncate text-left">{service.name}</span>
                  </button>
                </Link>
              );
            }

            // For non-admins, render as non-clickable text
            return (
              <div
                key={service.id}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-md min-h-[44px]",
                  isActiveService ? "text-primary" : "text-neutral-500",
                  "cursor-default"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold uppercase flex-shrink-0",
                  isActiveService ? "bg-primary text-white" : "bg-blue-600 text-white"
                )}>
                  {service.name.charAt(0)}
                </div>
                <span className="text-sm truncate text-left">{service.name}</span>
              </div>
            );
          })}
          {(!services?.documents || services.documents.length === 0) && (
            <div className="p-2 text-sm text-neutral-400 text-center">
              No services
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      <nav className="flex flex-col space-y-1">
        {/* Main Menu Section */}
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-2 mb-2">
            Menu
          </div>
          {routes.map((item, index) => (
            <div key={item.href || index}>
              {renderMenuItem(item)}
              {/* Insert Services button after Tasks (index 1) */}
              {index === 1 && renderServicesButton()}
            </div>
          ))}
        </div>

        {/* Super Admin Section */}
        {isSuperAdmin && (
          <div className="my-3 border-t border-neutral-200 pt-3 space-y-0.5">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-2 mb-2">
              Super Admin
            </div>
            <button
              onClick={() => setUserManagementModalOpen(true)}
              className={cn(
                "w-full flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-md font-medium transition min-h-[44px] touch-manipulation group",
                "text-neutral-500 hover:bg-white/70 hover:text-primary",
                "focus:outline-none focus:ring-2 focus:ring-primary/20"
              )}
            >
              <Shield className="size-5 flex-shrink-0 text-neutral-500 group-hover:text-primary transition-colors" />
              <span className="text-sm sm:text-base truncate text-left">User Management</span>
            </button>
            <button
              onClick={handleTaskAudit}
              disabled={isRunningAudit}
              className={cn(
                "w-full flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-md font-medium transition min-h-[44px] touch-manipulation group",
                "text-neutral-500 hover:bg-white/70 hover:text-primary",
                "focus:outline-none focus:ring-2 focus:ring-primary/20",
                isRunningAudit && "opacity-50 cursor-not-allowed hover:bg-transparent"
              )}
            >
              <RefreshCw className={cn(
                "size-5 flex-shrink-0 transition-colors",
                isRunningAudit ? "animate-spin text-neutral-500" : "text-neutral-500 group-hover:text-primary"
              )} />
              <span className="text-sm sm:text-base truncate text-left">
                {isRunningAudit ? "Running Audit..." : "Run Task Audit"}
              </span>
            </button>
          </div>
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
