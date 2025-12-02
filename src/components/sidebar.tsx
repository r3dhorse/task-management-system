"use client";

import { useState } from "react";
import { DottedSeparator } from "./dotted-separator";
import { Navigation } from "./navigation";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { UserInfoCard } from "./user-info-card";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { Button } from "./ui/button";
import { Plus, Play } from "@/lib/lucide-icons";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";
import { useCurrent } from "@/features/auth/api/use-current";
import { toast } from "sonner";




export const Sidebar = () => {
  const { open } = useCreateTaskModal();
  const [isRunningCron, setIsRunningCron] = useState(false);

  // Get current user information
  const { data: currentUser } = useCurrent();
  const isSuperAdmin = currentUser?.isSuperAdmin;

  // Handler for running routinary tasks cron job
  const handleRunRoutinaryCron = async () => {
    setIsRunningCron(true);
    try {
      const response = await fetch('/api/cron/routinary-tasks', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        toast.success(`Routinary tasks created: ${data.result?.created || 0} tasks`);
      } else {
        toast.error(data.error || 'Failed to run routinary tasks');
      }
    } catch {
      toast.error('Failed to run routinary tasks');
    } finally {
      setIsRunningCron(false);
    }
  };

  return (
    <aside
      className="h-full w-[270px] sm:w-[290px] lg:w-[270px] bg-neutral-100 border-r flex flex-col overflow-hidden"
      aria-label="Sidebar"
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6" style={{ direction: 'rtl' }}>
        <div style={{ direction: 'ltr' }}>
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

          {/* Temporary: Routinary Tasks Cron Trigger (Super Admin Only) */}
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
        </div>
      </div>
    </aside>
  );
};
