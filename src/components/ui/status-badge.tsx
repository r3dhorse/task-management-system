"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { TaskStatus, ReviewStatus } from "@/features/tasks/types";
import {
  TASK_STATUS_CONFIG,
  REVIEW_STATUS_CONFIG,
  getStatusConfig,
  getReviewStatusConfig,
} from "@/lib/constants/task-constants";
import { cn } from "@/lib/utils";

// ============================================================================
// TASK STATUS BADGE
// ============================================================================

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
  /** Show emoji icon */
  showIcon?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Use dot indicator instead of full badge */
  variant?: "badge" | "dot" | "minimal";
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-2.5 py-0.5",
  lg: "text-sm px-3 py-1",
};

/**
 * Badge component for displaying task status
 *
 * Uses centralized status configuration for consistent styling
 */
export function TaskStatusBadge({
  status,
  className,
  showIcon = true,
  size = "md",
  variant = "badge",
}: TaskStatusBadgeProps) {
  const config = getStatusConfig(status);

  // Dot indicator variant
  if (variant === "dot") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn("w-2 h-2 rounded-full", config.dotColor)} />
        <span className="text-sm font-medium text-gray-700">{config.label}</span>
      </div>
    );
  }

  // Minimal variant (just text with color)
  if (variant === "minimal") {
    return (
      <span className={cn("text-sm font-medium", config.textColor, className)}>
        {showIcon && <span className="mr-1">{config.emoji}</span>}
        {config.label}
      </span>
    );
  }

  // Full badge variant
  return (
    <Badge
      variant={status}
      className={cn(
        "inline-flex items-center font-medium transition-all duration-200",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <span className="mr-1 text-[10px]" role="img" aria-label={config.label}>
          {config.emoji}
        </span>
      )}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// REVIEW STATUS BADGE
// ============================================================================

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Badge component for displaying review status
 */
export function ReviewStatusBadge({
  status,
  className,
  showIcon = true,
  size = "md",
}: ReviewStatusBadgeProps) {
  const config = getReviewStatusConfig(status);

  return (
    <Badge
      className={cn(
        "inline-flex items-center font-medium transition-all duration-200",
        config.color,
        "text-white",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <span className="mr-1 text-[10px]" role="img" aria-label={config.label}>
          {config.emoji}
        </span>
      )}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// STATUS SELECT OPTIONS
// ============================================================================

/**
 * Get status options for select/dropdown components
 */
export function getStatusOptions(includeArchived: boolean = false) {
  const statuses = Object.keys(TASK_STATUS_CONFIG) as TaskStatus[];
  return statuses
    .filter(status => includeArchived || status !== TaskStatus.ARCHIVED)
    .map(status => {
      const config = TASK_STATUS_CONFIG[status];
      return {
        value: status,
        label: config.label,
        emoji: config.emoji,
        color: config.color,
      };
    });
}

/**
 * Get review status options for select/dropdown components
 */
export function getReviewStatusOptions() {
  const statuses = Object.keys(REVIEW_STATUS_CONFIG) as ReviewStatus[];
  return statuses.map(status => {
    const config = REVIEW_STATUS_CONFIG[status];
    return {
      value: status,
      label: config.label,
      emoji: config.emoji,
      color: config.color,
    };
  });
}

// ============================================================================
// STATUS INDICATOR (COLORED DOT)
// ============================================================================

interface StatusIndicatorProps {
  status: TaskStatus;
  className?: string;
  /** Show label text */
  showLabel?: boolean;
  /** Size of the dot */
  dotSize?: "sm" | "md" | "lg";
}

const dotSizeClasses = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-3 h-3",
};

/**
 * Simple colored dot indicator for status
 */
export function StatusIndicator({
  status,
  className,
  showLabel = true,
  dotSize = "md",
}: StatusIndicatorProps) {
  const config = getStatusConfig(status);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "rounded-full",
          dotSizeClasses[dotSize],
          config.dotColor
        )}
      />
      {showLabel && (
        <span className="text-sm font-medium text-gray-700">{config.label}</span>
      )}
    </div>
  );
}

// ============================================================================
// STATUS COUNT BADGE
// ============================================================================

interface StatusCountBadgeProps {
  status: TaskStatus;
  count: number;
  className?: string;
  /** Show zero counts */
  showZero?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

const countSizeClasses = {
  sm: "size-4 text-[10px]",
  md: "size-5 text-xs",
  lg: "size-6 text-sm",
};

/**
 * Status badge with count indicator
 */
export function StatusCountBadge({
  status,
  count,
  className,
  showZero = false,
  size = "md",
}: StatusCountBadgeProps) {
  if (!showZero && count === 0) return null;

  const config = getStatusConfig(status);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm" role="img" aria-label={config.label}>
        {config.emoji}
      </span>
      <div
        className={cn(
          "rounded-full flex items-center justify-center text-white font-medium",
          countSizeClasses[size],
          config.color
        )}
      >
        {count}
      </div>
    </div>
  );
}

// ============================================================================
// STATUS PROGRESS BAR
// ============================================================================

interface StatusProgressBarProps {
  distribution: Record<TaskStatus, number>;
  total?: number;
  className?: string;
  /** Show legend */
  showLegend?: boolean;
  /** Height of the bar */
  height?: "sm" | "md" | "lg";
}

const heightClasses = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

/**
 * Progress bar showing distribution across statuses
 */
export function StatusProgressBar({
  distribution,
  total,
  className,
  showLegend = false,
  height = "md",
}: StatusProgressBarProps) {
  const calculatedTotal = total || Object.values(distribution).reduce((a, b) => a + b, 0);

  if (calculatedTotal === 0) {
    return (
      <div className={cn("w-full bg-gray-200 rounded-full", heightClasses[height], className)} />
    );
  }

  const statuses: TaskStatus[] = [
    TaskStatus.DONE,
    TaskStatus.IN_REVIEW,
    TaskStatus.IN_PROGRESS,
    TaskStatus.TODO,
    TaskStatus.BACKLOG,
  ];

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("w-full bg-gray-200 rounded-full overflow-hidden flex", heightClasses[height])}>
        {statuses.map(status => {
          const count = distribution[status] || 0;
          const percentage = (count / calculatedTotal) * 100;
          const config = TASK_STATUS_CONFIG[status];

          if (percentage === 0) return null;

          return (
            <div
              key={status}
              className={cn("transition-all duration-300", config.color)}
              style={{ width: `${percentage}%` }}
              title={`${config.label}: ${count} (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-3 text-xs">
          {statuses.map(status => {
            const count = distribution[status] || 0;
            if (count === 0) return null;

            const config = TASK_STATUS_CONFIG[status];
            const percentage = (count / calculatedTotal) * 100;

            return (
              <div key={status} className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full", config.color)} />
                <span className="text-gray-600">
                  {config.label}: {count} ({percentage.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
