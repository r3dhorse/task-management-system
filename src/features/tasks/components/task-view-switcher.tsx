"use client";

import { DottedSeparator } from "@/components/dotted-separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useGetTasks } from "../api/use-get-tasks";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useQueryState } from "nuqs";
import { DataFilters } from "./data-filters";
import { useTaskFilters } from "../hooks/use-task-filters";
import { DataTablePaginated } from "./data-table-paginated";
import { columns } from "./columns";
import { KanbanBoard } from "./kanban-board";
import { useCallback, useState, useEffect } from "react";
import { PopulatedTask } from "../types";
import { UserWelcomeBadge } from "@/components/user-welcome-badge";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";


export const TaskViewSwitcher = () => {
  const [{
    status,
    assigneeId,
    serviceId,
    dueDate
  }] = useTaskFilters();

  const [view, setView] = useQueryState("task-view", {
    defaultValue: "table"
  });
  const workspaceId = useWorkspaceId();
  const { data: workspace } = useGetWorkspace({ workspaceId });
  // Removed unused includeBacklog state

  // For table view, include archived tasks when ARCHIVED status is specifically selected
  const includeArchived = status === 'ARCHIVED';

  // Separate state for kanban and table views
  const [kanbanTasks, setKanbanTasks] = useState<PopulatedTask[]>([]);
  const [kanbanOffset, setKanbanOffset] = useState(0);
  const KANBAN_BATCH_SIZE = 50;

  // Table pagination state
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(20);
  const TABLE_BATCH_SIZE = tablePageSize;

  // Determine which view is active to fetch appropriate data
  const isKanbanView = view === "kanban";
  const currentOffset = isKanbanView ? kanbanOffset : (tablePage - 1) * tablePageSize;
  const currentLimit = isKanbanView ? KANBAN_BATCH_SIZE : TABLE_BATCH_SIZE;

  const {
    data: tasks,
    isLoading: isLoadingTasks,
    isFetching
  } = useGetTasks({
    workspaceId,
    serviceId,
    assigneeId,
    status,
    dueDate,
    includeArchived,
    limit: currentLimit,
    offset: currentOffset,
  });

  // Reset when filters or view changes
  useEffect(() => {
    setKanbanTasks([]);
    setKanbanOffset(0);
    setTablePage(1);
  }, [workspaceId, serviceId, assigneeId, status, dueDate]);

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

  const onRequestBacklog = useCallback(() => {
    // Handle backlog requests if needed in the future
  }, []);


  return (
    <Tabs
      defaultValue={view}
      onValueChange={setView}
      className="flex-1 w-full border rounded-lg"

    >
      <div className="h-full flex flex-col overflow-auto p-4 space-y-4">

        {/* Header Section: Tabs + User Info */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-3 sm:space-y-0 gap-3 min-h-[50px]">
          {/* Tabs List */}
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger
              className="h-10 w-full sm:w-auto touch-manipulation"
              value="table"
            >
              Table
            </TabsTrigger>
            <TabsTrigger
              className="h-10 w-full sm:w-auto touch-manipulation"
              value="kanban"
            >
              Kanban
            </TabsTrigger>
          
          </TabsList>

          {/* User Welcome Badge */}
          <div className="hidden sm:block">
            <UserWelcomeBadge />
          </div>

        </div>

        <DottedSeparator />
        {/* Placeholder for filters */}
        <div className="flex items-center justify-between gap-4">
          <DataFilters />
        </div>
        <DottedSeparator />
        {isLoadingTasks ? (
          <div className="w-full border rounded-lg h-[200px]">
            <LoadingSpinner variant="minimal" size="md" className="h-[200px]" />
          </div>
        ) : (
          <>
            {/* Tab content */}
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
            <TabsContent value="kanban" className="mt-0">
              <KanbanBoard
                data={kanbanTasks}
                totalCount={totalCount}
                onChange={onKanbanChange}
                onRequestBacklog={onRequestBacklog}
                onLoadMore={handleLoadMoreKanban}
                isLoadingMore={isLoadingMore}
                hasMore={hasMoreKanban}
                withReviewStage={workspace?.withReviewStage ?? true}
              />
            </TabsContent>
        
          </>
        )}
      </div>
    </Tabs>
  );
};
