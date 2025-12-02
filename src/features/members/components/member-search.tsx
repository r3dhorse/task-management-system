"use client";

import { useState } from "react";
import { Search, X } from "@/lib/lucide-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MemberSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export const MemberSearch = ({ value, onChange }: MemberSearchProps) => {
  const [localSearch, setLocalSearch] = useState(value);

  const handleInputChange = (inputValue: string) => {
    setLocalSearch(inputValue);
    onChange(inputValue);
  };

  const clearSearch = () => {
    setLocalSearch("");
    onChange("");
  };

  const hasSearch = localSearch.length > 0;

  return (
    <div className="relative w-full lg:w-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members by name..."
          value={localSearch}
          onChange={(e) => handleInputChange(e.target.value)}
          className={cn(
            "h-8 pl-9 pr-8 w-full lg:w-64",
            hasSearch && "ring-2 ring-blue-200 border-blue-300"
          )}
          autoComplete="off"
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