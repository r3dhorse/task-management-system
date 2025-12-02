/**
 * Task Constants - Centralized configuration for task status styling and labels
 *
 * This module provides a single source of truth for all task-related constants,
 * ensuring consistency across the kanban board, status badges, analytics, and tables.
 */

import { TaskStatus, ReviewStatus } from "@/features/tasks/types";

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

export interface TaskStatusConfig {
  label: string;
  emoji: string;
  color: string;           // Tailwind background color class
  textColor: string;       // Tailwind text color class
  borderColor: string;     // Tailwind border color class
  dotColor: string;        // Color for status indicator dots
  hoverColor: string;      // Hover state background
  lightBg: string;         // Light background for cards/badges
  gradient: string;        // Gradient for headers/highlights
  description: string;     // Short description of the status
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, TaskStatusConfig> = {
  [TaskStatus.BACKLOG]: {
    label: "Backlog",
    emoji: "📋",
    color: "bg-gray-500",
    textColor: "text-gray-700",
    borderColor: "border-gray-500",
    dotColor: "bg-gray-400",
    hoverColor: "hover:bg-gray-100",
    lightBg: "bg-gray-50",
    gradient: "from-gray-400 to-gray-600",
    description: "Tasks waiting to be scheduled",
  },
  [TaskStatus.TODO]: {
    label: "To Do",
    emoji: "📝",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    borderColor: "border-blue-500",
    dotColor: "bg-blue-500",
    hoverColor: "hover:bg-blue-100",
    lightBg: "bg-blue-50",
    gradient: "from-blue-400 to-blue-600",
    description: "Ready to be worked on",
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "In Progress",
    emoji: "🚀",
    color: "bg-amber-500",
    textColor: "text-amber-700",
    borderColor: "border-amber-500",
    dotColor: "bg-amber-500",
    hoverColor: "hover:bg-amber-100",
    lightBg: "bg-amber-50",
    gradient: "from-amber-400 to-amber-600",
    description: "Currently being worked on",
  },
  [TaskStatus.IN_REVIEW]: {
    label: "In Review",
    emoji: "👀",
    color: "bg-purple-500",
    textColor: "text-purple-700",
    borderColor: "border-purple-500",
    dotColor: "bg-purple-500",
    hoverColor: "hover:bg-purple-100",
    lightBg: "bg-purple-50",
    gradient: "from-purple-400 to-purple-600",
    description: "Awaiting review approval",
  },
  [TaskStatus.DONE]: {
    label: "Done",
    emoji: "✅",
    color: "bg-emerald-500",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-500",
    dotColor: "bg-emerald-500",
    hoverColor: "hover:bg-emerald-100",
    lightBg: "bg-emerald-50",
    gradient: "from-emerald-400 to-emerald-600",
    description: "Completed successfully",
  },
  [TaskStatus.ARCHIVED]: {
    label: "Archived",
    emoji: "📦",
    color: "bg-gray-300",
    textColor: "text-gray-500",
    borderColor: "border-gray-300",
    dotColor: "bg-gray-300",
    hoverColor: "hover:bg-gray-100",
    lightBg: "bg-gray-50",
    gradient: "from-gray-300 to-gray-500",
    description: "No longer active",
  },
};

// ============================================================================
// REVIEW STATUS CONFIGURATION
// ============================================================================

export interface ReviewStatusConfig {
  label: string;
  emoji: string;
  color: string;
  textColor: string;
  borderColor: string;
  lightBg: string;
}

export const REVIEW_STATUS_CONFIG: Record<ReviewStatus, ReviewStatusConfig> = {
  [ReviewStatus.PENDING]: {
    label: "Pending",
    emoji: "⏳",
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-500",
    lightBg: "bg-yellow-50",
  },
  [ReviewStatus.APPROVED]: {
    label: "Approved",
    emoji: "✅",
    color: "bg-green-500",
    textColor: "text-green-700",
    borderColor: "border-green-500",
    lightBg: "bg-green-50",
  },
  [ReviewStatus.REJECTED]: {
    label: "Rejected",
    emoji: "❌",
    color: "bg-red-500",
    textColor: "text-red-700",
    borderColor: "border-red-500",
    lightBg: "bg-red-50",
  },
  [ReviewStatus.CHANGES_REQUESTED]: {
    label: "Changes Requested",
    emoji: "🔄",
    color: "bg-orange-500",
    textColor: "text-orange-700",
    borderColor: "border-orange-500",
    lightBg: "bg-orange-50",
  },
};

// ============================================================================
// PRIORITY CONFIGURATION
// ============================================================================

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface PriorityConfig {
  label: string;
  emoji: string;
  color: string;
  textColor: string;
  borderColor: string;
  lightBg: string;
  weight: number; // For sorting
}

export const PRIORITY_CONFIG: Record<TaskPriority, PriorityConfig> = {
  low: {
    label: "Low",
    emoji: "🟢",
    color: "bg-green-500",
    textColor: "text-green-700",
    borderColor: "border-green-500",
    lightBg: "bg-green-50",
    weight: 1,
  },
  medium: {
    label: "Medium",
    emoji: "🟡",
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-500",
    lightBg: "bg-yellow-50",
    weight: 2,
  },
  high: {
    label: "High",
    emoji: "🟠",
    color: "bg-orange-500",
    textColor: "text-orange-700",
    borderColor: "border-orange-500",
    lightBg: "bg-orange-50",
    weight: 3,
  },
  urgent: {
    label: "Urgent",
    emoji: "🔴",
    color: "bg-red-500",
    textColor: "text-red-700",
    borderColor: "border-red-500",
    lightBg: "bg-red-50",
    weight: 4,
  },
};

// ============================================================================
// KANBAN BOARD CONFIGURATION
// ============================================================================

export interface KanbanColumnConfig {
  key: TaskStatus;
  label: string;
  color: string;       // border-l color
  bgColor: string;     // background color
  emoji: string;
  defaultExpanded: boolean;
  allowDrop: boolean;
}

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    key: TaskStatus.BACKLOG,
    label: TASK_STATUS_CONFIG[TaskStatus.BACKLOG].label,
    color: `border-l-gray-500`,
    bgColor: TASK_STATUS_CONFIG[TaskStatus.BACKLOG].color,
    emoji: TASK_STATUS_CONFIG[TaskStatus.BACKLOG].emoji,
    defaultExpanded: true,
    allowDrop: true,
  },
  {
    key: TaskStatus.TODO,
    label: TASK_STATUS_CONFIG[TaskStatus.TODO].label,
    color: `border-l-blue-500`,
    bgColor: TASK_STATUS_CONFIG[TaskStatus.TODO].color,
    emoji: TASK_STATUS_CONFIG[TaskStatus.TODO].emoji,
    defaultExpanded: true,
    allowDrop: true,
  },
  {
    key: TaskStatus.IN_PROGRESS,
    label: TASK_STATUS_CONFIG[TaskStatus.IN_PROGRESS].label,
    color: `border-l-amber-500`,
    bgColor: TASK_STATUS_CONFIG[TaskStatus.IN_PROGRESS].color,
    emoji: TASK_STATUS_CONFIG[TaskStatus.IN_PROGRESS].emoji,
    defaultExpanded: true,
    allowDrop: true,
  },
  {
    key: TaskStatus.IN_REVIEW,
    label: TASK_STATUS_CONFIG[TaskStatus.IN_REVIEW].label,
    color: `border-l-purple-500`,
    bgColor: TASK_STATUS_CONFIG[TaskStatus.IN_REVIEW].color,
    emoji: TASK_STATUS_CONFIG[TaskStatus.IN_REVIEW].emoji,
    defaultExpanded: true,
    allowDrop: true,
  },
  {
    key: TaskStatus.DONE,
    label: TASK_STATUS_CONFIG[TaskStatus.DONE].label,
    color: `border-l-emerald-500`,
    bgColor: TASK_STATUS_CONFIG[TaskStatus.DONE].color,
    emoji: TASK_STATUS_CONFIG[TaskStatus.DONE].emoji,
    defaultExpanded: false, // Collapsed by default
    allowDrop: true,
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get status configuration with fallback
 */
export function getStatusConfig(status: TaskStatus): TaskStatusConfig {
  return TASK_STATUS_CONFIG[status] || TASK_STATUS_CONFIG[TaskStatus.BACKLOG];
}

/**
 * Get review status configuration with fallback
 */
export function getReviewStatusConfig(status: ReviewStatus): ReviewStatusConfig {
  return REVIEW_STATUS_CONFIG[status] || REVIEW_STATUS_CONFIG[ReviewStatus.PENDING];
}

/**
 * Get all active statuses (excluding archived)
 */
export function getActiveStatuses(): TaskStatus[] {
  return Object.keys(TASK_STATUS_CONFIG).filter(
    (status) => status !== TaskStatus.ARCHIVED
  ) as TaskStatus[];
}

/**
 * Get workflow statuses in order
 */
export function getWorkflowStatuses(includeReview: boolean = true): TaskStatus[] {
  const statuses = [
    TaskStatus.BACKLOG,
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
  ];

  if (includeReview) {
    statuses.push(TaskStatus.IN_REVIEW);
  }

  statuses.push(TaskStatus.DONE);

  return statuses;
}

/**
 * Check if status transition is valid
 */
export function isValidStatusTransition(
  from: TaskStatus,
  to: TaskStatus,
  _includeReview: boolean = true
): boolean {
  // Define valid transitions
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    [TaskStatus.BACKLOG]: [TaskStatus.TODO],
    [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.BACKLOG],
    [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW, TaskStatus.DONE, TaskStatus.TODO],
    [TaskStatus.IN_REVIEW]: [TaskStatus.DONE, TaskStatus.IN_PROGRESS, TaskStatus.BACKLOG],
    [TaskStatus.DONE]: [TaskStatus.ARCHIVED, TaskStatus.IN_PROGRESS],
    [TaskStatus.ARCHIVED]: [TaskStatus.BACKLOG],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Get status display text with optional emoji
 */
export function getStatusDisplayText(status: TaskStatus, withEmoji: boolean = true): string {
  const config = getStatusConfig(status);
  return withEmoji ? `${config.emoji} ${config.label}` : config.label;
}

// ============================================================================
// RESPONSIVE BREAKPOINTS
// ============================================================================

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

// ============================================================================
// SPACING CONSTANTS
// ============================================================================

export const SPACING = {
  /** Standard page padding */
  pagePadding: {
    mobile: "px-4",
    tablet: "sm:px-6",
    desktop: "lg:px-8",
    full: "px-4 sm:px-6 lg:px-8",
  },
  /** Card padding */
  cardPadding: {
    mobile: "p-3",
    tablet: "sm:p-4",
    desktop: "lg:p-6",
    full: "p-3 sm:p-4 lg:p-6",
  },
  /** Gap between items */
  gap: {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
    responsive: "gap-2 sm:gap-4 lg:gap-6",
  },
} as const;

// ============================================================================
// ANIMATION PRESETS
// ============================================================================

export const ANIMATIONS = {
  fadeIn: "animate-fade-in",
  slideUp: "animate-slide-up",
  shimmer: "animate-shimmer",
  pulse: "animate-pulse",
  spin: "animate-spin",
  bounce: "animate-bounce",
  /** Transition presets */
  transition: {
    fast: "transition-all duration-150",
    normal: "transition-all duration-200",
    slow: "transition-all duration-300",
  },
} as const;
