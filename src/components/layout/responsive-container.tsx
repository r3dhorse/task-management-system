"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum width variant */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "none";
  /** Add horizontal padding */
  padded?: boolean;
  /** Center the container */
  centered?: boolean;
  /** HTML element to render as */
  as?: "div" | "section" | "article" | "main" | "aside";
}

const maxWidthClasses = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
  none: "",
};

/**
 * Responsive container with consistent max-width and padding
 */
export function Container({
  children,
  className,
  maxWidth = "2xl",
  padded = true,
  centered = true,
  as: Component = "div",
}: ContainerProps) {
  return (
    <Component
      className={cn(
        maxWidthClasses[maxWidth],
        padded && "px-4 sm:px-6 lg:px-8",
        centered && "mx-auto",
        className
      )}
    >
      {children}
    </Component>
  );
}

// ============================================================================
// PAGE HEADER COMPONENT
// ============================================================================

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Actions slot (buttons, dropdowns, etc.) */
  actions?: React.ReactNode;
  /** Breadcrumb slot */
  breadcrumb?: React.ReactNode;
  /** Custom class name */
  className?: string;
  /** Make title smaller on mobile */
  compactTitle?: boolean;
}

/**
 * Consistent page header with responsive layout
 */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  breadcrumb,
  className,
  compactTitle = false,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2 sm:space-y-4", className)}>
      {breadcrumb && <div className="mb-2">{breadcrumb}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="flex-shrink-0 hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1
              className={cn(
                "font-bold tracking-tight text-gray-900 truncate",
                compactTitle
                  ? "text-lg sm:text-xl lg:text-2xl"
                  : "text-xl sm:text-2xl lg:text-3xl"
              )}
            >
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// RESPONSIVE GRID COMPONENT
// ============================================================================

interface GridProps {
  children: React.ReactNode;
  className?: string;
  /** Number of columns on each breakpoint */
  cols?: {
    default?: 1 | 2 | 3 | 4 | 6 | 12;
    sm?: 1 | 2 | 3 | 4 | 6 | 12;
    md?: 1 | 2 | 3 | 4 | 6 | 12;
    lg?: 1 | 2 | 3 | 4 | 6 | 12;
    xl?: 1 | 2 | 3 | 4 | 6 | 12;
  };
  /** Gap between items */
  gap?: "none" | "sm" | "md" | "lg" | "xl";
}

const colClasses = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  6: "grid-cols-6",
  12: "grid-cols-12",
};

const gapClasses = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

/**
 * Responsive grid layout component
 */
export function Grid({
  children,
  className,
  cols = { default: 1, sm: 2, lg: 3 },
  gap = "md",
}: GridProps) {
  const colClassNames = cn(
    "grid",
    cols.default && colClasses[cols.default],
    cols.sm && `sm:${colClasses[cols.sm]}`,
    cols.md && `md:${colClasses[cols.md]}`,
    cols.lg && `lg:${colClasses[cols.lg]}`,
    cols.xl && `xl:${colClasses[cols.xl]}`,
    gapClasses[gap],
    className
  );

  return <div className={colClassNames}>{children}</div>;
}

// ============================================================================
// STACK COMPONENT
// ============================================================================

interface StackProps {
  children: React.ReactNode;
  className?: string;
  /** Direction of the stack */
  direction?: "horizontal" | "vertical" | "responsive";
  /** Alignment */
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  /** Justify content */
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  /** Gap between items */
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  /** Wrap items */
  wrap?: boolean;
  /** HTML element to render as */
  as?: "div" | "section" | "nav" | "ul" | "ol";
}

const directionClasses = {
  horizontal: "flex-row",
  vertical: "flex-col",
  responsive: "flex-col sm:flex-row",
};

const alignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyClasses = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

const stackGapClasses = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

/**
 * Flexible stack layout component (horizontal or vertical)
 */
export function Stack({
  children,
  className,
  direction = "vertical",
  align = "stretch",
  justify = "start",
  gap = "md",
  wrap = false,
  as: Component = "div",
}: StackProps) {
  return (
    <Component
      className={cn(
        "flex",
        directionClasses[direction],
        alignClasses[align],
        justifyClasses[justify],
        stackGapClasses[gap],
        wrap && "flex-wrap",
        className
      )}
    >
      {children}
    </Component>
  );
}

// ============================================================================
// CARD COMPONENT
// ============================================================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Padding variant */
  padding?: "none" | "sm" | "md" | "lg";
  /** Shadow variant */
  shadow?: "none" | "sm" | "md" | "lg";
  /** Border style */
  bordered?: boolean;
  /** Hover effect */
  hoverable?: boolean;
  /** Click handler (makes card clickable) */
  onClick?: () => void;
  /** HTML element to render as */
  as?: "div" | "article" | "section";
}

