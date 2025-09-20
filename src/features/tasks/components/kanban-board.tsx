"use client";

import React, { useState } from "react";
import { DragDropContext, DropResult, Droppable, DragStart, DragUpdate } from "@hello-pangea/dnd";
import { Task, TaskStatus, PopulatedTask } from "../types";
import { KanbanCard } from "./kanban-card";
import { useUpdateTask } from "../api/use-update-task";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "@/lib/lucide-icons";
import { ReviewerSelectionModal } from "./reviewer-selection-modal";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Member } from "@/features/members/types";
import './drag-animations.css';

interface KanbanBoardProps {
  data: PopulatedTask[];
  totalCount: number;
  onChange?: (tasks: PopulatedTask[]) => void;
  onRequestBacklog?: () => void; // Callback to request backlog tasks when BACKLOG column is opened
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
}

const boards = [
  {
    key: TaskStatus.TODO,
    label: "To Do",
    color: "border-l-blue-500",
    bgColor: "bg-blue-500",
    emoji: "📝"
  },
  {
    key: TaskStatus.IN_PROGRESS,
    label: "In Progress",
    color: "border-l-amber-500",
    bgColor: "bg-amber-500",
    emoji: "🚀"
  },
  {
    key: TaskStatus.IN_REVIEW,
    label: "In Review",
    color: "border-l-purple-500",
    bgColor: "bg-purple-500",
    emoji: "👀"
  },
  {
    key: TaskStatus.DONE,
    label: "Done",
    color: "border-l-emerald-500",
    bgColor: "bg-emerald-500",
    emoji: "✅"
  },
  {
    key: TaskStatus.BACKLOG,
    label: "Backlog",
    color: "border-l-gray-500",
    bgColor: "bg-gray-500",
    emoji: "📋"
  },
];

interface CollapsibleColumnProps {
  board: {
    key: string;
    label: string;
    color: string;
    bgColor: string;
    emoji: string;
  };
  tasks: Task[];
  isExpanded: boolean;
  onToggle: () => void;
  taskCount: number;
  dragState: {
    isDragging: boolean;
    draggedTaskId: string | null;
    sourceColumnId: string | null;
    targetColumnId: string | null;
  };
}

