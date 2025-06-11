import { useMedia } from "react-use";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";


interface ResponsiveModalProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disableOutsideClick?: boolean;
}

export const ResponsiveModal = ({
  children,
  open,
  onOpenChange,
  disableOutsideClick = false
}: ResponsiveModalProps) => {
  const isDesktop = useMedia("(min-width: 1024px)", true);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="w-full sm:max-w-lg border-none overflow-y-auto hide-scrollbar max-h-[85vh] mx-4"
          onInteractOutside={disableOutsideClick ? (e) => e.preventDefault() : undefined}
        >
          {children}
        </DialogContent>
      </Dialog>

    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={!disableOutsideClick}>
      <DrawerContent className="max-h-[90vh]">
        <div className="w-full border-none overflow-y-auto hide-scrollbar max-h-[80vh] p-4">
          {children}
        </div>
      </DrawerContent>
    </Drawer >
  );
};
