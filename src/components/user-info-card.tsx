"use client";

import { useCurrent } from "@/features/auth/api/use-current";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Tag, Key } from "lucide-react";
import { ChangePasswordModal } from "@/features/auth/components/change-password-modal";
import { useState } from "react";

export const UserInfoCard = () => {
  const { data: user, isLoading } = useCurrent();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="w-fit">
        <CardContent className="p-5">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
            <div className="space-y-2">
              <div className="w-36 h-5 bg-gray-200 rounded animate-pulse" />
              <div className="w-48 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) return null;

  return (
    <Card className="w-fit bg-white/50 backdrop-blur-sm border-neutral-200">
      <CardContent className="p-5">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-medium text-neutral-900 text-lg">{user.name}</span>
              <div className="flex gap-2">
                {user.labels && user.labels.length > 0 ? (
                  user.labels.map((label: string) => (
                    <Badge 
                      key={label} 
                      variant="outline"
                      className={`text-sm px-3 py-1 h-6 ${
                        label === "admin" 
                          ? "bg-green-100 text-green-800 border-green-300" 
                          : "bg-gray-100 text-gray-700 border-gray-300"
                      }`}
                    >
                      <Tag className="w-4 h-4 mr-1" />
                      {label}
                    </Badge>
                  ))
                ) : (
                  <Badge 
                    variant="outline"
                    className="text-sm px-3 py-1 h-6 bg-gray-100 text-gray-700 border-gray-300"
                  >
                    <Tag className="w-4 h-4 mr-1" />
                    member
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Mail className="w-4 h-4" />
              {user.email}
            </div>
            <div className="pt-2">
              <Button
                onClick={() => setIsChangePasswordOpen(true)}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
              >
                <Key className="w-3 h-3 mr-1" />
                Change Password
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </Card>
  );
};