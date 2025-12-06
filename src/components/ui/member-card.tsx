"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy,
  TrendingUp,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils";
import { MemberRole } from "@/features/members/types";

// ============================================================================
// TYPES
// ============================================================================

interface MemberStats {
  tasksAssigned?: number;
  tasksCompleted?: number;
  tasksInProgress?: number;
  tasksOverdue?: number;
  kpiScore?: number;
  completionRate?: number;
  slaCompliance?: number;
  productivityScore?: number;
}

// ============================================================================
// MEMBER AVATAR
// ============================================================================

interface MemberAvatarProps {
  /** Member name */
  name: string;
  /** Avatar image URL */
  imageUrl?: string;
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Custom class name */
  className?: string;
  /** Show online indicator */
  showOnlineStatus?: boolean;
  /** Is online */
  isOnline?: boolean;
}

const avatarSizeClasses = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-16 w-16 text-xl",
};

const onlineDotSizes = {
  xs: "w-1.5 h-1.5 border",
  sm: "w-2 h-2 border",
  md: "w-2.5 h-2.5 border-2",
  lg: "w-3 h-3 border-2",
  xl: "w-4 h-4 border-2",
};

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Generate consistent background color from name
 */
function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-orange-500",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/**
 * Avatar component for members
 */
export function MemberAvatar({
  name,
  imageUrl,
  size = "md",
  className,
  showOnlineStatus = false,
  isOnline = false,
}: MemberAvatarProps) {
  return (
    <div className="relative inline-block">
      <Avatar className={cn(avatarSizeClasses[size], className)}>
        <AvatarImage src={imageUrl} alt={name} />
        <AvatarFallback className={cn(getAvatarColor(name), "text-white font-medium")}>
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {showOnlineStatus && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-white",
            onlineDotSizes[size],
            isOnline ? "bg-green-500" : "bg-gray-300"
          )}
        />
      )}
    </div>
  );
}

// ============================================================================
// MEMBER BADGE
// ============================================================================

interface MemberBadgeProps {
  /** Member name */
  name: string;
  /** Avatar image URL */
  imageUrl?: string;
  /** Member role */
  role?: MemberRole;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Show role badge */
  showRole?: boolean;
}

/**
 * Badge component for displaying member info inline
 */
export function MemberBadge({
  name,
  imageUrl,
  role,
  size = "md",
  className,
  onClick,
  showRole = false,
}: MemberBadgeProps) {
  const avatarSize = size === "sm" ? "xs" : size === "md" ? "sm" : "md";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-gray-100 border border-gray-200",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-sm",
        size === "lg" && "px-3 py-1.5 text-sm",
        onClick && "cursor-pointer hover:bg-gray-200 transition-colors",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <MemberAvatar name={name} imageUrl={imageUrl} size={avatarSize} />
      <span className="font-medium text-gray-700 truncate max-w-[120px]">{name}</span>
      {showRole && role && (
        <RoleBadge role={role} size="sm" />
      )}
    </span>
  );
}

// ============================================================================
// ROLE BADGE
// ============================================================================

interface RoleBadgeProps {
  role: MemberRole;
  size?: "sm" | "md";
  className?: string;
}

const roleColors: Record<MemberRole, { bg: string; text: string }> = {
  [MemberRole.ADMIN]: { bg: "bg-purple-100", text: "text-purple-700" },
  [MemberRole.MEMBER]: { bg: "bg-blue-100", text: "text-blue-700" },
  [MemberRole.CUSTOMER]: { bg: "bg-gray-100", text: "text-gray-700" },
};

const roleLabels: Record<MemberRole, string> = {
  [MemberRole.ADMIN]: "Admin",
  [MemberRole.MEMBER]: "Member",
  [MemberRole.CUSTOMER]: "Customer",
};

/**
 * Badge displaying member role
 */
export function RoleBadge({ role, size = "md", className }: RoleBadgeProps) {
  const colors = roleColors[role];

  return (
    <Badge
      className={cn(
        "font-medium",
        colors.bg,
        colors.text,
        size === "sm" && "text-[10px] px-1.5 py-0",
        size === "md" && "text-xs px-2 py-0.5",
        className
      )}
    >
      {roleLabels[role]}
    </Badge>
  );
}

// ============================================================================
// MEMBER CARD
// ============================================================================

interface MemberCardProps {
  /** Member name */
  name: string;
  /** Avatar image URL */
  imageUrl?: string;
  /** Member role */
  role?: MemberRole;
  /** Member statistics */
  stats?: MemberStats;
  /** Custom class name */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Card variant */
  variant?: "default" | "compact" | "detailed";
  /** Rank number (for leaderboard) */
  rank?: number;
}

/**
 * Card component for displaying member information
 */
