"use client";

import React, { useCallback, useEffect } from "react";
import { useMedia } from "react-use";
import { X } from "@/lib/lucide-icons";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

interface ResponsiveModalProps {
  /** Modal content */
  children: React.ReactNode;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Modal title (required for accessibility) */
  title: string;
  /** Optional description */
  description?: string;
  /** Hide the title visually (still accessible) */
  hideTitle?: boolean;
  /** Hide the description visually (still accessible) */
  hideDescription?: boolean;
  /** Disable closing via outside click or escape key */
  disableClose?: boolean;
  /** Hide the close button */
  hideCloseButton?: boolean;
  /** Modal size variant */
  size?: ModalSize;
  /** Custom class name for the content */
  className?: string;
  /** Footer content */
  footer?: React.ReactNode;
  /** Header content (replaces default header) */
  header?: React.ReactNode;
  /** Show header with title and description */
  showHeader?: boolean;
  /** Whether to show the drag handle on mobile */
  showDragHandle?: boolean;
  /** Custom breakpoint for switching to drawer (default: 768px) */
  drawerBreakpoint?: number;
}

// ============================================================================
// SIZE CONFIGURATIONS
// ============================================================================

const sizeClasses: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  full: "sm:max-w-[95vw]",
};

const drawerHeightClasses: Record<ModalSize, string> = {
  sm: "max-h-[50vh]",
  md: "max-h-[70vh]",
  lg: "max-h-[80vh]",
  xl: "max-h-[85vh]",
  "2xl": "max-h-[90vh]",
  full: "max-h-[95vh]",
};

// ============================================================================
// RESPONSIVE MODAL COMPONENT
// ============================================================================

/**
 * Responsive modal that renders as Dialog on desktop and Drawer on mobile
 *
 * Features:
 * - Automatic desktop/mobile switching
 * - Multiple size variants
 * - Configurable header and footer
 * - Accessibility compliant
 * - Touch-friendly on mobile
 */
export function ResponsiveModal({
  children,
  open,
  onOpenChange,
  title,
  description,
  hideTitle = false,
  hideDescription = true,
  disableClose = false,
  hideCloseButton = false,
  size = "lg",
  className,
  footer,
  header,
  showHeader = false,
  showDragHandle = true,
  drawerBreakpoint = 768,
}: ResponsiveModalProps) {
  // Determine if we should show dialog or drawer
  const isDesktop = useMedia(`(min-width: ${drawerBreakpoint}px)`, true);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !disableClose) {
        onOpenChange(false);
      }
    },
    [disableClose, onOpenChange]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  // -------------------------------------------------------------------------
  // DESKTOP: DIALOG
  // -------------------------------------------------------------------------

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={disableClose ? undefined : onOpenChange}>
        <DialogContent
          className={cn(
            "w-full overflow-hidden",
            sizeClasses[size],
            className
          )}
          onInteractOutside={disableClose ? (e) => e.preventDefault() : undefined}
          onEscapeKeyDown={disableClose ? (e) => e.preventDefault() : undefined}
          hideCloseButton={hideCloseButton}
        >
          {/* Title - Required for accessibility */}
          {hideTitle ? (
            <VisuallyHidden>
              <DialogTitle>{title}</DialogTitle>
            </VisuallyHidden>
          ) : (
            showHeader && (
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                {description && !hideDescription && (
                  <DialogDescription>{description}</DialogDescription>
                )}
              </DialogHeader>
            )
          )}

          {/* Hidden description for screen readers */}
          {description && hideDescription && (
            <VisuallyHidden>
              <DialogDescription>{description}</DialogDescription>
            </VisuallyHidden>
          )}

          {/* Custom header */}
          {header}

          {/* Main content */}
          <div className="overflow-y-auto max-h-[70vh] hide-scrollbar">
            {children}
          </div>

          {/* Footer */}
          {footer && <DialogFooter>{footer}</DialogFooter>}
        </DialogContent>
      </Dialog>
    );
  }

  // -------------------------------------------------------------------------
  // MOBILE: DRAWER
  // -------------------------------------------------------------------------

  return (
    <Drawer
      open={open}
      onOpenChange={disableClose ? undefined : onOpenChange}
      dismissible={!disableClose}
    >
      <DrawerContent className={cn(drawerHeightClasses[size])}>
        {/* Drag handle */}
        {showDragHandle && (
          <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-gray-300" />
        )}

        {/* Title - Required for accessibility */}
        {hideTitle ? (
          <VisuallyHidden>
            <DrawerTitle>{title}</DrawerTitle>
          </VisuallyHidden>
        ) : (
          showHeader && (
            <DrawerHeader className="text-left">
              <DrawerTitle>{title}</DrawerTitle>
              {description && !hideDescription && (
                <DrawerDescription>{description}</DrawerDescription>
              )}
            </DrawerHeader>
          )
        )}

        {/* Hidden description for screen readers */}
        {description && hideDescription && (
          <VisuallyHidden>
            <DrawerDescription>{description}</DrawerDescription>
          </VisuallyHidden>
        )}

        {/* Custom header */}
        {header}

        {/* Close button for mobile if not dismissible */}
        {!hideCloseButton && disableClose && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 hide-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && <DrawerFooter className="px-4">{footer}</DrawerFooter>}
      </DrawerContent>
    </Drawer>
  );
}

// ============================================================================
// MODAL HEADER COMPONENT
// ============================================================================

interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Header component for use inside ResponsiveModal
 */
export function ModalHeader({ children, className }: ModalHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between pb-4 border-b", className)}>
      {children}
    </div>
  );
}

// ============================================================================
// MODAL FOOTER COMPONENT
// ============================================================================

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Footer component for use inside ResponsiveModal
 */
export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2 pt-4 border-t", className)}>
      {children}
    </div>
  );
}

// ============================================================================
// MODAL BODY COMPONENT
// ============================================================================

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Body component for use inside ResponsiveModal (provides consistent padding)
 */
export function ModalBody({ children, className }: ModalBodyProps) {
  return <div className={cn("py-4", className)}>{children}</div>;
}

// ============================================================================
// CONFIRMATION MODAL
// ============================================================================

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: "default" | "destructive";
  isLoading?: boolean;
}

/**
 * Pre-built confirmation modal for common confirm/cancel patterns
 */
export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  isLoading = false,
}: ConfirmModalProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      showHeader
      hideDescription={false}
      footer={
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "primary"}
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Loading...
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      }
    >
      {/* Empty children - content is in description */}
      <></>
    </ResponsiveModal>
  );
}

// ============================================================================
// ALERT MODAL
// ============================================================================

interface AlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel?: string;
  variant?: "default" | "destructive" | "warning";
  icon?: React.ReactNode;
}

/**
 * Simple alert modal for notifications and warnings
 */
export function AlertModal({
  open,
  onOpenChange,
  title,
  description,
  actionLabel = "OK",
  variant = "default",
  icon,
}: AlertModalProps) {
  const variantStyles = {
    default: {
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      buttonVariant: "primary" as const,
    },
    destructive: {
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      buttonVariant: "destructive" as const,
    },
    warning: {
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      buttonVariant: "primary" as const,
    },
  };

  const styles = variantStyles[variant];

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      hideTitle
      hideDescription
    >
      <div className="text-center py-4">
        {icon && (
          <div
            className={cn(
              "mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center",
              styles.iconBg,
              styles.iconColor
            )}
          >
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{description}</p>
        <Button
          variant={styles.buttonVariant}
          onClick={() => onOpenChange(false)}
          className="w-full sm:w-auto"
        >
          {actionLabel}
        </Button>
      </div>
    </ResponsiveModal>
  );
}
