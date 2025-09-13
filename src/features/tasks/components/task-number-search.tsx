"use client";

import { useState } from "react";
import { Search, X } from "@/lib/lucide-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTaskFilters } from "../hooks/use-task-filters";
import { cn } from "@/lib/utils";

export const TaskNumberSearch = () => {
  const [{ search }, setFilters] = useTaskFilters();
  const [localSearch, setLocalSearch] = useState(search || "");

  const handleInputChange = (value: string) => {
    setLocalSearch(value);

    // Apply filter immediately for better UX
    if (value.trim() === "") {
      setFilters({ search: null });
    } else {
      // If it looks like a task number search (contains digits)
      const hasDigits = /\d/.test(value);
      if (hasDigits) {
        // Extract numbers and create search patterns
        const digits = value.replace(/[^\d]/g, "");
        if (digits) {
          // Search for task numbers containing these digits
          setFilters({ search: digits });
        }
      } else {
        // Regular text search
        setFilters({ search: value });
      }
    }
  };

  const clearSearch = () => {
    setLocalSearch("");
    setFilters({ search: null });
  };

  const hasSearch = localSearch.length > 0;

  return (
    <div className="relative w-full lg:w-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by task number..."
          value={localSearch}
          onChange={(e) => handleInputChange(e.target.value)}
          className={cn(
            "h-8 pl-9 pr-8 w-full lg:w-64",
            hasSearch && "ring-2 ring-blue-200 border-blue-300"
          )}
        />
        {hasSearch && (
          <Button
            onClick={clearSearch}
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};