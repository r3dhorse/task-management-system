"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, CheckCheck, UserPlus, FileEdit, Bell, ChevronLeft, ChevronRight, X, ClipboardCheck } from "@/lib/lucide-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
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

interface NotificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsModal({ open, onOpenChange }: NotificationsModalProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState<string>("");

  const {
    data,
    isLoading,
    error
  } = useGetNotificationsPaginated({
    page: currentPage,
    limit: 7,
    type: selectedType || undefined,
  });

  const { mutate: markAsRead } = useMarkNotificationsRead();

  const paginationData = data?.data as PaginationData | undefined;
  const notificationsList = useMemo(() => paginationData?.documents || [], [paginationData]);
  const totalCount = paginationData?.total || 0;
  const totalPages = paginationData?.totalPages || 1;
  const hasNext = paginationData?.hasNext || false;
  const hasPrev = paginationData?.hasPrev || false;

  // Reset states when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentPage(1);
      setSelectedType("");
    }
  }, [open]);

  const handleNotificationClick = useCallback((notification: Notification) => {
    // Mark as read if not already
    if (!notification.isRead) {
      markAsRead({
        json: { notificationIds: [notification.id] }
      });
    }

    // Close modal first
    onOpenChange(false);

    // Navigate to task using the workspace ID from the notification
    if (notification.taskId && notification.workspaceId) {
      // Add a timestamp parameter to force refresh and ensure latest data is fetched
      const url = `/workspaces/${notification.workspaceId}/tasks/${notification.taskId}?refresh=${Date.now()}`;
      router.push(url);
    }
  }, [markAsRead, onOpenChange, router]);

  const handleMarkAllRead = useCallback(() => {
    markAsRead(
      { json: { markAll: true } },
      {
        onSuccess: () => {
          toast.success("All notifications marked as read");
        }
      }
    );
  }, [markAsRead]);

  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case "MENTION":
        return <MessageCircle className="w-5 h-5" />;
      case "NEW_MESSAGE":
        return <MessageCircle className="w-5 h-5" />;
      case "TASK_ASSIGNED":
        return <UserPlus className="w-5 h-5" />;
      case "TASK_UPDATE":
        return <FileEdit className="w-5 h-5" />;
      case "REVIEWER_ASSIGNED":
        return <ClipboardCheck className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  }, []);

  const getInitials = useCallback((name: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  }, [totalPages]);

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case "MENTION":
        return "bg-blue-100 text-blue-600";
      case "TASK_ASSIGNED":
        return "bg-green-100 text-green-600";
      case "TASK_UPDATE":
        return "bg-yellow-100 text-yellow-600";
      case "REVIEWER_ASSIGNED":
        return "bg-purple-100 text-purple-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  }, []);

  const unreadCount = useMemo(() =>
    notificationsList.filter(n => !n.isRead).length
  , [notificationsList]);

  // Memoized pagination info to prevent recalculation
  const paginationInfo = useMemo(() => {
    if (!paginationData) return null;

    const startItem = ((currentPage - 1) * 7) + 1;
    const endItem = Math.min(currentPage * 7, totalCount);

    return {
      startItem,
      endItem,
      totalCount,
      totalPages,
      hasMultiplePages: totalPages > 1,
    };
  }, [paginationData, currentPage, totalCount, totalPages]);

  // Memoized page numbers for pagination
  const pageNumbers = useMemo(() => {
    if (!paginationInfo) return [];

    const { totalPages } = paginationInfo;
    const maxPages = Math.min(5, totalPages);
    const startPage = Math.max(1, Math.min(
      totalPages - 4,
      Math.max(1, currentPage - 2)
    ));

    return Array.from({ length: maxPages }, (_, i) => {
      const pageNum = startPage + i;
      return pageNum <= totalPages ? pageNum : null;
    }).filter(Boolean) as number[];
  }, [paginationInfo, currentPage]);

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          <DialogTitle className="sr-only">Notifications Error</DialogTitle>
          <div className="p-6">
            <p className="text-red-500">Error loading notifications: {error.message}</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
              Try Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-white/70 backdrop-blur-md" />
        <DialogContent
          className="max-w-4xl h-[80vh] p-0 gap-0 bg-white/95 backdrop-blur-sm border shadow-lg"
          style={{ transform: "translate(-50%, -50%)", left: "50%", top: "50%", position: "fixed" }}
          hideCloseButton={true}
        >
          <div className="flex flex-col h-full">
            {/* Header with close button */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-blue-600" />
                <DialogTitle className="text-xl font-semibold">All Notifications</DialogTitle>
                {totalCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {totalCount}
                  </Badge>
                )}
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b px-6 overflow-x-auto">
              {[
                { value: "", label: "All", count: totalCount },
                { value: "MENTION", label: "Mentions" },
                { value: "TASK_ASSIGNED", label: "Tasks" },
                { value: "REVIEWER_ASSIGNED", label: "Reviews" },
                { value: "TASK_UPDATE", label: "Updates" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => {
                    setSelectedType(filter.value);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-4 py-3 text-sm font-medium rounded-t-lg transition-colors relative",
                    selectedType === filter.value
                      ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  {filter.label}
                  {filter.count !== undefined && filter.value === "" && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {filter.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="md" />
                  </div>
                ) : notificationsList.length === 0 ? (
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
                    {notificationsList.map((notification) => (
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
              </div>
            </div>

            {/* Pagination Footer */}
            {paginationInfo?.hasMultiplePages && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 border-t bg-gray-50/50">
                <div className="text-sm text-gray-600">
                  Showing {paginationInfo.startItem} to {paginationInfo.endItem} of {paginationInfo.totalCount} notifications
                </div>
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
                    {pageNumbers.map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    ))}
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
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}