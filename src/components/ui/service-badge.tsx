"use client";

import React from "react";
import { Briefcase } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils";

// ============================================================================
// SERVICE BADGE COMPONENT
// ============================================================================

interface ServiceBadgeProps {
  /** Service name */
  name: string;
  /** Optional service ID for avatar generation */
  id?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show icon */
  showIcon?: boolean;
  /** Custom class name */
  className?: string;
  /** Color variant */
  variant?: "default" | "outline" | "ghost";
  /** Make clickable */
  onClick?: () => void;
}

// Color palette for service avatars based on name hash
const SERVICE_COLORS = [
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-purple-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-indigo-500", text: "text-white" },
  { bg: "bg-teal-500", text: "text-white" },
  { bg: "bg-pink-500", text: "text-white" },
  { bg: "bg-cyan-500", text: "text-white" },
  { bg: "bg-orange-500", text: "text-white" },
];

/**
 * Get consistent color for a service based on its name
 */
function getServiceColor(name: string) {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return SERVICE_COLORS[hash % SERVICE_COLORS.length];
}

const sizeClasses = {
  sm: {
    badge: "text-xs px-2 py-0.5 gap-1",
    avatar: "w-4 h-4 text-[8px]",
    icon: "w-3 h-3",
  },
  md: {
    badge: "text-sm px-2.5 py-1 gap-1.5",
    avatar: "w-5 h-5 text-[10px]",
    icon: "w-4 h-4",
  },
  lg: {
    badge: "text-sm px-3 py-1.5 gap-2",
    avatar: "w-6 h-6 text-xs",
    icon: "w-5 h-5",
  },
};

/**
 * Badge component for displaying service information
 *
 * Features:
 * - Consistent color based on service name
 * - Avatar with first letter of service name
 * - Multiple size variants
 * - Optional click handler
 */
export function ServiceBadge({
  name,
  id: _id,
  size = "md",
  showIcon = true,
  className,
  variant = "default",
  onClick,
}: ServiceBadgeProps) {
  const color = getServiceColor(name);
  const sizes = sizeClasses[size];

  const baseClasses = cn(
    "inline-flex items-center font-medium rounded-md transition-all duration-200",
    sizes.badge,
    onClick && "cursor-pointer hover:opacity-80"
  );

  const variantClasses = {
    default: "bg-gray-100 text-gray-700 border border-gray-200",
    outline: "bg-transparent border border-gray-300 text-gray-700",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
  };

  return (
    <span
      className={cn(baseClasses, variantClasses[variant], className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {showIcon && (
        <span
          className={cn(
            "rounded-full flex items-center justify-center font-bold uppercase flex-shrink-0",
            sizes.avatar,
            color.bg,
            color.text
          )}
        >
          {name.charAt(0)}
        </span>
      )}
      <span className="truncate max-w-[120px]">{name}</span>
    </span>
  );
}

// ============================================================================
// SERVICE ICON
// ============================================================================

interface ServiceIconProps {
  /** Service name */
  name: string;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl";
  /** Custom class name */
  className?: string;
}

const iconSizeClasses = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-10 h-10 text-base",
  xl: "w-12 h-12 text-lg",
};

/**
 * Circular avatar icon for a service
 */
export function ServiceIcon({ name, size = "md", className }: ServiceIconProps) {
  const color = getServiceColor(name);

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold uppercase",
        iconSizeClasses[size],
        color.bg,
        color.text,
        className
      )}
    >
      {name.charAt(0)}
    </div>
  );
}

// ============================================================================
// SERVICE CARD
// ============================================================================

interface ServiceCardProps {
  /** Service name */
  name: string;
  /** Task counts */
  taskCount?: number;
  /** Completion percentage */
  completionRate?: number;
  /** Custom class name */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Show detailed stats */
  detailed?: boolean;
  /** Additional task breakdown */
  stats?: {
    completed: number;
    inProgress: number;
    backlog: number;
    total: number;
  };
}

/**
 * Card component for displaying service information
 */
export function ServiceCard({
  name,
  taskCount,
  completionRate,
  className,
  onClick,
  detailed = false,
  stats,
}: ServiceCardProps) {
  const _color = getServiceColor(name);

  return (
    <div
      className={cn(
        "p-4 rounded-lg border border-gray-200 bg-white",
        "transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:border-gray-300",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center gap-3">
        <ServiceIcon name={name} size="md" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{name}</h4>
          {taskCount !== undefined && (
            <p className="text-sm text-gray-500">
              {taskCount} task{taskCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {completionRate !== undefined && (
          <div className="text-right">
            <span className="text-lg font-bold text-blue-600">
              {Math.round(completionRate)}%
            </span>
            <p className="text-xs text-gray-500">complete</p>
          </div>
        )}
      </div>

      {detailed && stats && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="font-semibold text-emerald-600">{stats.completed}</p>
              <p className="text-gray-500">Done</p>
            </div>
            <div>
              <p className="font-semibold text-amber-600">{stats.inProgress}</p>
              <p className="text-gray-500">In Progress</p>
            </div>
            <div>
              <p className="font-semibold text-gray-600">{stats.backlog}</p>
              <p className="text-gray-500">Backlog</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SERVICE LIST ITEM
// ============================================================================

interface ServiceListItemProps {
  /** Service name */
  name: string;
  /** Is currently selected/active */
  isActive?: boolean;
  /** Custom class name */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Additional info slot */
  endContent?: React.ReactNode;
}

/**
 * List item component for services in navigation/lists
 */
export function ServiceListItem({
  name,
  isActive = false,
  className,
  onClick,
  endContent,
}: ServiceListItemProps) {
  const color = getServiceColor(name);

  return (
    <button
      className={cn(
        "w-full flex items-center gap-2 p-2 rounded-md font-medium transition min-h-[44px] touch-manipulation",
        isActive
          ? "bg-white shadow-sm text-primary"
          : "text-neutral-500 hover:bg-white/70 hover:text-primary",
        "focus:outline-none focus:ring-2 focus:ring-primary/20",
        className
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold uppercase flex-shrink-0",
          isActive ? "bg-primary text-white" : cn(color.bg, color.text)
        )}
      >
        {name.charAt(0)}
      </div>
      <span className="text-sm truncate text-left flex-1">{name}</span>
      {endContent}
    </button>
  );
}

// ============================================================================
// EMPTY SERVICE STATE
// ============================================================================

interface EmptyServiceStateProps {
  /** Custom class name */
  className?: string;
  /** Action button */
  action?: React.ReactNode;
}

/**
 * Empty state for when no services exist
 */
export function EmptyServiceState({ className, action }: EmptyServiceStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-8 px-4",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
        <Briefcase className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-medium text-gray-900 mb-1">No services</h4>
      <p className="text-xs text-gray-500 mb-3">
        Services help organize tasks by category
      </p>
      {action}
    </div>
  );
}