const CollapsibleColumn = React.memo(({ board, tasks, isExpanded, onToggle, taskCount, dragState }: CollapsibleColumnProps) => {
  const isArchived = board.key === TaskStatus.ARCHIVED;
  
  // Determine if this column is highlighted during drag
  const isDropTarget = dragState.isDragging && dragState.targetColumnId === board.key;
  const isDropSource = dragState.isDragging && dragState.sourceColumnId === board.key;
  const isValidDropZone = dragState.isDragging && board.key !== TaskStatus.ARCHIVED && isExpanded;
  
  // Get enhanced styling based on drag state
  const getColumnStyling = () => {
    if (!dragState.isDragging) return "";
    
    if (isDropTarget && dragState.targetColumnId !== dragState.sourceColumnId) {
      return "ring-2 ring-blue-400 ring-offset-2 bg-blue-50/80 border-blue-300 shadow-lg transform scale-[1.02]";
    }
    
    if (isDropSource) {
      return "ring-2 ring-gray-300 ring-offset-1 bg-gray-50/50";
    }
    
    if (isValidDropZone) {
      return "ring-1 ring-blue-200 bg-blue-50/30 border-blue-200";
    }
    
    return "opacity-80";
  };
  
  return (
    <div className={`flex flex-col gap-y-2 transition-all duration-300 ease-out rounded-lg ${getColumnStyling()}`}>
      {isExpanded && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-auto p-0 hover:bg-transparent"
            >
              <div className="flex items-center gap-x-2">
                <ChevronDown className="size-4 text-neutral-500" />
                <span className="text-sm" role="img" aria-label={board.label}>
                  {board.emoji}
                </span>
                <div className={`w-2 h-2 rounded-full ${board.bgColor} shadow-sm`} />
                <h3 className="text-sm font-semibold text-gray-700">{board.label}</h3>
                <div className={`size-5 flex items-center justify-center rounded-full text-xs text-white font-medium shadow-sm ${
                  board.bgColor
                }`}>
                  {taskCount}
                </div>
              </div>
            </Button>
          </div>
        </div>
      )}

      {!isExpanded && (
        <div className="flex flex-col items-center py-2 h-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-auto p-1 hover:bg-neutral-200/50 rounded-md transition-colors mb-2"
          >
            <ChevronRight className="size-3 text-neutral-500" />
          </Button>

          <div className="flex flex-col items-center gap-2">
            <span className="text-sm" role="img" aria-label={board.label}>
              {board.emoji}
            </span>

            {/* Vertical text */}
            <div className="flex flex-col items-center gap-0.5">
              {board.label.split('').map((letter, index) => (
                <span key={index} className="text-xs font-medium text-gray-600 uppercase leading-none">
                  {letter === ' ' ? '·' : letter}
                </span>
              ))}
            </div>

            <div className={`size-4 flex items-center justify-center rounded-full text-xs text-white font-medium shadow-sm ${
              board.bgColor
            }`}>
              {taskCount}
            </div>
          </div>
        </div>
      )}
      
      {isExpanded && (
        <Droppable droppableId={board.key} isDropDisabled={isArchived}>
          {(provided, snapshot) => {
            const getDropZoneStyling = () => {
              if (isArchived) return 'opacity-75';
              
              if (snapshot.isDraggingOver) {
                return 'bg-gradient-to-b from-blue-50 to-blue-100/50 border-2 border-dashed border-blue-300 shadow-inner transform scale-[1.01]';
              }
              
              if (dragState.isDragging && isValidDropZone && !isDropTarget) {
                return 'border-2 border-dashed border-blue-200/60 bg-blue-50/20';
              }
              
              return '';
            };
            
            return (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`flex flex-col gap-y-2 h-[480px] max-h-[480px] overflow-y-auto overflow-x-auto touch-manipulation kanban-drop-zone rounded-lg p-2 ${getDropZoneStyling()}`}
                style={{ 
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#cbd5e1 #f1f5f9'
                }}
              >
                {tasks.map((task, index) => (
                  <KanbanCard 
                    key={task.id} 
                    task={task} 
                    index={index} 
                    isDragDisabled={isArchived} // Disable dragging for archived tasks
                    isBeingDragged={dragState.draggedTaskId === task.id}
                  />
                ))}
                {provided.placeholder}
                
                {/* Drop zone indicator when dragging over empty column */}
                {snapshot.isDraggingOver && tasks.length === 0 && (
                  <div className="flex items-center justify-center flex-1 min-h-[120px] border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/50 transition-all duration-200">
                    <div className="text-center">
                      <div className="text-2xl mb-2">{board.emoji}</div>
                      <p className="text-sm font-medium text-blue-700">Drop task here</p>
                      <p className="text-xs text-blue-600">Task will be moved to {board.label}</p>
                    </div>
                  </div>
                )}
                
                {/* Empty state for columns with no tasks */}
                {!snapshot.isDraggingOver && tasks.length === 0 && (
                  <div className="flex items-center justify-center flex-1 min-h-[120px] opacity-50">
                    <div className="text-center">
                      <div className="text-3xl mb-2 opacity-60">{board.emoji}</div>
                      <p className="text-sm text-gray-500">No tasks in {board.label}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          }}
        </Droppable>
      )}
    </div>
  );
});

CollapsibleColumn.displayName = "CollapsibleColumn";

export const KanbanBoard = ({ data, totalCount, onChange, onRequestBacklog, onLoadMore, isLoadingMore, hasMore }: KanbanBoardProps) => {
  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask({ showSuccessToast: false });
  const workspaceId = useWorkspaceId();
  const { data: membersData } = useGetMembers({ workspaceId });

  // Track expanded state for each column
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({
    [TaskStatus.TODO]: true,
    [TaskStatus.IN_PROGRESS]: true,
    [TaskStatus.IN_REVIEW]: true,
    [TaskStatus.DONE]: true, // Expanded by default
    [TaskStatus.BACKLOG]: true, // Expanded by default
  });

  // Track drag state for enhanced animations
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedTaskId: string | null;
    sourceColumnId: string | null;
    targetColumnId: string | null;
  }>({
    isDragging: false,
    draggedTaskId: null,
    sourceColumnId: null,
    targetColumnId: null,
  });

  // Reviewer selection modal state
  const [reviewerModal, setReviewerModal] = useState<{
    isOpen: boolean;
    taskId: string | null;
    taskName: string;
    pendingOperation: DropResult | null;
  }>({
    isOpen: false,
    taskId: null,
    taskName: "",
    pendingOperation: null,
  });

  const toggleColumn = (columnKey: string) => {
    const newExpandedState = !expandedColumns[columnKey];
    setExpandedColumns(prev => ({
      ...prev,
      [columnKey]: newExpandedState
    }));
    
    // If opening BACKLOG column and we have a callback, request backlog tasks
    if (columnKey === TaskStatus.BACKLOG && newExpandedState && onRequestBacklog) {
      onRequestBacklog();
    }
  };

  const onDragStart = React.useCallback((start: DragStart) => {
    setDragState({
      isDragging: true,
      draggedTaskId: start.draggableId,
      sourceColumnId: start.source.droppableId,
      targetColumnId: null,
    });
  }, []);
  
  const onDragUpdate = React.useCallback((update: DragUpdate) => {
    setDragState(prev => ({
      ...prev,
      targetColumnId: update.destination?.droppableId || null,
    }));
  }, []);

  const onDragEnd = React.useCallback(
    (result: DropResult) => {
      // Reset drag state
      setDragState({
        isDragging: false,
        draggedTaskId: null,
        sourceColumnId: null,
        targetColumnId: null,
      });
      
      if (!result.destination) return;

      // Validate draggable ID format
      const taskId = result.draggableId;
      if (!taskId || taskId.length > 36 || !/^[a-zA-Z0-9_]+$/.test(taskId)) {
        console.error("Invalid task ID in drag operation:", taskId);
        return;
      }

      const { source, destination } = result;
      const sourceStatus = source.droppableId as TaskStatus;
      const destStatus = destination.droppableId as TaskStatus;

      // Archived tasks are not shown in Kanban view, so no need to prevent drag to/from ARCHIVED
      
      // Add haptic feedback for mobile devices
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }

      let updatesPayload: { id: string; status?: TaskStatus; position: number }[] = [];

      if (sourceStatus !== destStatus) {
        const tasksToUpdate = [...data];
        const taskToMove = tasksToUpdate.find((task) => task.id === taskId);

        if (!taskToMove) {
          console.error("Task not found for ID:", taskId);
          return;
        }

        // Check if moving to IN_REVIEW and no reviewer is assigned
        if (destStatus === TaskStatus.IN_REVIEW && !taskToMove.reviewerId) {
          setReviewerModal({
            isOpen: true,
            taskId: taskToMove.id,
            taskName: taskToMove.name,
            pendingOperation: result,
          });
          return;
        }

        taskToMove.status = destStatus;

        updatesPayload.push({
          id: taskToMove.id,
          status: destStatus,
          position: Math.min((destination.index + 1) * 1000, 1_000_000),
        });

        onChange?.(tasksToUpdate);

        // Update task with correct API format
        const taskUpdate = updatesPayload[0];
        updateTask({
          param: { taskId: taskUpdate.id },
          json: {
            name: taskToMove.name,
            status: taskUpdate.status!,
            serviceId: taskToMove.serviceId,
            dueDate: taskToMove.dueDate || undefined,
            assigneeId: taskToMove.assigneeId || undefined,
            reviewerId: taskToMove.reviewerId || undefined,
            description: taskToMove.description || undefined,
            attachmentId: taskToMove.attachmentId || undefined,
          }
        });
      } else {
        const tasksToUpdate = [...data]
          .filter((task) => task.status === sourceStatus)
          .sort((a, b) => a.position - b.position);

        const taskToMove = tasksToUpdate[source.index];
        tasksToUpdate.splice(source.index, 1);
        tasksToUpdate.splice(destination.index, 0, taskToMove);

        const minimumPosition = tasksToUpdate[0]?.position ?? 0;

        updatesPayload = tasksToUpdate.map((task, index) => ({
          id: task.id,
          status: sourceStatus,
          position: minimumPosition + (index + 1) * 1000,
        }));

        onChange?.(
          data.map((task) => {
            const update = updatesPayload.find((u) => u.id === task.id);
            if (update) {
              return { ...task, ...update };
            }
            return task;
          })
        );

        // Update each task with correct API format
        updatesPayload.forEach((update) => {
          const task = data.find(t => t.id === update.id);
          if (!task) {
            console.error("Task not found for position update:", update.id);
            return;
          }
          
          updateTask({
            param: { taskId: update.id },
            json: {
              name: task.name,
              status: update.status!,
              serviceId: task.serviceId,
              dueDate: task.dueDate || undefined,
              assigneeId: task.assigneeId || undefined,
              description: task.description || undefined,
              attachmentId: task.attachmentId || undefined,
            }
          });
        });
      }
    },
    [data, onChange, updateTask]
  );

  // Handle reviewer selection confirmation
  const handleReviewerConfirm = React.useCallback((reviewerId: string) => {
    const { pendingOperation, taskId } = reviewerModal;

    if (!pendingOperation || !taskId) return;

    const taskToMove = data.find((task) => task.id === taskId);
    if (!taskToMove) return;

    // Update the task with both status change and reviewer assignment
    const updatedTask = { ...taskToMove, status: TaskStatus.IN_REVIEW, reviewerId };

    // Update local state
    const tasksToUpdate = data.map(task =>
      task.id === taskId ? updatedTask : task
    );
    onChange?.(tasksToUpdate);

    // Update via API
    updateTask({
      param: { taskId },
      json: {
        name: taskToMove.name,
        status: TaskStatus.IN_REVIEW,
        serviceId: taskToMove.serviceId,
        dueDate: taskToMove.dueDate || undefined,
        assigneeId: taskToMove.assigneeId || undefined,
        reviewerId: reviewerId,
        description: taskToMove.description || undefined,
        attachmentId: taskToMove.attachmentId || undefined,
      }
    });

    // Close modal
    setReviewerModal({
      isOpen: false,
      taskId: null,
      taskName: "",
      pendingOperation: null,
    });
  }, [reviewerModal, data, onChange, updateTask]);

  // Handle reviewer modal cancellation
  const handleReviewerCancel = React.useCallback(() => {
    setReviewerModal({
      isOpen: false,
      taskId: null,
      taskName: "",
      pendingOperation: null,
    });
  }, []);

  const tasks = React.useMemo(() => {
    const grouped: Record<string, Task[]> = {
      [TaskStatus.BACKLOG]: [],
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.IN_REVIEW]: [],
      [TaskStatus.DONE]: [],
    };

    data.forEach((task) => {
      // Skip archived tasks in Kanban view
      if (task.status === TaskStatus.ARCHIVED) {
        return;
      }
      
      // Only include tasks if their column is expanded
      if (!expandedColumns[task.status]) {
        return;
      }
      grouped[task.status]?.push(task);
    });

    Object.keys(grouped).forEach((status) => {
      grouped[status] = grouped[status].sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [data, expandedColumns]);

  // Count tasks for each column for the collapsed state (excluding archived)
  const taskCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    boards.forEach(board => {
      counts[board.key] = data.filter(task => 
        task.status === board.key && task.status !== TaskStatus.ARCHIVED
      ).length;
    });
    return counts;
  }, [data]);

  return (
    <div className="relative">
      <DragDropContext 
        onDragStart={onDragStart}
        onDragUpdate={onDragUpdate}
        onDragEnd={onDragEnd}
      >
        <div className={`flex overflow-x-auto gap-2 pb-4 kanban-drag-container ${
          isUpdating ? 'blur-sm opacity-75' : ''
        } ${dragState.isDragging ? 'select-none' : ''}`}>
          {boards.map((board) => {
            const isExpanded = expandedColumns[board.key];
            return (
              <div
                key={board.key}
                className={`flex-shrink-0 transition-all duration-300 ease-out bg-muted/70 border border-neutral-200/60 p-1.5 rounded-lg shadow-sm backdrop-blur-sm ${
                  dragState.isDragging ? 'transform-gpu' : ''
                } ${
                  isExpanded ? 'w-72 sm:w-80' : 'w-24 sm:w-28'
                }`}
              >
                <CollapsibleColumn
                  board={board}
                  tasks={tasks[board.key]}
                  isExpanded={expandedColumns[board.key]}
                  onToggle={() => toggleColumn(board.key)}
                  taskCount={taskCounts[board.key]}
                  dragState={dragState}
                />
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Load More button */}
      {hasMore && (
        <div className="flex justify-center mt-4 pb-2">
          <Button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            className="min-w-[200px]"
          >
            {isLoadingMore ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                <span>Loading...</span>
              </div>
            ) : (
              <span>
                Load More ({data.length} of {totalCount})
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Loading overlay during API updates only */}
      {isUpdating && (
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center pointer-events-none z-10">
          <div className="bg-white/90 backdrop-blur-md rounded-lg px-4 py-2 shadow-lg border">
            <div className="flex items-center gap-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm font-medium text-neutral-700">
                Updating task...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Reviewer Selection Modal */}
      <ReviewerSelectionModal
        isOpen={reviewerModal.isOpen}
        onClose={handleReviewerCancel}
        onConfirm={handleReviewerConfirm}
        members={(membersData?.documents || []) as Member[]}
        taskName={reviewerModal.taskName}
        isLoading={isUpdating}
      />
    </div>
  );
};