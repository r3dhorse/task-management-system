"use client";

import { Droppable } from "@hello-pangea/dnd";
import { PopulatedTask } from "../types";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
  board: {
    key: string;
    label: string;
    color: string;
  };
  tasks: PopulatedTask[];
}

export const KanbanColumn = ({ board, tasks }: KanbanColumnProps) => {

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <div className={`w-2 h-2 rounded-full ${board.color?.replace('border-l-', 'bg-') || 'bg-gray-400'}`} />
          <h3 className="text-sm font-medium">{board.label}</h3>
          <div className="size-5 flex items-center justify-center rounded text-xs text-neutral-700 bg-neutral-200 font-medium">
            {tasks.length}
          </div>
        </div>
      </div>
      
      <Droppable droppableId={board.key}>
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="flex flex-col gap-y-2 min-h-[200px]"
          >
            {tasks.map((task, index) => (
              <KanbanCard key={task.$id} task={task} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};