export function MemberCard({
  name,
  imageUrl,
  role,
  stats,
  className,
  onClick,
  variant = "default",
  rank,
}: MemberCardProps) {
  const rankColors: Record<number, string> = {
    1: "from-yellow-400 to-yellow-600",
    2: "from-gray-300 to-gray-500",
    3: "from-amber-500 to-amber-700",
  };

  // Compact variant
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white",
          onClick && "cursor-pointer hover:shadow-md hover:border-gray-300 transition-all",
          className
        )}
        onClick={onClick}
        role={onClick ? "button" : undefined}
      >
        {rank && (
          <div
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white",
              rank <= 3 ? `bg-gradient-to-r ${rankColors[rank]}` : "bg-gray-300 text-gray-600"
            )}
          >
            {rank}
          </div>
        )}
        <MemberAvatar name={name} imageUrl={imageUrl} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{name}</p>
          {role && <RoleBadge role={role} size="sm" />}
        </div>
        {stats?.kpiScore !== undefined && (
          <div className="text-right">
            <span className="text-lg font-bold text-blue-600">{stats.kpiScore}%</span>
          </div>
        )}
      </div>
    );
  }

  // Detailed variant with full stats
  if (variant === "detailed") {
    return (
      <div
        className={cn(
          "p-4 rounded-lg border border-gray-200 bg-white",
          onClick && "cursor-pointer hover:shadow-md hover:border-gray-300 transition-all",
          className
        )}
        onClick={onClick}
        role={onClick ? "button" : undefined}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          {rank && (
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0",
                rank <= 3 ? `bg-gradient-to-r ${rankColors[rank]}` : "bg-gray-300 text-gray-600"
              )}
            >
              {rank === 1 && <Trophy className="w-4 h-4" />}
              {rank === 2 && "2"}
              {rank === 3 && "3"}
              {rank > 3 && rank}
            </div>
          )}
          <MemberAvatar name={name} imageUrl={imageUrl} size="lg" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">{name}</h4>
            {role && <RoleBadge role={role} className="mt-1" />}
          </div>
          {stats?.kpiScore !== undefined && (
            <KPIScoreBadge score={stats.kpiScore} />
          )}
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatItem
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              label="Completed"
              value={`${stats.tasksCompleted || 0}/${stats.tasksAssigned || 0}`}
            />
            <StatItem
              icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
              label="Completion"
              value={`${Math.round((stats.completionRate || 0) * 100)}%`}
            />
            <StatItem
              icon={<Clock className="w-4 h-4 text-purple-500" />}
              label="SLA"
              value={`${Math.round((stats.slaCompliance || 1) * 100)}%`}
            />
            <StatItem
              icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
              label="Overdue"
              value={String(stats.tasksOverdue || 0)}
            />
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "p-4 rounded-lg border border-gray-200 bg-white",
        onClick && "cursor-pointer hover:shadow-md hover:border-gray-300 transition-all",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="flex items-center gap-3">
        {rank && (
          <div
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
              rank <= 3 ? `bg-gradient-to-r ${rankColors[rank]}` : "bg-gray-300 text-gray-600"
            )}
          >
            {rank}
          </div>
        )}
        <MemberAvatar name={name} imageUrl={imageUrl} size="md" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{name}</h4>
          {role && <RoleBadge role={role} size="sm" className="mt-1" />}
        </div>
        {stats?.kpiScore !== undefined && (
          <div className="text-right">
            <p className="text-xl font-bold text-blue-600">{stats.kpiScore}%</p>
            <p className="text-xs text-gray-500">KPI</p>
          </div>
        )}
      </div>

      {stats && (stats.tasksAssigned || stats.completionRate !== undefined) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>
              {stats.tasksCompleted || 0}/{stats.tasksAssigned || 0} tasks
            </span>
          </div>
          <Progress
            value={stats.tasksAssigned ? ((stats.tasksCompleted || 0) / stats.tasksAssigned) * 100 : 0}
            className="h-1.5"
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded bg-gray-50">
      {icon}
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

interface KPIScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Badge showing KPI score with color coding
 */
export function KPIScoreBadge({ score, size = "md", className }: KPIScoreBadgeProps) {
  const getScoreColors = (s: number) => {
    if (s >= 80) return "from-green-500 to-green-600";
    if (s >= 60) return "from-blue-500 to-blue-600";
    if (s >= 40) return "from-yellow-500 to-yellow-600";
    return "from-red-500 to-red-600";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 60) return "Good";
    if (s >= 40) return "Average";
    return "Needs Work";
  };

  const sizeClasses = {
    sm: "text-sm px-2 py-1",
    md: "text-base px-3 py-1.5",
    lg: "text-lg px-4 py-2",
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <Badge
        className={cn(
          "font-bold text-white bg-gradient-to-r",
          getScoreColors(score),
          sizeClasses[size]
        )}
      >
        {score}%
      </Badge>
      <span className="text-[10px] text-gray-500 mt-0.5">{getScoreLabel(score)}</span>
    </div>
  );
}

// ============================================================================
// MEMBER LIST
// ============================================================================

interface MemberListItemProps {
  name: string;
  imageUrl?: string;
  role?: MemberRole;
  isActive?: boolean;
  className?: string;
  onClick?: () => void;
  endContent?: React.ReactNode;
}

/**
 * List item component for members in navigation/lists
 */
export function MemberListItem({
  name,
  imageUrl,
  role,
  isActive = false,
  className,
  onClick,
  endContent,
}: MemberListItemProps) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 p-2 rounded-md font-medium transition min-h-[44px] touch-manipulation",
        isActive
          ? "bg-white shadow-sm text-primary"
          : "text-neutral-500 hover:bg-white/70 hover:text-primary",
        "focus:outline-none focus:ring-2 focus:ring-primary/20",
        className
      )}
      onClick={onClick}
    >
      <MemberAvatar name={name} imageUrl={imageUrl} size="sm" />
      <div className="flex-1 min-w-0 text-left">
        <span className="text-sm truncate block">{name}</span>
        {role && <RoleBadge role={role} size="sm" />}
      </div>
      {endContent}
    </button>
  );
}

// ============================================================================
// EMPTY MEMBER STATE
// ============================================================================

interface EmptyMemberStateProps {
  className?: string;
  action?: React.ReactNode;
}

/**
 * Empty state for when no members exist
 */
export function EmptyMemberState({ className, action }: EmptyMemberStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-8 px-4",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
        <User className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-medium text-gray-900 mb-1">No members</h4>
      <p className="text-xs text-gray-500 mb-3">
        Invite team members to collaborate
      </p>
      {action}
    </div>
  );
}
