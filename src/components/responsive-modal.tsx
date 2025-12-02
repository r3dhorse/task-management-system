import { useMedia } from "react-use";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ResponsiveModalProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disableOutsideClick?: boolean;
  hideCloseButton?: boolean;
  title?: string;
  description?: string;
  hideTitle?: boolean;
  hideDescription?: boolean;
  /** Footer content that stays fixed at the bottom (mobile drawer only) */
  footer?: React.ReactNode;
}

export const ResponsiveModal = ({
  children,
  open,
  onOpenChange,
  disableOutsideClick = false,
  hideCloseButton = false,
  title,
  description,
  hideTitle = false,
  hideDescription = false,
  footer
}: ResponsiveModalProps) => {
  const isDesktop = useMedia("(min-width: 1024px)", true);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-full sm:max-w-lg border-none overflow-y-auto hide-scrollbar max-h-[85vh] mx-4"
          onInteractOutside={disableOutsideClick ? (e) => e.preventDefault() : undefined}
          onEscapeKeyDown={disableOutsideClick ? (e) => e.preventDefault() : undefined}
          hideCloseButton={hideCloseButton}
        >
          {title && (
            hideTitle ? (
              <VisuallyHidden>
                <DialogTitle>{title}</DialogTitle>
              </VisuallyHidden>
            ) : (
              <DialogTitle className="sr-only">{title}</DialogTitle>
            )
          )}
          {description && (
            hideDescription ? (
              <VisuallyHidden>
                <DialogDescription>{description}</DialogDescription>
              </VisuallyHidden>
            ) : (
              <DialogDescription className="sr-only">{description}</DialogDescription>
            )
          )}
          {children}
          {footer}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={!disableOutsideClick}>
      <DrawerContent className="max-h-[85vh] flex flex-col">
        {title && (
          hideTitle ? (
            <VisuallyHidden>
              <DrawerTitle>{title}</DrawerTitle>
            </VisuallyHidden>
          ) : (
            <DrawerTitle className="sr-only">{title}</DrawerTitle>
          )
        )}
        {description && (
          hideDescription ? (
            <VisuallyHidden>
              <DrawerDescription>{description}</DrawerDescription>
            </VisuallyHidden>
          ) : (
            <DrawerDescription className="sr-only">{description}</DrawerDescription>
          )
        )}
        {/* Scrollable content area - flex-1 to take remaining space, min-h-0 to allow shrinking */}
        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar px-4">
          {children}
        </div>
        {/* Fixed footer - shrink-0 ensures it never shrinks */}
        {footer && (
          <div className="shrink-0 border-t bg-white px-4 py-4 pb-safe">
            {footer}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
