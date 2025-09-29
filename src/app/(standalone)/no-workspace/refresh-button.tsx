"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "@/lib/lucide-icons";
import { useState } from "react";
import { useRouter } from "next/navigation";

export const RefreshButton = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Navigate to home page which will handle proper workspace routing
    router.push("/");
  };

  return (
    <Button 
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex-1 bg-blue-600 hover:bg-blue-700"
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? "Checking..." : "Check for Workspaces"}
    </Button>
  );
};