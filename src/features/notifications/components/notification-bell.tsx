"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetNotificationCount } from "../api/use-get-notification-count";
import { useMarkNotificationsRead } from "../api/use-mark-notifications-read";
import { toast } from "sonner";

export const NotificationBell = () => {
  const { data: countData, isLoading } = useGetNotificationCount();
  const { mutate: markAllRead, isPending: isMarkingRead } = useMarkNotificationsRead();
  
  const unreadCount = countData?.data?.count || 0;

  const handleClick = () => {
    if (unreadCount > 0) {
      markAllRead(
        { json: { markAll: true } },
        {
          onSuccess: () => {
            toast.success("All notifications marked as read");
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        className="w-full justify-start bg-white/50 border-gray-200 hover:bg-gray-50 transition-all duration-200"
        disabled
      >
        <Bell className="w-4 h-4 mr-2" />
        Notifications
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleClick}
      variant="outline" 
      size="sm"
      className="w-full justify-start bg-white/50 border-gray-200 hover:bg-gray-50 transition-all duration-200 relative"
      disabled={isMarkingRead}
    >
      <Bell className="w-4 h-4 mr-2" />
      Notifications
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-medium min-w-[20px]"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};