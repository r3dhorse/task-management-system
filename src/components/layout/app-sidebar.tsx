"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MenuIcon, Plus, Play } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DottedSeparator } from "@/components/dotted-separator";
import { Navigation } from "@/components/navigation";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { UserInfoCard } from "@/components/user-info-card";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { useCurrent } from "@/features/auth/api/use-current";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Member, MemberRole } from "@/features/members/types";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

interface AppSidebarProps {
  /** Additional class name */
  className?: string;
  /** Sidebar variant - collapsible or always visible */
  variant?: "default" | "floating" | "inset";
}

// ============================================================================
// SIDEBAR CONTENT COMPONENT
// ============================================================================

interface SidebarContentProps {
  onClose?: () => void;
  isMobile?: boolean;
}

/**
 * Inner sidebar content - shared between desktop and mobile views
 */
function SidebarContent({ onClose, isMobile = false }: SidebarContentProps) {
  const workspaceId = useWorkspaceId();
  const { open: openCreateTask } = useCreateTaskModal();
  const [isRunningCron, setIsRunningCron] = useState(false);

  // Get current user and member information
  const { data: currentUser } = useCurrent();
  const { data: members } = useGetMembers({ workspaceId });

  // Find current user's member record
  const currentMember = members?.documents.find(
    (member) => (member as Member).userId === currentUser?.id
  ) as Member | undefined;

  const isCustomer = currentMember?.role === MemberRole.CUSTOMER;
  const isSuperAdmin = currentUser?.isSuperAdmin;

  // Handle new task button click
  const handleNewTask = useCallback(() => {
    openCreateTask();
    onClose?.();
  }, [openCreateTask, onClose]);

  // Handler for running routinary tasks cron job
  const handleRunRoutinaryCron = useCallback(async () => {
    setIsRunningCron(true);
    try {
      const response = await fetch("/api/cron/routinary-tasks", {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Routinary tasks created: ${data.result?.created || 0} tasks`
        );
      } else {
        toast.error(data.error || "Failed to run routinary tasks");
      }
    } catch {
      toast.error("Failed to run routinary tasks");
    } finally {
      setIsRunningCron(false);
    }
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        isMobile ? "bg-white" : "bg-neutral-100"
      )}
    >
      {/* User Info Section */}
      <div className="p-4 sm:p-6">
        <UserInfoCard />
      </div>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6"
        style={{ direction: "rtl" }}
      >
        <div style={{ direction: "ltr" }}>
          {/* Notifications */}
          <NotificationDropdown />

          {/* New Task Button */}
          {!isCustomer && (
            <Button
              onClick={handleNewTask}
              className="w-full mt-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all duration-200 justify-start"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          )}

          <DottedSeparator className="my-3 sm:my-4" />

          {/* Workspace Switcher */}
          <WorkspaceSwitcher />

          <DottedSeparator className="my-3 sm:my-4" />

          {/* Navigation Menu */}
          <Navigation />

          {/* Super Admin Cron Trigger */}
          {isSuperAdmin && (
            <>
              <DottedSeparator className="my-3 sm:my-4" />
              <Button
                onClick={handleRunRoutinaryCron}
                disabled={isRunningCron}
                variant="outline"
                className="w-full bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800 justify-start"
              >
                <Play className="w-4 h-4 mr-2" />
                {isRunningCron ? "Running..." : "Run Routinary Cron"}
              </Button>
            </>
          )}

          {/* Bottom spacing */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DESKTOP SIDEBAR
// ============================================================================

interface DesktopSidebarProps {
  className?: string;
}

/**
 * Desktop sidebar - always visible on large screens
 */
function DesktopSidebar({ className }: DesktopSidebarProps) {
  return (
    <aside
      className={cn(
        "hidden lg:flex h-full w-[264px] flex-col bg-neutral-100 border-r border-neutral-200",
        className
      )}
      aria-label="Sidebar navigation"
    >
      <SidebarContent />
    </aside>
  );
}

// ============================================================================
// MOBILE SIDEBAR
// ============================================================================

interface MobileSidebarProps {
  className?: string;
}

/**
 * Mobile sidebar - rendered as a sheet/drawer
 */
function MobileSidebar({ className }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close handler
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <Sheet modal={false} open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "lg:hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "hover:bg-muted active:bg-muted min-h-[44px] min-w-[44px] touch-manipulation",
            className
          )}
          aria-label="Open navigation menu"
        >
          <MenuIcon className="size-6 text-neutral-600" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="p-0 w-[280px] sm:w-[320px] max-w-[85vw]"
      >
        <SidebarContent onClose={handleClose} isMobile />
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// APP SIDEBAR (COMBINED)
// ============================================================================

/**
 * Main sidebar component that handles both desktop and mobile views
 *
 * Desktop: Static sidebar (264px width)
 * Mobile: Sheet/drawer triggered by hamburger button
 */
export function AppSidebar({ className, variant: _variant = "default" }: AppSidebarProps) {
  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <DesktopSidebar className={className} />
    </>
  );
}

/**
 * Mobile sidebar trigger button - use in navbar
 */
export function MobileSidebarTrigger({ className }: { className?: string }) {
  return <MobileSidebar className={className} />;
}

// ============================================================================
// SIDEBAR TRIGGER BUTTON (ALTERNATIVE)
// ============================================================================

interface SidebarTriggerProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Alternative trigger button that can be styled differently
 */
export function SidebarTrigger({ className, children }: SidebarTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <Sheet modal={false} open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="icon"
            className={cn("min-h-[44px] min-w-[44px]", className)}
            aria-label="Toggle sidebar"
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>

      <SheetContent side="left" className="p-0 w-[280px] sm:w-[320px]">
        <SidebarContent onClose={() => setIsOpen(false)} isMobile />
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DesktopSidebar, MobileSidebar, SidebarContent };
