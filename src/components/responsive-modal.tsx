import { useMedia } from "react-use";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ResponsiveModalProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disableOutsideClick?: boolean;
  title?: string;
  description?: string;
  hideTitle?: boolean;
  hideDescription?: boolean;
}

export const ResponsiveModal = ({
  children,
  open,
  onOpenChange,
  disableOutsideClick = false,
  title,
  description,
  hideTitle = false,
  hideDescription = false
}: ResponsiveModalProps) => {
  const isDesktop = useMedia("(min-width: 1024px)", true);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="w-full sm:max-w-lg border-none overflow-y-auto hide-scrollbar max-h-[85vh] mx-4"
          onInteractOutside={disableOutsideClick ? (e) => e.preventDefault() : undefined}
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
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={!disableOutsideClick}>
      <DrawerContent className="max-h-[90vh]">
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
        <div className="w-full border-none overflow-y-auto hide-scrollbar max-h-[80vh] p-4">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
