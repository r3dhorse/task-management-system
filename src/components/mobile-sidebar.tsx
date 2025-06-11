"use client";

import { MenuIcon } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export const MobileSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <Sheet modal={false} open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="primary"
          className="lg:hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 hover:bg-muted active:bg-muted p-2 min-h-[44px] min-w-[44px] touch-manipulation"
          aria-label="Open menu"
        >
          <MenuIcon className="size-6 text-neutral-300" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-80 sm:w-96">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
};
