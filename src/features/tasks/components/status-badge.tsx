"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { TaskStatus } from "../types";
import { snakeCaseTotitleCase } from "@/lib/utils";

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}


const getStatusConfig = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.BACKLOG:
      return {
        label: "Backlog",
        emoji: "📋"
      };
    case TaskStatus.TODO:
      return {
        label: "To Do",
        emoji: "📝"
      };
    case TaskStatus.IN_PROGRESS:
      return {
        label: "In Progress",
        emoji: "🚀"
      };
    case TaskStatus.IN_REVIEW:
      return {
        label: "In Review",
        emoji: "👀"
      };
    case TaskStatus.DONE:
      return {
        label: "Done",
        emoji: "✅"
      };
    case TaskStatus.ARCHIVED:
      return {
        label: "Archived",
        emoji: "📦"
      };
    default:
      return {
        label: snakeCaseTotitleCase(status),
        emoji: "⏳"
      };
  }
};

export const StatusBadge = ({ 
  status, 
  className = "", 
  showIcon = true, 
  size = "md" 
}: StatusBadgeProps) => {
  const config = getStatusConfig(status);
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-0.5",
    lg: "text-sm px-3 py-1"
  };

  return (
    <Badge 
      variant={status} 
      className={`
        inline-flex items-center font-medium transition-all duration-200 
        ${sizeClasses[size]} 
        ${className}
      `}
    >
      {showIcon && (
        <span className="mr-1 text-[10px]" role="img" aria-label={config.label}>
          {config.emoji}
        </span>
      )}
      {config.label}
    </Badge>
  );
};

export const StatusIndicator = ({ status }: { status: TaskStatus }) => {
  const config = getStatusConfig(status);
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${
        status === TaskStatus.BACKLOG ? 'bg-gray-400' :
        status === TaskStatus.TODO ? 'bg-blue-500' :
        status === TaskStatus.IN_PROGRESS ? 'bg-amber-500' :
        status === TaskStatus.IN_REVIEW ? 'bg-purple-500' :
        status === TaskStatus.DONE ? 'bg-emerald-500' :
        status === TaskStatus.ARCHIVED ? 'bg-gray-300' : 'bg-gray-400'
      }`} />
      <span className="text-sm font-medium text-gray-700">
        {config.label}
      </span>
    </div>
  );
};