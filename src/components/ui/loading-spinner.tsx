"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "default" | "minimal" | "fullscreen" | "overlay" | "inline";
  /** Custom color scheme - uses slate by default */
  color?: "slate" | "white" | "blue";
}

const sizeClasses = {
  xs: "h-4 w-4",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-16 w-16"
};

const borderClasses = {
  xs: "border-2",
  sm: "border-2",
  md: "border-3",
  lg: "border-4",
  xl: "border-4"
};

const colorClasses = {
  slate: {
    border: "border-slate-200 border-t-slate-600",
    ping: "border-slate-400"
  },
  white: {
    border: "border-white/20 border-t-white",
    ping: "border-white/40"
  },
  blue: {
    border: "border-blue-200 border-t-blue-600",
    ping: "border-blue-400"
  }
};

export const LoadingSpinner = ({
  className,
  size = "lg",
  variant = "default",
  color = "slate"
}: LoadingSpinnerProps) => {
  const colors = colorClasses[color];

  const spinnerContent = (
    <div className="relative">
      <div className={cn(
        "animate-spin rounded-full",
        colors.border,
        sizeClasses[size],
        borderClasses[size]
      )} />
      {/* Hide ping effect for xs size to keep it clean for inline use */}
      {size !== "xs" && (
        <div className={cn(
          "absolute inset-0 animate-ping rounded-full border-2 opacity-20",
          colors.ping,
          sizeClasses[size]
        )} />
      )}
    </div>
  );

  // Inline variant for use inside buttons - just returns the spinner
  if (variant === "inline") {
    return spinnerContent;
  }

  // Overlay variant for modal/dialog loading states
  if (variant === "overlay") {
    return (
      <div className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm",
        className
      )}>
        {spinnerContent}
      </div>
    );
  }

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