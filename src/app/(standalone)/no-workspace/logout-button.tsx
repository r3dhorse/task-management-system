"use client";

import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/api/use-logout";
import { LogOut } from "lucide-react";

export const LogoutButton = () => {
  const { mutate: logout, isPending } = useLogout();

  return (
    <Button 
      onClick={() => logout()}
      disabled={isPending}
      variant="outline" 
      className="flex-1 sm:flex-initial border-neutral-300 hover:bg-neutral-50"
    >
      <LogOut className="w-4 h-4 mr-2" />
      {isPending ? "Signing out..." : "Sign Out"}
    </Button>
  );
};