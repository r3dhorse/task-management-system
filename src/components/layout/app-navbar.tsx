"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, Home, Settings } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileSidebarTrigger } from "./app-sidebar";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

// ============================================================================
// TYPES
// ============================================================================

interface AppNavbarProps {
  /** Additional class name */
  className?: string;
  /** Show search bar */
  showSearch?: boolean;
  /** Show breadcrumb */
  showBreadcrumb?: boolean;
  /** Custom title */
  title?: string;
  /** Actions slot */
  actions?: React.ReactNode;
}

// ============================================================================
// BREADCRUMB HELPERS
// ============================================================================

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

/**
 * Generate breadcrumb items from pathname
 */
function getBreadcrumbItems(pathname: string, workspaceId?: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];

  // Always start with home
  if (workspaceId) {
    items.push({
      label: "Home",
      href: `/workspaces/${workspaceId}`,
      icon: <Home className="h-4 w-4" />,
    });
  }

  // Parse path segments
  const segments = pathname.split("/").filter(Boolean);

  // Skip workspaces and workspace ID
  let i = 0;
  while (i < segments.length) {
    const segment = segments[i];

    if (segment === "workspaces") {
      i += 2; // Skip 'workspaces' and the ID
      continue;
    }

    // Format segment name
    const label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    items.push({ label });
    i++;
  }

  return items;
}

// ============================================================================
// APP NAVBAR COMPONENT
// ============================================================================

/**
 * Top navigation bar with mobile menu trigger, breadcrumb, and actions
 *
 * Features:
 * - Mobile sidebar trigger (hidden on desktop)
 * - Breadcrumb navigation
 * - Search bar (optional)
 * - Actions slot for additional buttons
 * - Notification dropdown
 */
export function AppNavbar({
  className,
  showSearch = false,
  showBreadcrumb = true,
  title,
  actions,
}: AppNavbarProps) {
  const pathname = usePathname();
  const workspaceId = useWorkspaceId();
  const breadcrumbItems = getBreadcrumbItems(pathname, workspaceId);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex items-center gap-4 border-b border-neutral-200 bg-white px-4 py-3",
        "lg:px-6",
        className
      )}
    >
      {/* Mobile Menu Button */}
      <div className="lg:hidden">
        <MobileSidebarTrigger />
      </div>

      {/* Breadcrumb / Title */}
      <div className="flex-1 min-w-0">
        {title ? (
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h1>
        ) : showBreadcrumb && breadcrumbItems.length > 0 ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2">
            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <span className="text-gray-400 text-sm">/</span>
                )}
                <span
                  className={cn(
                    "text-sm truncate",
                    index === breadcrumbItems.length - 1
                      ? "font-medium text-gray-900"
                      : "text-gray-500"
                  )}
                >
                  {item.icon && (
                    <span className="inline-flex items-center gap-1">
                      {item.icon}
                      <span className="sr-only sm:not-sr-only">{item.label}</span>
                    </span>
                  )}
                  {!item.icon && item.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        ) : null}
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="hidden md:flex items-center max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="navbar-search"
              name="navbar-search"
              type="search"
              placeholder="Search..."
              className="pl-9 pr-4 h-9 w-full bg-gray-50 border-gray-200 focus:bg-white"
              autoComplete="off"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Custom actions */}
        {actions}

        {/* Mobile notification (hidden on desktop - shown in sidebar) */}
        <div className="lg:hidden">
          <NotificationDropdown />
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// COMPACT NAVBAR (FOR SPECIFIC PAGES)
// ============================================================================

interface CompactNavbarProps {
  title: string;
  className?: string;
  backHref?: string;
  actions?: React.ReactNode;
}

/**
 * Compact navbar for task detail pages and similar
 */
export function CompactNavbar({
  title,
  className,
  backHref,
  actions,
}: CompactNavbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2",
        className
      )}
    >
      {/* Mobile Menu Button */}
      <div className="lg:hidden">
        <MobileSidebarTrigger />
      </div>

      {/* Title */}
      <h1 className="flex-1 text-base font-medium text-gray-900 truncate">
        {title}
      </h1>

      {/* Actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

// ============================================================================
// PAGE CONTAINER WITH NAVBAR
// ============================================================================

interface PageWithNavbarProps {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
  actions?: React.ReactNode;
  className?: string;
  /** Content class name */
  contentClassName?: string;
}

/**
 * Page container with integrated navbar
 */
export function PageWithNavbar({
  children,
  title,
  showSearch,
  actions,
  className,
  contentClassName,
}: PageWithNavbarProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <AppNavbar title={title} showSearch={showSearch} actions={actions} />
      <main
        className={cn(
          "flex-1 overflow-auto p-4 lg:p-6",
          contentClassName
        )}
      >
        {children}
      </main>
    </div>
  );
}
