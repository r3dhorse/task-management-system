"use client";

import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserIcon, ShieldIcon, FilterX } from "@/lib/lucide-icons";
import { MemberRole } from "../types";
import { MemberSearch } from "./member-search";

interface MemberFiltersProps {
  selectedRole: MemberRole | "all";
  onRoleChange: (role: MemberRole | "all") => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export const MemberFilters = ({
  selectedRole,
  onRoleChange,
  search,
  onSearchChange,
}: MemberFiltersProps) => {
  const clearFilters = () => {
    onRoleChange("all");
    onSearchChange("");
  };

  const hasActiveFilters = selectedRole !== "all" || search.length > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Search and Role Filter */}
      <div className="flex items-center gap-2">
        <MemberSearch value={search} onChange={onSearchChange} />
        <Select
          value={selectedRole}
          onValueChange={(value) => onRoleChange(value as MemberRole | "all")}
        >
          <SelectTrigger className="w-auto h-8">
            <div className="flex items-center pr-2">
              <UserIcon className="size-4 mr-2" />
              <SelectValue placeholder="All roles" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-medium">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                All Roles
              </div>
            </SelectItem>
            <SelectSeparator />
            <SelectItem value={MemberRole.ADMIN} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <ShieldIcon className="w-3 h-3" />
                Admin
              </div>
            </SelectItem>
            <SelectItem value={MemberRole.MEMBER} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <UserIcon className="w-3 h-3" />
                Member
              </div>
            </SelectItem>
            <SelectItem value={MemberRole.CUSTOMER} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                <UserIcon className="w-3 h-3" />
                Customer
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            onClick={clearFilters}
            variant="outline"
            size="sm"
            className="h-8 px-2 lg:px-3 bg-white hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 group"
          >
            <FilterX className="h-4 w-4 mr-0 lg:mr-2 group-hover:rotate-12 transition-transform duration-200" />
            <span className="hidden lg:inline">Clear filters</span>
          </Button>
        )}
      </div>
    </div>
  );
};