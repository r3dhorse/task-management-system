"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { 
  MessageCircle, 
  CheckCheck, 
  UserPlus, 
  FileEdit, 
  Bell,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useGetNotificationsPaginated } from "@/features/notifications/api/use-get-notifications-paginated";
import { useMarkNotificationsRead } from "@/features/notifications/api/use-mark-notifications-read";
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

interface PaginationData {
  documents: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function MentionsPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState<string>("");

  const { 
    data, 
    isLoading, 
    error 
  } = useGetNotificationsPaginated({
    page: currentPage,
    limit: 20,
    type: selectedType || undefined,
  });

  const { mutate: markAsRead } = useMarkNotificationsRead();

  const paginationData = data?.data as PaginationData | undefined;
  const notifications = paginationData?.documents || [];
  const totalCount = paginationData?.total || 0;
  const totalPages = paginationData?.totalPages || 1;
  const hasNext = paginationData?.hasNext || false;
  const hasPrev = paginationData?.hasPrev || false;

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already
    if (!notification.isRead) {
      markAsRead({
        json: { notificationIds: [notification.id] }
      });
    }

    // Navigate to task using the workspace ID from the notification
    if (notification.taskId && notification.workspaceId) {
      // Add a timestamp parameter to force refresh and ensure latest data is fetched
      const url = `/workspaces/${notification.workspaceId}/tasks/${notification.taskId}?refresh=${Date.now()}`;
      router.push(url);
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
        return <MessageCircle className="w-5 h-5" />;
      case "NEW_MESSAGE":
        return <MessageCircle className="w-5 h-5" />;
      case "TASK_ASSIGNED":
        return <UserPlus className="w-5 h-5" />;
      case "TASK_UPDATE":
        return <FileEdit className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "MENTION":
        return "bg-blue-100 text-blue-600";
      case "TASK_ASSIGNED":
        return "bg-green-100 text-green-600";
      case "TASK_UPDATE":
        return "bg-yellow-100 text-yellow-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-red-500 mb-2">Failed to load notifications</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Bell className="w-7 h-7 text-blue-600" />
              All Notifications
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {totalCount} total notification{totalCount !== 1 ? 's' : ''}
              {unreadCount > 0 && (
                <span className="ml-2">
                  · <span className="font-semibold text-blue-600">{unreadCount} unread</span>
                </span>
              )}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-blue-600 hover:text-blue-700"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { value: "", label: "All", count: totalCount },
          { value: "MENTION", label: "Mentions" },
          { value: "TASK_ASSIGNED", label: "Tasks" },
          { value: "TASK_UPDATE", label: "Updates" },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setSelectedType(filter.value);
              setCurrentPage(1);
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative",
              selectedType === filter.value
                ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            {filter.label}
            {filter.count !== undefined && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {filter.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <MessageCircle className="w-12 h-12 mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No notifications found</h3>
              <p className="text-sm text-gray-400 text-center max-w-md">
                {selectedType 
                  ? `No ${selectedType.toLowerCase()} notifications to display.`
                  : "When you receive notifications, they'll appear here."
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "p-4 cursor-pointer hover:bg-gray-50 transition-colors",
                    !notification.isRead && "bg-blue-50/30 hover:bg-blue-50/50"
                  )}
                >
                  <div className="flex gap-4">
                    {/* Icon or Avatar */}
                    <div className="flex-shrink-0">
                      {notification.mentioner ? (
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="text-sm bg-blue-100 text-blue-600">
                            {getInitials(notification.mentioner.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          getTypeColor(notification.type)
                        )}>
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm mb-1 line-clamp-2",
                            !notification.isRead ? "font-semibold text-gray-900" : "text-gray-700"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          
                          {/* Task and Workspace Info */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            {notification.task && (
                              <span className="text-blue-600 flex items-center gap-1">
                                <FileEdit className="w-3 h-3" />
                                {notification.task.name}
                              </span>
                            )}
                            {notification.workspace && (
                              <span className="text-gray-500">
                                in {notification.workspace.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side - timestamp and unread indicator */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-gray-500 mb-1">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} notifications
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!hasPrev}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "primary" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNext}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}