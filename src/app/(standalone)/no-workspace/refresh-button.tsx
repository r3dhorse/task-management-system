"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

export const RefreshButton = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  return (
    <Button 
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex-1 bg-blue-600 hover:bg-blue-700"
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? "Refreshing..." : "Refresh Page"}
    </Button>
  );
};