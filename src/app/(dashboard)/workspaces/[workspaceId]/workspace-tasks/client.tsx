"use client";

import { useCallback } from "react";

import { DataFilters } from "@/features/tasks/components/data-filters";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useWorkspaceAuthorization } from "@/features/workspaces/hooks/use-workspace-authorization";
import { useTaskFilters } from "@/features/tasks/hooks/use-task-filters";
import { DataTable } from "@/features/tasks/components/data-table";
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

  const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({
    workspaceId,
    serviceId,
    assigneeId,
    status,
    dueDate,
    search,
  });

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
          ) : !tasks?.documents || tasks.documents.length === 0 ? (
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
                  data={(tasks?.documents || []) as unknown as PopulatedTask[]}
                  onChange={onKanbanChange}
                />
              </TabsContent>
              <TabsContent value="table" className="mt-0">
                <DataTable 
                  columns={columns} 
                  data={(tasks?.documents || []) as unknown as PopulatedTask[]} 
                />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
};