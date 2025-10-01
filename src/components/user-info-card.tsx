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
import { Key, Building2, LogOut } from "@/lib/lucide-icons";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordModal } from "@/features/auth/components/change-password-modal";
import { DefaultWorkspaceModal } from "@/features/auth/components/default-workspace-modal";
import { useState, useEffect } from "react";

export const UserInfoCard = () => {
  const { data: user, isLoading } = useCurrent();
  const { mutate: logout } = useLogout();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isDefaultWorkspaceOpen, setIsDefaultWorkspaceOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) return null;

  // Determine role badge styling
  const getRoleBadge = () => {
    if (user.isSuperAdmin) {
      return {
        label: "Super Admin",
        className: "bg-purple-500 hover:bg-purple-600 text-white border-0"
      };
    } else if (user.isAdmin) {
      return {
        label: "Admin",
        className: "bg-yellow-500 hover:bg-yellow-600 text-white border-0"
      };
    } else {
      return {
        label: "Member",
        className: "bg-blue-500 hover:bg-blue-600 text-white border-0"
      };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-neutral-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {/* Circular Profile Photo */}
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white">
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>

                {/* User Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="font-semibold text-neutral-900 text-sm block truncate">{user.name}</span>
                  <Badge className={`${roleBadge.className} text-xs px-2.5 py-0.5 font-medium shadow-sm`}>
                    {roleBadge.label}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-56">
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

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      <DefaultWorkspaceModal
        isOpen={isDefaultWorkspaceOpen}
        onClose={() => setIsDefaultWorkspaceOpen(false)}
      />
    </div>
  );
};