import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetServices } from "@/features/services/api/use-get-services";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { DatePicker } from "@/components/date-picker";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Package, UserIcon, ListChecksIcon, FilterX } from "@/lib/lucide-icons";
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
    .filter((member) => (member as Member).role !== MemberRole.VISITOR)
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

  if (isLoading) return null;
  return (
    <div className="flex flex-col lg:flex-row gap-2">
      {/* Task Number Search */}
      <TaskNumberSearch />

      <Select
        value={status || "all"}
        onValueChange={(value) => onStatusChange(value)}
      >
        <SelectTrigger className="w-full lg:w-auto h-8">
          <div className="flex items-center pr-2">
            <ListChecksIcon className="size-4 mr-2" />
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
              📋 Backlog
            </div>
          </SelectItem>
          <SelectItem value={TaskStatus.TODO} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              📝 To Do
            </div>
          </SelectItem>
          <SelectItem value={TaskStatus.IN_PROGRESS} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              🚀 In Progress
            </div>
          </SelectItem>
          <SelectItem value={TaskStatus.IN_REVIEW} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              👀 In Review
            </div>
          </SelectItem>
          <SelectItem value={TaskStatus.DONE} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              ✅ Done
            </div>
          </SelectItem>
          <SelectItem value={TaskStatus.ARCHIVED} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              📦 Archived
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={assigneeId || "all"}
        onValueChange={(value) => onAssigneeChange(value)}
      >
        <SelectTrigger className="w-full lg:w-auto h-8">
          <div className="flex items-center pr-2">
            <UserIcon className="size-4 mr-2" />
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
        <SelectTrigger className="w-full lg:w-auto h-8">
          <div className="flex items-center pr-2">
            <Package className="size-4 mr-2" />
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
        className="h-8 w-full lg:w-auto"
        value={dueDate ? new Date(dueDate) : undefined}
        onChange={(date) => {
          setFilters({ dueDate: date ? date.toISOString() : null })
        }}


      />

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
  );
};