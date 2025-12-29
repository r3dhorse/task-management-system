"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  SortingState,
  useReactTable,
  getFilteredRowModel,
  getSortedRowModel,
  getCoreRowModel,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, EyeOffIcon, CalendarIcon, UserIcon, FolderOpen, FileTextIcon, Users, MessageSquare, ListTodo } from "@/lib/lucide-icons";
import { PopulatedTask } from "../types";
import { TaskDate } from "./task-date";
import { StatusBadge } from "./status-badge";
import { Badge } from "@/components/ui/badge";

interface DataTablePaginatedProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

// Mobile Task Card Component
function TaskCard({
  task,
  onClick,
}: {
  task: PopulatedTask;
  onClick: () => void;
}) {
  const assignees = task.assignees || [];
  const reviewer = task.reviewer as { id: string; name?: string } | null;
  const subTaskCount = task.subTaskCount || 0;
  const hasDescription = task.description && task.description.trim().length > 0;
  const hasAttachment = !!task.attachmentId;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer active:scale-[0.99] touch-manipulation"
    >
      {/* Header: Task Number + Badges + Status */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {task.taskNumber}
          </span>
          {/* Task Type Badge */}
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-5 ${
              task.parentTaskId
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-green-50 text-green-700 border-green-200'
            }`}
          >
            {task.parentTaskId ? 'Subtask' : 'Main'}
          </Badge>
          {task.isConfidential && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-orange-50 text-orange-600 border-orange-200">
              <EyeOffIcon className="size-2.5 mr-0.5" />
              Private
            </Badge>
          )}
        </div>
        <StatusBadge status={task.status} size="sm" />
      </div>

      {/* Task Name */}
      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 leading-snug">
        {task.name}
      </h3>

      {/* Description Preview */}
      {hasDescription && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2.5 leading-relaxed bg-gray-50/80 rounded-lg p-2 border border-gray-100">
          {task.description}
        </p>
      )}

      {/* Primary Meta Row: Service, Due Date */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-600 mb-2">
        {/* Service */}
        {task.service && (
          <div className="flex items-center gap-1 bg-blue-50/60 px-2 py-0.5 rounded-full">
            <FolderOpen className="size-3 text-blue-500" />
            <span className="truncate max-w-[100px] font-medium">{task.service.name}</span>
          </div>
        )}

        {/* Due Date */}
        <div className="flex items-center gap-1">
          <CalendarIcon className="size-3 text-gray-400" />
          <TaskDate value={task.dueDate} className="text-xs font-medium" />
        </div>
      </div>

      {/* Secondary Meta Row: Assignee, Reviewer */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-500 mb-2">
        {/* Assignee */}
        <div className="flex items-center gap-1">
          <UserIcon className="size-3 text-indigo-400" />
          <span className="font-medium text-gray-600">
            {assignees.length > 0
              ? assignees.length === 1
                ? assignees[0].name || 'Unknown'
                : `${assignees[0].name} +${assignees.length - 1}`
              : 'Unassigned'
            }
          </span>
        </div>

        {/* Reviewer (if in review or done) */}
        {(task.status === 'IN_REVIEW' || task.status === 'DONE') && reviewer && (
          <div className="flex items-center gap-1">
            <Users className="size-3 text-purple-400" />
            <span className="text-purple-600 font-medium">{reviewer.name || 'Reviewer'}</span>
          </div>
        )}
      </div>

      {/* Footer: Sub-tasks, Attachments */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          {/* Task created date if available */}
          {task.createdAt && (
            <span className="truncate">
              Created {new Date(task.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tasks count */}
          {subTaskCount > 0 && (
            <div className="flex items-center gap-0.5 text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              <ListTodo className="size-3" />
              <span>{subTaskCount}</span>
            </div>
          )}

          {/* Has Attachment */}
          {hasAttachment && (
            <div className="flex items-center text-blue-500">
              <FileTextIcon className="size-3.5" />
            </div>
          )}

          {/* Status dot indicator */}
          <div className={`h-2 w-2 rounded-full ${
            task.status === 'BACKLOG' ? 'bg-gray-400' :
            task.status === 'TODO' ? 'bg-blue-500' :
            task.status === 'IN_PROGRESS' ? 'bg-amber-500' :
            task.status === 'IN_REVIEW' ? 'bg-purple-500' :
            task.status === 'DONE' ? 'bg-emerald-500' : 'bg-gray-400'
          }`} />
        </div>
      </div>
    </div>
  );
}

export function DataTablePaginated<TData, TValue>({
  columns,
  data,
  totalCount,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginatedProps<TData, TValue>) {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const totalPages = Math.ceil(totalCount / pageSize);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    manualPagination: true,
    pageCount: totalPages,
  });

  const handleRowClick = (row: { original: unknown }, e: React.MouseEvent) => {
    // Check if the click was on the actions column (avoid navigating when clicking actions)
    const target = e.target as HTMLElement;
    if (target.closest('[data-testid="task-actions"]')) {
      return;
    }

    const original = row.original as { id?: string };
    const taskId = original.id;

    // Validate task ID format before navigation (same validation as kanban card)
    if (!taskId || taskId.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
      console.error("Invalid task ID format:", taskId);
      toast.error("Invalid task ID format");
      return;
    }

    if (taskId && workspaceId) {
      router.push(`/workspaces/${workspaceId}/tasks/${taskId}`);
    }
  };

  // Generate page numbers for pagination
  const generatePageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Handle card click for mobile view
  const handleCardClick = (taskId: string) => {
    if (!taskId || taskId.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
      console.error("Invalid task ID format:", taskId);
      toast.error("Invalid task ID format");
      return;
    }
    router.push(`/workspaces/${workspaceId}/tasks/${taskId}`);
  };

  return (
    <div>
      {/* Mobile Card View - Hidden on md and up */}
      <div className="md:hidden space-y-3">
        {data.length > 0 ? (
          (data as PopulatedTask[]).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleCardClick(task.id)}
            />
          ))
        ) : (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
            <p className="text-sm">No tasks found</p>
          </div>
        )}
      </div>

      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden md:block rounded-lg border-2 border-neutral-200/80 bg-white/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    return (
                      <TableHead key={header.id} className="whitespace-nowrap px-2 sm:px-4">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-blue-50/50 transition-colors duration-200 border-b border-neutral-200/60 cursor-pointer touch-manipulation"
                    onClick={(e) => handleRowClick(row, e)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-2 sm:px-4 py-3 sm:py-2 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No data available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination - Responsive Layout */}
      <div className="flex flex-col gap-3 mt-4">
        {/* Mobile: Compact pagination at top */}
        <div className="flex items-center justify-between md:hidden">
          <div className="text-xs text-gray-500">
            {startItem}-{endItem} of {totalCount}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2 min-w-[60px] text-center">
              {currentPage} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop: Full pagination controls */}
        <div className="hidden md:flex flex-col sm:flex-row items-center gap-4">
          {/* Page size selector and info */}
          <div className="flex items-center gap-4 sm:flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground whitespace-nowrap">
                Rows per page:
              </p>
              <Select
                value={`${pageSize}`}
                onValueChange={(value) => {
                  onPageSizeChange(Number(value));
                }}
              >
                <SelectTrigger className="h-8 w-[70px]" aria-label="Rows per page">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[15, 50, 75, 100].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {startItem}-{endItem} of {totalCount} items
            </div>
          </div>

          {/* Pagination controls - aligned right */}
          <div className="flex justify-center sm:justify-end w-full sm:w-auto">
            <Pagination>
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => onPageChange(currentPage - 1)}
                    className={cn(
                      "cursor-pointer h-9 px-3",
                      currentPage === 1 && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>

                {generatePageNumbers().map((page, index) => (
                  <PaginationItem key={index} className="hidden sm:inline-flex">
                    {page === 'ellipsis' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => onPageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer h-9 w-9"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                {/* Show current page on small tablets */}
                <PaginationItem className="sm:hidden">
                  <span className="flex items-center justify-center h-9 px-3 text-sm font-medium">
                    {currentPage} / {totalPages || 1}
                  </span>
                </PaginationItem>

                <PaginationItem>
                  <PaginationNext
                    onClick={() => onPageChange(currentPage + 1)}
                    className={cn(
                      "cursor-pointer h-9 px-3",
                      currentPage === totalPages && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>
    </div>
  );
}