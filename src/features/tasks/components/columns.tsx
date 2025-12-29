"use client"

import { ArrowUpDown, EyeOffIcon } from "@/lib/lucide-icons"
import { ColumnDef } from "@tanstack/react-table"
import { PopulatedTask } from "../types"
import { Button } from "@/components/ui/button"
import { TaskDate } from "./task-date"
import { StatusBadge } from "./status-badge"

export const columns: ColumnDef<PopulatedTask>[] = [
  {
    accessorKey: "taskNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === "asc")
          }
          className="px-2 sm:px-4"
        >
          <span className="hidden sm:inline">Task #</span>
          <span className="sm:hidden">#</span>
          <ArrowUpDown className="ml-1 sm:ml-3 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const taskNumber = row.original.taskNumber;
      return (
        <div className="font-mono text-xs sm:text-sm text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-blue-200 inline-block">
          {taskNumber}
        </div>
      )
    },
    meta: {
      // Always visible
      priority: 1,
    }
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === "asc")
          }
          className="px-2 sm:px-4"
        >
          <span className="hidden sm:inline">Task Name</span>
          <span className="sm:hidden">Name</span>
          <ArrowUpDown className="ml-1 sm:ml-3 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const name = row.original.name;
      const isConfidential = row.original.isConfidential;
      return (
        <div className="flex items-center gap-1 sm:gap-2 max-w-[120px] sm:max-w-[200px] md:max-w-none">
          <p className="line-clamp-1 sm:line-clamp-2 flex-1 text-xs sm:text-sm">{name}</p>
          {isConfidential && (
            <EyeOffIcon className="size-3 text-orange-600 flex-shrink-0" />
          )}
        </div>
      )
    },
    meta: {
      // Always visible
      priority: 1,
    }
  },
  {
    accessorKey: "service",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === "asc")
          }
          className="px-2 sm:px-4"
        >
          Service
          <ArrowUpDown className="ml-1 sm:ml-3 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const service = row.original?.service;
      return (
        <div className="flex items-center gap-x-2 text-xs sm:text-sm font-medium max-w-[100px] sm:max-w-none">
          <p className="line-clamp-1">{service?.name || 'No Service'}</p>
        </div>
      );
    },
    meta: {
      // Hidden on mobile
      hideOnMobile: true,
      priority: 3,
    }
  },
  {
    accessorKey: "assignees",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === "asc")
          }
          className="px-2 sm:px-4"
        >
          Assignee
          <ArrowUpDown className="ml-1 sm:ml-3 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const assignees = row.original.assignees || [];
      const assigneeWithName = assignees as Array<{ id: string; name?: string; [key: string]: unknown }>;

      return (
        <div className="flex items-center gap-x-1 sm:gap-x-2 max-w-[80px] sm:max-w-none">
          {assigneeWithName.length > 0 ? (
            <span className="text-xs sm:text-sm font-medium line-clamp-1">
              {assigneeWithName.length === 1
                ? (assigneeWithName[0].name || 'Unknown')
                : `${assigneeWithName[0].name || 'Unknown'} +${assigneeWithName.length - 1}`
              }
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}
        </div>
      )
    },
    meta: {
      // Hidden on small mobile
      hideOnMobile: true,
      priority: 4,
    }
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === "asc")
          }
          className="px-2 sm:px-4"
        >
          <span className="hidden sm:inline">Due Date</span>
          <span className="sm:hidden">Due</span>
          <ArrowUpDown className="ml-1 sm:ml-3 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const dueDate = row.original.dueDate;
      return (
        <div className="text-xs sm:text-sm">
          <TaskDate value={dueDate} />
        </div>
      )
    },
    meta: {
      // Hide on very small screens
      priority: 2,
    }
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === "asc")
          }
          className="px-2 sm:px-4"
        >
          Status
          <ArrowUpDown className="ml-1 sm:ml-3 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const status = row.original.status;
      return <StatusBadge status={status} size="sm" />
    },
    meta: {
      // Always visible
      priority: 1,
    }
  }
];