const cardPaddingClasses = {
  none: "p-0",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5 lg:p-6",
  lg: "p-6 sm:p-8",
};

const shadowClasses = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
};

/**
 * Flexible card component with variants
 */
export function Card({
  children,
  className,
  padding = "md",
  shadow = "sm",
  bordered = true,
  hoverable = false,
  onClick,
  as: Component = "div",
}: CardProps) {
  return (
    <Component
      className={cn(
        "bg-white rounded-lg",
        cardPaddingClasses[padding],
        shadowClasses[shadow],
        bordered && "border border-gray-200",
        hoverable && "transition-all duration-200 hover:shadow-md hover:border-gray-300",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </Component>
  );
}

// ============================================================================
// SECTION COMPONENT
// ============================================================================

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Actions slot */
  actions?: React.ReactNode;
  /** Vertical padding */
  padding?: "none" | "sm" | "md" | "lg";
}

const sectionPaddingClasses = {
  none: "py-0",
  sm: "py-4",
  md: "py-6 sm:py-8",
  lg: "py-8 sm:py-12",
};

/**
 * Section component with optional header
 */
export function Section({
  children,
  className,
  title,
  description,
  actions,
  padding = "md",
}: SectionProps) {
  return (
    <section className={cn(sectionPaddingClasses[padding], className)}>
      {(title || actions) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
          <div>
            {title && (
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// ============================================================================
// DIVIDER COMPONENT
// ============================================================================

interface DividerProps {
  className?: string;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Label to display */
  label?: string;
}

/**
 * Divider line with optional label
 */
export function Divider({
  className,
  orientation = "horizontal",
  label,
}: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        className={cn(
          "h-full w-px bg-gray-200 self-stretch",
          className
        )}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  if (label) {
    return (
      <div
        className={cn("flex items-center gap-4", className)}
        role="separator"
        aria-orientation="horizontal"
      >
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-gray-500 px-2">{label}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
    );
  }

  return (
    <div
      className={cn("h-px bg-gray-200 w-full", className)}
      role="separator"
      aria-orientation="horizontal"
    />
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps {
  className?: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button/link */
  action?: React.ReactNode;
}

/**
 * Empty state placeholder component
 */
export function EmptyState({
  className,
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4",
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

interface LoadingStateProps {
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Loading text */
  text?: string;
}

const loadingSizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

/**
 * Loading spinner component
 */
export function LoadingState({
  className,
  size = "md",
  text,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12",
        className
      )}
      role="status"
      aria-label={text || "Loading"}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-gray-300 border-t-primary",
          loadingSizeClasses[size]
        )}
      />
      {text && (
        <p className="mt-3 text-sm text-gray-500">{text}</p>
      )}
    </div>
  );
}

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

interface SkeletonProps {
  className?: string;
  /** Variant */
  variant?: "text" | "circular" | "rectangular";
  /** Width */
  width?: string | number;
  /** Height */
  height?: string | number;
  /** Animation */
  animation?: "pulse" | "shimmer" | "none";
}

/**
 * Skeleton loading placeholder
 */
export function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  animation = "pulse",
}: SkeletonProps) {
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-md",
  };

  const animationClasses = {
    pulse: "animate-pulse",
    shimmer: "animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-size-200",
    none: "",
  };

  return (
    <div
      className={cn(
        "bg-gray-200",
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// RESPONSIVE VISIBILITY
// ============================================================================

interface ShowOnProps {
  children: React.ReactNode;
  /** Show on these breakpoints and above */
  breakpoint: "sm" | "md" | "lg" | "xl" | "2xl";
}

/**
 * Show content only on specified breakpoint and above
 */
export function ShowOn({ children, breakpoint }: ShowOnProps) {
  const classes = {
    sm: "hidden sm:block",
    md: "hidden md:block",
    lg: "hidden lg:block",
    xl: "hidden xl:block",
    "2xl": "hidden 2xl:block",
  };

  return <div className={classes[breakpoint]}>{children}</div>;
}

interface HideOnProps {
  children: React.ReactNode;
  /** Hide on these breakpoints and above */
  breakpoint: "sm" | "md" | "lg" | "xl" | "2xl";
}

/**
 * Hide content on specified breakpoint and above
 */
export function HideOn({ children, breakpoint }: HideOnProps) {
  const classes = {
    sm: "sm:hidden",
    md: "md:hidden",
    lg: "lg:hidden",
    xl: "xl:hidden",
    "2xl": "2xl:hidden",
  };

  return <div className={classes[breakpoint]}>{children}</div>;
}
