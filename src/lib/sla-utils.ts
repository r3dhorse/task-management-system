/**
 * Utility functions for SLA (Service Level Agreement) calculations
 */

/**
 * Calculate due date based on SLA configuration
 * @param slaDays - Number of days for SLA (if null/undefined, no automatic due date)
 * @param includeWeekends - Whether to include weekends in SLA calculation
 * @param startDate - Start date for calculation (defaults to current date)
 * @returns Due date or null if no SLA is configured
 */
export function calculateSLADueDate(
  slaDays: number | null | undefined,
  includeWeekends: boolean = false,
  startDate: Date = new Date()
): Date | null {
  // If no SLA days configured, return null
  if (!slaDays || slaDays <= 0) {
    return null;
  }

  const dueDate = new Date(startDate);
  let daysAdded = 0;

  // If including weekends, simply add the days
  if (includeWeekends) {
    dueDate.setDate(dueDate.getDate() + slaDays);
    return dueDate;
  }

  // If not including weekends, count only business days
  while (daysAdded < slaDays) {
    dueDate.setDate(dueDate.getDate() + 1);
    const dayOfWeek = dueDate.getDay();

    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return dueDate;
}

/**
 * Format SLA information for display
 * @param slaDays - Number of days for SLA
 * @param includeWeekends - Whether weekends are included
 * @returns Formatted SLA string
 */
export function formatSLAInfo(
  slaDays: number | null | undefined,
  includeWeekends: boolean = false
): string {
  if (!slaDays || slaDays <= 0) {
    return "No SLA configured";
  }

  const dayText = slaDays === 1 ? "day" : "days";
  const weekendText = includeWeekends ? " (including weekends)" : " (business days only)";

  return `${slaDays} ${dayText}${weekendText}`;
}

/**
 * Get the default due date suggestion based on service SLA
 * @param slaDays - Number of days for SLA
 * @param includeWeekends - Whether weekends are included
 * @returns Due date suggestion or null
 */
export function getSLADueDateSuggestion(
  slaDays: number | null | undefined,
  includeWeekends: boolean = false
): Date | null {
  return calculateSLADueDate(slaDays, includeWeekends);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLA COMPLIANCE CALCULATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/** Weight for main tasks in combined SLA calculation */
export const MAIN_TASK_SLA_WEIGHT = 0.7;

/** Weight for subtasks in combined SLA calculation */
export const SUBTASK_SLA_WEIGHT = 0.3;

/**
 * Task interface for SLA calculations
 */
export interface SLATask {
  id: string;
  status: string;
  dueDate: Date | string | null;
  updatedAt: Date | string;
  parentTaskId?: string | null;
}

/**
 * Result of SLA compliance calculation
 */
export interface SLAComplianceResult {
  mainTaskSLA: number;
  mainTasksWithinSLA: number;
  mainTasksWithDueDate: number;
  subtaskSLA: number;
  subtasksWithinSLA: number;
  subtasksWithDueDate: number;
  combinedSLA: number;
  totalTasksWithDueDate: number;
  totalTasksWithinSLA: number;
}

/**
 * Check if a task is within SLA
 * A task is within SLA if:
 * - Completed: was completed on or before the due date
 * - Not completed: due date has not yet passed
 *
 * @param task - The task to check
 * @param doneStatus - The status value that indicates task is done (default: 'DONE')
 * @param now - Current date for comparison (defaults to new Date())
 * @returns true if task is within SLA, false otherwise
 */
export function isTaskWithinSLA(
  task: SLATask,
  doneStatus: string = 'DONE',
  now: Date = new Date()
): boolean {
  if (!task.dueDate) return true; // No due date = always compliant

  const dueDate = new Date(task.dueDate);

  if (task.status === doneStatus) {
    // Completed task: check if completed on or before due date
    const completedDate = new Date(task.updatedAt);
    return completedDate <= dueDate;
  } else {
    // Incomplete task: check if not yet overdue
    return dueDate >= now;
  }
}

/**
 * Calculate SLA compliance for a set of tasks
 * Separates main tasks (parentTaskId = null) from subtasks (parentTaskId != null)
 *
 * @param tasks - Array of tasks to calculate SLA for
 * @param doneStatus - The status value that indicates task is done (default: 'DONE')
 * @returns SLA compliance metrics for main tasks, subtasks, and combined
 */
export function calculateSLACompliance(
  tasks: SLATask[],
  doneStatus: string = 'DONE'
): SLAComplianceResult {
  const now = new Date();

  // Separate main tasks and subtasks
  const mainTasks = tasks.filter(task => !task.parentTaskId);
  const subtasks = tasks.filter(task => task.parentTaskId);

  // Main Task SLA
  const mainTasksWithDueDate = mainTasks.filter(task => task.dueDate);
  const mainTasksWithinSLA = mainTasksWithDueDate.filter(task =>
    isTaskWithinSLA(task, doneStatus, now)
  );
  const mainTaskSLA = mainTasksWithDueDate.length > 0
    ? mainTasksWithinSLA.length / mainTasksWithDueDate.length
    : 1; // 100% if no main tasks with due dates

  // Subtask SLA
  const subtasksWithDueDate = subtasks.filter(task => task.dueDate);
  const subtasksWithinSLA = subtasksWithDueDate.filter(task =>
    isTaskWithinSLA(task, doneStatus, now)
  );
  const subtaskSLA = subtasksWithDueDate.length > 0
    ? subtasksWithinSLA.length / subtasksWithDueDate.length
    : 1; // 100% if no subtasks with due dates

  // Combined SLA (weighted average)
  const hasMainTasks = mainTasksWithDueDate.length > 0;
  const hasSubtasks = subtasksWithDueDate.length > 0;

  let combinedSLA: number;
  if (hasMainTasks && hasSubtasks) {
    combinedSLA = (mainTaskSLA * MAIN_TASK_SLA_WEIGHT) + (subtaskSLA * SUBTASK_SLA_WEIGHT);
  } else if (hasMainTasks) {
    combinedSLA = mainTaskSLA;
  } else if (hasSubtasks) {
    combinedSLA = subtaskSLA;
  } else {
    combinedSLA = 1; // No tasks with due dates = 100%
  }

  return {
    mainTaskSLA,
    mainTasksWithinSLA: mainTasksWithinSLA.length,
    mainTasksWithDueDate: mainTasksWithDueDate.length,
    subtaskSLA,
    subtasksWithinSLA: subtasksWithinSLA.length,
    subtasksWithDueDate: subtasksWithDueDate.length,
    combinedSLA,
    totalTasksWithDueDate: mainTasksWithDueDate.length + subtasksWithDueDate.length,
    totalTasksWithinSLA: mainTasksWithinSLA.length + subtasksWithinSLA.length,
  };
}

/**
 * Calculate simple SLA compliance (legacy - all tasks counted equally)
 * Use this for backward compatibility or when task hierarchy doesn't matter
 *
 * @param tasks - Array of tasks to calculate SLA for
 * @param doneStatus - The status value that indicates task is done (default: 'DONE')
 * @returns SLA compliance ratio (0-1)
 */
export function calculateSimpleSLACompliance(
  tasks: SLATask[],
  doneStatus: string = 'DONE'
): number {
  const now = new Date();
  const tasksWithDueDate = tasks.filter(task => task.dueDate);

  if (tasksWithDueDate.length === 0) return 1;

  const tasksWithinSLA = tasksWithDueDate.filter(task =>
    isTaskWithinSLA(task, doneStatus, now)
  );

  return tasksWithinSLA.length / tasksWithDueDate.length;
}