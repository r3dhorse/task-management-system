import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetServices } from "@/features/services/api/use-get-services";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { DatePicker } from "@/components/date-picker";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Package, UserIcon, ListChecksIcon, FilterX, SlidersHorizontal, X } from "@/lib/lucide-icons";
import { useState } from "react";
import { TaskStatus } from "../types";
import { useTaskFilters } from "../hooks/use-task-filters";
import { Member, MemberRole } from "@/features/members/types";
import { TaskNumberSearch } from "./task-number-search";

export const DataFilters = () => {
  const workspaceId = useWorkspaceId();

  const { data: services, isLoading: isLoadingServices } = useGetServices({ workspaceId }, { enabled: !!workspaceId });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({ workspaceId });

  const isLoading = isLoadingMembers || isLoadingServices;

  const serviceOptions = services?.documents.map((service) => ({
    value: service.id,
    label: service.name,
  }));

  const memberOptions = members?.documents
    .filter((member) => (member as Member).role !== MemberRole.CUSTOMER)
    .map((member) => ({
      value: member.id,
      label: member.name,
    }));

  const [{
    status,
    assigneeId,
    serviceId,
    dueDate,
    search
  }, setFilters] = useTaskFilters();

  const [showFilters, setShowFilters] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const onStatusChange = (value: string) => { setFilters({ status: value === "all" ? null : (value as TaskStatus), }); };
  const onAssigneeChange = (value: string) => { setFilters({ assigneeId: value === "all" ? null : (value as string), }); };
  const onServiceChange = (value: string) => { setFilters({ serviceId: value === "all" ? null : (value as string), }); };

  const clearFilters = () => {
    setFilters({
      status: null,
      assigneeId: null,
      serviceId: null,
      dueDate: null,
      search: null,
    });
  };

  const hasActiveFilters = status || assigneeId || serviceId || dueDate || search;
  const activeFilterCount = [status, assigneeId, serviceId, dueDate, search].filter(Boolean).length;

  // Reusable filter controls component
  const FilterControls = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={isMobile ? "flex flex-col gap-3" : "flex flex-col lg:flex-row gap-2"}>
      <Select
        value={status || "all"}
        onValueChange={(value) => onStatusChange(value)}
      >
        <SelectTrigger className={isMobile ? "w-full h-12 text-base rounded-xl bg-gray-50 border-gray-200" : "w-full lg:w-auto h-8"} aria-label="Filter by status">
          <div className="flex items-center pr-2">
            <ListChecksIcon className={isMobile ? "size-5 mr-3 text-gray-500" : "size-4 mr-2"} />
            <SelectValue placeholder="All statuses" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="font-medium">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              All Statuses
            </div>
          </SelectItem>
          <SelectSeparator />
          <SelectItem value={TaskStatus.BACKLOG} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              Backlog
            </div>
          </SelectItem>
          <SelectItem value={TaskStatus.TODO} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              To Do
            </div>
          </SelectItem>
          <SelectItem value={TaskStatus.IN_PROGRESS} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              In Progress
            </div>
          </SelectItem>
          <SelectItem value={TaskStatus.IN_REVIEW} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              In Review
            </div>
          </SelectItem>
          <SelectItem value={TaskStatus.DONE} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              Done
            </div>
          </SelectItem>
          <SelectItem value={TaskStatus.ARCHIVED} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              Archived
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={assigneeId || "all"}
        onValueChange={(value) => onAssigneeChange(value)}
      >
        <SelectTrigger className={isMobile ? "w-full h-12 text-base rounded-xl bg-gray-50 border-gray-200" : "w-full lg:w-auto h-8"} aria-label="Filter by assignee">
          <div className="flex items-center pr-2">
            <UserIcon className={isMobile ? "size-5 mr-3 text-gray-500" : "size-4 mr-2"} />
            <SelectValue placeholder="All assignees" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all"> All assignees</SelectItem>
          <SelectSeparator />
          {memberOptions?.map((member) => (
            <SelectItem key={member.value} value={member.value}>
              {member.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={serviceId || "all"}
        onValueChange={(value) => onServiceChange(value)}
      >
        <SelectTrigger className={isMobile ? "w-full h-12 text-base rounded-xl bg-gray-50 border-gray-200" : "w-full lg:w-auto h-8"} aria-label="Filter by service">
          <div className="flex items-center pr-2">
            <Package className={isMobile ? "size-5 mr-3 text-gray-500" : "size-4 mr-2"} />
            <SelectValue placeholder="All services" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all"> All services</SelectItem>
          <SelectSeparator />
          {serviceOptions?.map((service) => (
            <SelectItem key={service.value} value={service.value}>
              {service.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DatePicker
        placeholder="Due date"
        className={isMobile ? "h-12 w-full text-base rounded-xl bg-gray-50 border-gray-200" : "h-8 w-full lg:w-auto"}
        value={dueDate ? new Date(dueDate) : undefined}
        onChange={(date) => {
          setFilters({ dueDate: date ? date.toISOString() : null })
        }}
      />

      {hasActiveFilters && (
        <Button
          onClick={() => {
            clearFilters();
            if (isMobile) setMobileFilterOpen(false);
          }}
          variant="outline"
          size={isMobile ? "default" : "sm"}
          aria-label="Clear all filters"
          className={`${isMobile ? "h-12 w-full text-base rounded-xl" : "h-8 px-2 lg:px-3"} bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 group`}
        >
          <FilterX className={isMobile ? "h-5 w-5 mr-2" : "h-4 w-4 mr-2"} />
          Clear all filters
        </Button>
      )}
    </div>
  );

  if (isLoading) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Mobile: Search + Filter Button */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <TaskNumberSearch />
        </div>

        {/* Mobile Filter Button - Sheet Trigger */}
        <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden h-8 px-3 relative touch-manipulation"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-blue-600 text-white border-0"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl px-4 pt-2 flex flex-col"
            style={{ height: 'auto', maxHeight: '85vh', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* Drag handle indicator */}
            <div className="flex justify-center pt-2 pb-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 pb-4 pr-8">
              <SheetTitle className="text-lg font-semibold">Filter Tasks</SheetTitle>
              {hasActiveFilters && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                  {activeFilterCount} active
                </Badge>
              )}
            </div>

            {/* Scrollable filter content */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
              <FilterControls isMobile />
            </div>

            {/* Fixed bottom button */}
            <div className="pt-3 border-t border-gray-100">
              <Button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium rounded-xl"
              >
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Filter Toggle */}
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          size="sm"
          aria-label={showFilters ? "Hide filters" : "Show filters"}
          aria-expanded={showFilters}
          className={`hidden lg:flex h-8 px-3 transition-all duration-200 ${
            showFilters
              ? 'bg-gray-700 hover:bg-gray-800 text-white border-gray-700'
              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1.5" />
          Filter
          {activeFilterCount > 0 && !showFilters && (
            <Badge
              variant="secondary"
              className="ml-1.5 h-5 px-1.5 text-xs bg-blue-100 text-blue-700"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Active Filters Pills - Mobile Only */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 lg:hidden">
          {status && (
            <Badge
              variant="secondary"
              className="h-6 px-2 text-xs bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200"
              onClick={() => setFilters({ status: null })}
            >
              {status.replace('_', ' ')}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          {assigneeId && memberOptions?.find(m => m.value === assigneeId) && (
            <Badge
              variant="secondary"
              className="h-6 px-2 text-xs bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200"
              onClick={() => setFilters({ assigneeId: null })}
            >
              {memberOptions.find(m => m.value === assigneeId)?.label}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          {serviceId && serviceOptions?.find(s => s.value === serviceId) && (
            <Badge
              variant="secondary"
              className="h-6 px-2 text-xs bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200"
              onClick={() => setFilters({ serviceId: null })}
            >
              {serviceOptions.find(s => s.value === serviceId)?.label}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          {dueDate && (
            <Badge
              variant="secondary"
              className="h-6 px-2 text-xs bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200"
              onClick={() => setFilters({ dueDate: null })}
            >
              {new Date(dueDate).toLocaleDateString()}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
        </div>
      )}

      {/* Desktop Filters Section */}
      {showFilters && (
        <div className="hidden lg:block">
          <FilterControls />
        </div>
      )}
    </div>
  );
};