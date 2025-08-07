"use client";

import Image from "next/image";
import Link from "next/link";
import { DottedSeparator } from "./dotted-separator";
import { Navigation } from "./navigation";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { ServiceSwitcher } from "./service-switcher";
import { useLogout } from "@/features/auth/api/use-logout";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { Button } from "./ui/button";
import { LogOutIcon, Plus } from "@/lib/lucide-icons";
import { useConfirm } from "@/hooks/use-confirm";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";




export const Sidebar = () => {
  const { mutate: logout } = useLogout();
  const { open } = useCreateTaskModal();

  const [LogoutDialog, confirmLogout] = useConfirm(
    "Confirm Logout",
    "Are you sure you want to log out? You will need to sign in again to access your account.",
    "destructive",
  );

  const handleLogout = async () => {
    const ok = await confirmLogout();
    if (!ok) return;
    logout();
  };

  return (
    <aside
      className="h-full w-64 sm:w-72 lg:w-64 bg-neutral-100 p-4 sm:p-6 flex flex-col justify-between border-r"
      aria-label="Sidebar"
    >
      <LogoutDialog />
      <div>
        <Link href="/" className="block mb-4 sm:mb-6">
          <Image 
            src="/logo.svg" 
            alt="Task Management - Go to homepage" 
            width={240} 
            height={80} 
            className="h-16 sm:h-20 w-auto max-w-full"
            priority
          />
        </Link>

        <DottedSeparator className="my-3 sm:my-4" />
        <NotificationDropdown />
        <DottedSeparator className="my-3 sm:my-4" />
        <WorkspaceSwitcher />
        <DottedSeparator className="my-3 sm:my-4" />
        < Navigation />
        <DottedSeparator className="my-3 sm:my-4" />
        <Button 
          onClick={open} 
          className="w-full bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
        <DottedSeparator className="my-3 sm:my-4" />
        < ServiceSwitcher />
      </div>

      <div className="flex flex-col gap-4">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full bg-gradient-to-r from-red-50 to-pink-50 border-red-200 hover:from-red-100 hover:to-pink-100 hover:border-red-300 text-red-700 hover:text-red-800 shadow-sm transition-all duration-200"
        >
          <LogOutIcon className="w-4 h-4 mr-2" />
          Log out
        </Button>
      </div>
    </aside>
  );
};
