"use client";

import { useCallback, useState, useEffect, useMemo } from "react";

import { DataFilters } from "@/features/tasks/components/data-filters";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useWorkspaceAuthorization } from "@/features/workspaces/hooks/use-workspace-authorization";
import { useTaskFilters } from "@/features/tasks/hooks/use-task-filters";
import { DataTablePaginated } from "@/features/tasks/components/data-table-paginated";
import { columns } from "@/features/tasks/components/columns";
import { KanbanBoard } from "@/features/tasks/components/kanban-board";
import { PopulatedTask } from "@/features/tasks/types";
import { ListTodo, Download } from "@/lib/lucide-icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQueryState } from "nuqs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DottedSeparator } from "@/components/dotted-separator";
import { useCurrent } from "@/features/auth/api/use-current";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { MemberRole } from "@/features/members/types";
import { toast } from "sonner";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";

export const WorkspaceTasksClient = () => {
  const workspaceId = useWorkspaceId();
  const { isAuthorized } = useWorkspaceAuthorization({ workspaceId });
  const { data: user } = useCurrent();
  const { data: members } = useGetMembers({ workspaceId });
  const { data: workspace } = useGetWorkspace({ workspaceId });

  const [{ status, serviceId, assigneeId, dueDate, search }] = useTaskFilters();
  const [isExporting, setIsExporting] = useState(false);
  const [view, setView] = useQueryState("task-view", {
    defaultValue: "table" // Default to table for mobile-first approach
  });

  // Track if we're on mobile to disable kanban
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Force table view on mobile
  const effectiveView = useMemo(() => {
    if (isMobile && view === "kanban") {
      return "table";
    }
    return view;
  }, [isMobile, view]);

  // Separate state for kanban and table views
  const [kanbanTasks, setKanbanTasks] = useState<PopulatedTask[]>([]);
  const [kanbanOffset, setKanbanOffset] = useState(0);
  const KANBAN_BATCH_SIZE = 50;

  // Table pagination state
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(15);
  const TABLE_BATCH_SIZE = tablePageSize;

  // Determine which view is active to fetch appropriate data
  const isKanbanView = effectiveView === "kanban";
  const currentOffset = isKanbanView ? kanbanOffset : (tablePage - 1) * tablePageSize;
  const currentLimit = isKanbanView ? KANBAN_BATCH_SIZE : TABLE_BATCH_SIZE;

  const { data: tasks, isLoading: isLoadingTasks, isFetching } = useGetTasks({
    workspaceId,
    serviceId,
    assigneeId,
    status,
    dueDate,
    search,
    limit: currentLimit,
    offset: currentOffset,
    includeArchived: false, // Explicitly exclude archived tasks from load more count
  });

  // Reset when filters or view changes
  useEffect(() => {
    setKanbanTasks([]);
    setKanbanOffset(0);
    setTablePage(1);
  }, [workspaceId, serviceId, assigneeId, status, dueDate, search]);

  // Handle data for kanban view (accumulative loading)
  useEffect(() => {
    if (tasks?.documents && isKanbanView) {
      if (kanbanOffset === 0) {
        setKanbanTasks(tasks.documents as unknown as PopulatedTask[]);
      } else {
        setKanbanTasks(prev => {
          const newTasks = tasks.documents as unknown as PopulatedTask[];
          const existingIds = new Set(prev.map(t => t.id));
          const uniqueNewTasks = newTasks.filter(t => !existingIds.has(t.id));
          return [...prev, ...uniqueNewTasks];
        });
      }
    }
  }, [tasks, kanbanOffset, isKanbanView]);

  // Table data is fetched per page, not accumulated
  const tableData = !isKanbanView && tasks?.documents ? tasks.documents as unknown as PopulatedTask[] : [];

  const totalCount = tasks?.total || 0;
  const hasMoreKanban = kanbanTasks.length < totalCount;
  const isLoadingMore = isFetching && kanbanOffset > 0;

  const handleLoadMoreKanban = useCallback(() => {
    if (!isLoadingMore && hasMoreKanban) {
      setKanbanOffset(prev => prev + KANBAN_BATCH_SIZE);
    }
  }, [isLoadingMore, hasMoreKanban]);

  const handlePageChange = useCallback((newPage: number) => {
    setTablePage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setTablePageSize(newPageSize);
    setTablePage(1); // Reset to first page when page size changes
  }, []);

  const onKanbanChange = useCallback(() => {
    // This will be handled by React Query's cache update
  }, []);

  // Check if user has export permission
  const currentMember = members?.documents?.find(member => member.userId === user?.id);
  const hasExportPermission = user?.isSuperAdmin ||
                             user?.isAdmin ||
                             currentMember?.role === MemberRole.ADMIN;

  // Handle export to Excel
  const handleExportToExcel = useCallback(async () => {
    if (!hasExportPermission) {
      toast.error("You don't have permission to export tasks");
      return;
    }

    setIsExporting(true);
    try {
      // Build query parameters for the export API
      const params = new URLSearchParams();
      if (serviceId) params.append('serviceId', serviceId);
      if (assigneeId) params.append('assigneeId', assigneeId);
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      if (dueDate) params.append('dueDate', dueDate);

      const response = await fetch(`/api/workspaces/${workspaceId}/tasks/export?${params.toString()}`);

      if (!response.ok) {
        if (response.headers.get('content-type')?.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Export failed');
        } else {
          throw new Error('Export failed');
        }
      }

      // Get the file blob and download it
      const blob = await response.blob();

      if (blob.size === 0) {
        toast.info("No tasks found to export");
        return;
      }

      // Extract filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || `Workspace_${workspaceId}_Tasks_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Tasks exported successfully");

    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export tasks');
    } finally {
      setIsExporting(false);
    }
  }, [workspaceId, serviceId, assigneeId, status, search, dueDate, hasExportPermission]);

  // Don't render anything if not authorized (redirection will happen)
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col gap-y-2 lg:flex-row justify-between items-start lg:items-center">
        <div className="flex items-center gap-x-2">
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <ListTodo className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Workspace Tasks</h1>
            <p className="text-sm text-muted-foreground">All tasks in this workspace</p>
          </div>
        </div>
      </div>
      
      <Tabs
        value={effectiveView}
        onValueChange={setView}
        className="flex-1 w-full border rounded-lg"
      >
        <div className="h-full flex flex-col overflow-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Header Section: Tabs and Export Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            {/* On mobile, only show Table tab. On desktop, show both */}
            <TabsList className="w-full sm:w-auto">
              {/* Kanban tab - hidden on mobile */}
              <TabsTrigger
                className="hidden sm:inline-flex h-10 w-full sm:w-auto touch-manipulation"
                value="kanban"
              >
                Kanban
              </TabsTrigger>
              <TabsTrigger
                className="h-10 w-full sm:w-auto touch-manipulation"
                value="table"
              >
                Table
              </TabsTrigger>
            </TabsList>

            {/* Download List Button - Only visible to workspace admins and super users */}
            {hasExportPermission && (
              <Button
                onClick={handleExportToExcel}
                disabled={isExporting}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto h-10 gap-2 bg-green-50 hover:bg-green-100 border-green-200 hover:border-green-300 text-green-700 hover:text-green-800 transition-colors"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    Download List
                  </>
                )}
              </Button>
            )}
          </div>

          <DottedSeparator />
          <DataFilters />
          <DottedSeparator />
          
          {isLoadingTasks ? (
            <div className="w-full border rounded-lg h-[200px]">
              <LoadingSpinner variant="minimal" size="md" className="h-[200px]" />
            </div>
          ) : (!isKanbanView && (!tableData || tableData.length === 0)) || (isKanbanView && (!kanbanTasks || kanbanTasks.length === 0)) ? (
            <div className="w-full border rounded-lg h-[200px] flex items-center justify-center">
              <div className="text-center">
                <ListTodo className="size-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground font-medium">No tasks found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tasks in this workspace will appear here. Create a new task to get started!
                </p>
              </div>
            </div>
          ) : (
            <>
              <TabsContent value="kanban" className="mt-0">
                <KanbanBoard
                  data={kanbanTasks}
                  totalCount={totalCount}
                  onChange={onKanbanChange}
                  onLoadMore={handleLoadMoreKanban}
                  isLoadingMore={isLoadingMore}
                  hasMore={hasMoreKanban}
                  withReviewStage={workspace?.withReviewStage ?? true}
                />
              </TabsContent>
              <TabsContent value="table" className="mt-0">
                <DataTablePaginated
                  columns={columns}
                  data={tableData}
                  totalCount={totalCount}
                  pageSize={tablePageSize}
                  currentPage={tablePage}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
};