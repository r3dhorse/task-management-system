"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, MessageSquare, UserPlus, FileEdit, MessageCircle } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetNotifications } from "../api/use-get-notifications";
import { useGetNotificationCount } from "../api/use-get-notification-count";
import { useMarkNotificationsRead } from "../api/use-mark-notifications-read";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  workspaceId: string;
  taskId?: string | null;
  task?: {
    id: string;
    name: string;
  } | null;
  mentioner?: {
    id: string;
    name: string;
  } | null;
  workspace?: {
    id: string;
    name: string;
  } | null;
}

export const NotificationDropdown = () => {
  const router = useRouter();
  const { data: notifications, isLoading: isLoadingNotifications } = useGetNotifications();
  const { data: countData } = useGetNotificationCount();
  const { mutate: markAsRead } = useMarkNotificationsRead();

  const unreadCount = countData?.data?.count || 0;
  const notificationList = (notifications?.data?.documents || []) as Notification[];

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already
    if (!notification.isRead) {
      markAsRead({
        json: { notificationIds: [notification.id] }
      });
    }

    // Navigate to task using the workspace ID from the notification
    if (notification.taskId && notification.workspaceId) {
      router.push(`/workspaces/${notification.workspaceId}/tasks/${notification.taskId}`);
    }
  };

  const handleMarkAllRead = () => {
    markAsRead(
      { json: { markAll: true } },
      {
        onSuccess: () => {
          toast.success("All notifications marked as read");
        }
      }
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "MENTION":
        return <MessageCircle className="w-4 h-4" />;
      case "NEW_MESSAGE":
        return <MessageSquare className="w-4 h-4" />;
      case "TASK_ASSIGNED":
        return <UserPlus className="w-4 h-4" />;
      case "TASK_UPDATE":
        return <FileEdit className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="w-full justify-start bg-white/50 border-gray-200 hover:bg-gray-50 transition-all duration-200 relative"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Mentions
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-medium min-w-[20px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-96 p-0"
        sideOffset={5}
      >
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Mentions
            </h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-96">
          {isLoadingNotifications ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : notificationList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <MessageCircle className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-sm">No mentions yet</p>
              <p className="text-xs text-gray-400 mt-1">When someone @mentions you, it&apos;ll appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notificationList.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "px-3 py-3 cursor-pointer hover:bg-gray-50 focus:bg-gray-50",
                    !notification.isRead && "bg-blue-50/50 hover:bg-blue-50"
                  )}
                >
                  <div className="flex gap-3 w-full">
                    {/* Icon or Avatar */}
                    <div className="flex-shrink-0">
                      {notification.mentioner ? (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                            {getInitials(notification.mentioner.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          notification.type === "MENTION" ? "bg-blue-100 text-blue-600" :
                          notification.type === "TASK_ASSIGNED" ? "bg-green-100 text-green-600" :
                          notification.type === "TASK_UPDATE" ? "bg-yellow-100 text-yellow-600" :
                          "bg-gray-100 text-gray-600"
                        )}>
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm line-clamp-1",
                            !notification.isRead ? "font-semibold text-gray-900" : "text-gray-700"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                            {notification.message}
                          </p>
                          {notification.task && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <FileEdit className="w-3 h-3" />
                              {notification.task.name}
                            </p>
                          )}
                          {notification.workspace && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              in {notification.workspace.name}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 ml-auto" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>

        {notificationList.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sm text-gray-600 hover:text-gray-900"
                onClick={() => {
                  // Could navigate to a dedicated mentions page
                  toast.info("Mentions page coming soon!");
                }}
              >
                View all mentions
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};