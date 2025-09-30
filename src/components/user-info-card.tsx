"use client";

import { useCurrent } from "@/features/auth/api/use-current";
import { useLogout } from "@/features/auth/api/use-logout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { User, Mail, Key, Building2, LogOut, Wrench } from "@/lib/lucide-icons";
import { ChangePasswordModal } from "@/features/auth/components/change-password-modal";
import { DefaultWorkspaceModal } from "@/features/auth/components/default-workspace-modal";
import { useState } from "react";

export const UserInfoCard = () => {
  const { data: user, isLoading } = useCurrent();
  const { mutate: logout } = useLogout();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isDefaultWorkspaceOpen, setIsDefaultWorkspaceOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) return null;

  return (
    <Card className="w-full bg-white/50 backdrop-blur-sm border-neutral-200">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <span className="font-medium text-neutral-900 text-sm block truncate">{user.name}</span>
            <div className="flex items-center gap-1 text-xs text-neutral-600">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{user.email}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 p-0 hover:bg-neutral-200 rounded-sm"
                  >
                    <Wrench className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="cursor-pointer"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsDefaultWorkspaceOpen(true)}
                    className="cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Default Workspace
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="cursor-pointer text-amber-700 focus:text-amber-700"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      <DefaultWorkspaceModal
        isOpen={isDefaultWorkspaceOpen}
        onClose={() => setIsDefaultWorkspaceOpen(false)}
      />
    </Card>
  );
};