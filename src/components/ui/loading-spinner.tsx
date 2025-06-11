"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "minimal" | "fullscreen";
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8", 
  lg: "h-12 w-12",
  xl: "h-16 w-16"
};

const borderClasses = {
  sm: "border-2",
  md: "border-3",
  lg: "border-4", 
  xl: "border-4"
};

export const LoadingSpinner = ({ 
  className, 
  size = "lg", 
  variant = "default" 
}: LoadingSpinnerProps) => {
  const spinnerContent = (
    <div className="relative">
      <div className={cn(
        "animate-spin rounded-full border-slate-200 border-t-slate-600",
        sizeClasses[size],
        borderClasses[size]
      )} />
      <div className={cn(
        "absolute inset-0 animate-ping rounded-full border-2 border-slate-400 opacity-20",
        sizeClasses[size]
      )} />
    </div>
  );

  if (variant === "fullscreen") {
    return (
      <div className={cn(
        "h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100",
        className
      )}>
        {spinnerContent}
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        {spinnerContent}
      </div>
    );
  }

  return (
    <div className={cn(
      "w-full flex items-center justify-center py-8",
      className
    )}>
      {spinnerContent}
    </div>
  );
};