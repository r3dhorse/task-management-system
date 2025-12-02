"use client";

import { TaskDeadlineTimeline } from "@/components/task-deadline-timeline";
import { PopulatedTask } from "@/features/tasks/types";

// ============================================================================
// TYPES
// ============================================================================

interface DeadlinesTabProps {
  /** List of tasks to display in the timeline */
  tasks: PopulatedTask[];
  /** Current workspace ID for navigation links */
  workspaceId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * DeadlinesTab - Task deadline timeline view
 *
 * Displays tasks organized by their due dates in a timeline format.
 * Wraps the TaskDeadlineTimeline component with workspace context.
 */
export function DeadlinesTab({ tasks, workspaceId }: DeadlinesTabProps) {
  return (
    <div className="space-y-4">
      <TaskDeadlineTimeline tasks={tasks} workspaceId={workspaceId} />
    </div>
  );
}

export default DeadlinesTab;
