"use client";

import { useCallback, useState, useEffect } from "react";

import { DataFilters } from "@/features/tasks/components/data-filters";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useWorkspaceAuthorization } from "@/features/workspaces/hooks/use-workspace-authorization";
import { useTaskFilters } from "@/features/tasks/hooks/use-task-filters";
import { DataTablePaginated } from "@/features/tasks/components/data-table-paginated";
import { columns } from "@/features/tasks/components/columns";
import { KanbanBoard } from "@/features/tasks/components/kanban-board";
import { PopulatedTask } from "@/features/tasks/types";
import { ListTodo } from "@/lib/lucide-icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryState } from "nuqs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DottedSeparator } from "@/components/dotted-separator";
import { UserWelcomeBadge } from "@/components/user-welcome-badge";

export const WorkspaceTasksClient = () => {
  const workspaceId = useWorkspaceId();
  const { isAuthorized } = useWorkspaceAuthorization({ workspaceId });

  const [{ status, serviceId, assigneeId, dueDate, search }] = useTaskFilters();
  const [view, setView] = useQueryState("task-view", {
    defaultValue: "kanban"
  });

  // Separate state for kanban and table views
  const [kanbanTasks, setKanbanTasks] = useState<PopulatedTask[]>([]);
  const [kanbanOffset, setKanbanOffset] = useState(0);
  const KANBAN_BATCH_SIZE = 50;

  // Table pagination state
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(15);
  const TABLE_BATCH_SIZE = tablePageSize;

  // Determine which view is active to fetch appropriate data
  const isKanbanView = view === "kanban";
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
        defaultValue={view}
        onValueChange={setView}
        className="flex-1 w-full border rounded-lg"
      >
        <div className="h-full flex flex-col overflow-auto p-4 space-y-4">
          {/* Header Section: Tabs and User Info */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-3 sm:space-y-0 gap-3">
            {/* Tabs List */}
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger
                className="h-10 w-full sm:w-auto touch-manipulation"
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
            
            {/* User Welcome Message with Role */}
            <div className="hidden sm:block">
              <UserWelcomeBadge />
            </div>
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