"use client";

import React, { useState } from "react";
import { DragDropContext, DropResult, Droppable, DragStart, DragUpdate } from "@hello-pangea/dnd";
import { Task, TaskStatus, PopulatedTask } from "../types";
import { KanbanCard } from "./kanban-card";
import { useUpdateTask } from "../api/use-update-task";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import './drag-animations.css';

interface KanbanBoardProps {
  data: PopulatedTask[];
  onChange?: (tasks: PopulatedTask[]) => void;
  onRequestBacklog?: () => void; // Callback to request backlog tasks when BACKLOG column is opened
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-auto p-0 hover:bg-transparent"
          >
            <div className="flex items-center gap-x-2">
              {isExpanded ? (
                <ChevronDown className="size-4 text-neutral-500" />
              ) : (
                <ChevronRight className="size-4 text-neutral-500" />
              )}
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
                    key={task.$id} 
                    task={task} 
                    index={index} 
                    isDragDisabled={isArchived} // Disable dragging for archived tasks
                    isBeingDragged={dragState.draggedTaskId === task.$id}
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
      
      {!isExpanded && (
        <div className="flex items-center justify-center h-[480px] kanban-collapsed-state rounded-lg border-2 border-dashed border-neutral-300/80 bg-neutral-50/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-2xl mb-2 opacity-60">{board.emoji}</div>
            <p className="text-xs text-neutral-500 font-medium">
              {taskCount === 0 ? `No tasks in ${board.label}` : `${taskCount} task${taskCount === 1 ? '' : 's'}`}
            </p>
            <p className="text-xs text-neutral-400 mt-1">Click to expand</p>
          </div>
        </div>
      )}
    </div>
  );
});

CollapsibleColumn.displayName = "CollapsibleColumn";

export const KanbanBoard = ({ data, onChange, onRequestBacklog }: KanbanBoardProps) => {
  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask();
  
  // Track expanded state for each column
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({
    [TaskStatus.TODO]: true,
    [TaskStatus.IN_PROGRESS]: true,
    [TaskStatus.IN_REVIEW]: true,
    [TaskStatus.DONE]: false, // Collapsed by default
    [TaskStatus.BACKLOG]: false, // Collapsed by default
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

      let updatesPayload: { $id: string; status?: TaskStatus; position: number }[] = [];

      if (sourceStatus !== destStatus) {
        const tasksToUpdate = [...data];
        const taskToMove = tasksToUpdate.find((task) => task.$id === taskId);
        
        if (!taskToMove) {
          console.error("Task not found for ID:", taskId);
          return;
        }

        taskToMove.status = destStatus;
        
        updatesPayload.push({
          $id: taskToMove.$id,
          status: destStatus,
          position: Math.min((destination.index + 1) * 1000, 1_000_000),
        });

        onChange?.(tasksToUpdate);
        
        // Update task with correct API format
        const taskUpdate = updatesPayload[0];
        updateTask({
          param: { taskId: taskUpdate.$id },
          json: {
            name: taskToMove.name,
            status: taskUpdate.status!,
            serviceId: taskToMove.serviceId,
            dueDate: taskToMove.dueDate,
            assigneeId: taskToMove.assigneeId,
            description: taskToMove.description,
            attachmentId: taskToMove.attachmentId,
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
          $id: task.$id,
          status: sourceStatus,
          position: minimumPosition + (index + 1) * 1000,
        }));

        onChange?.(
          data.map((task) => {
            const update = updatesPayload.find((u) => u.$id === task.$id);
            if (update) {
              return { ...task, ...update };
            }
            return task;
          })
        );

        // Update each task with correct API format
        updatesPayload.forEach((update) => {
          const task = data.find(t => t.$id === update.$id);
          if (!task) {
            console.error("Task not found for position update:", update.$id);
            return;
          }
          
          updateTask({
            param: { taskId: update.$id },
            json: {
              name: task.name,
              status: update.status!,
              serviceId: task.serviceId,
              dueDate: task.dueDate,
              assigneeId: task.assigneeId,
              description: task.description,
              attachmentId: task.attachmentId,
            }
          });
        });
      }
    },
    [data, onChange, updateTask]
  );

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
          {boards.map((board) => (
            <div 
              key={board.key} 
              className={`flex-shrink-0 w-72 sm:w-80 bg-muted/70 border border-neutral-200/60 p-1.5 rounded-lg shadow-sm backdrop-blur-sm transition-all duration-300 ease-out ${
                dragState.isDragging ? 'transform-gpu' : ''
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
          ))}
        </div>
      </DragDropContext>

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
    </div>
  );
};