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
        >
          Task #
          <ArrowUpDown className="ml-3 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const taskNumber = row.original.taskNumber;
      return (
        <div className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 inline-block">
          {taskNumber}
        </div>
      )
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
        >
          Task Name
          <ArrowUpDown className="ml-3 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const name = row.original.name;
      const isConfidential = row.original.isConfidential;
      return (
        <div className="flex items-center gap-2">
          <p className="line-clamp-1 flex-1">{name}</p>
          {isConfidential && (
            <EyeOffIcon className="size-3 text-orange-600 flex-shrink-0" />
          )}
        </div>
      )
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
        >
          Service
          <ArrowUpDown className="ml-3 h-4 w-4" />
        </Button>
      )
    },

    cell: ({ row }) => {
      const service = row.original?.service;
      return (
        <div className="flex items-center gap-x-2 text-sm font-medium">
          <p className="line-clamp-1">{service?.name || 'No Service'}</p>
        </div>
      );
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
        >
          Assignee
          <ArrowUpDown className="ml-3 h-4 w-4" />
        </Button>
      )
    },

    cell: ({ row }) => {
      const assignees = row.original.assignees || [];
      const assigneeWithName = assignees as Array<{ id: string; name?: string; [key: string]: unknown }>;

      return (
        <div className="flex items-center gap-x-2">
          {assigneeWithName.length > 0 ? (
            assigneeWithName.map((assignee) => (
              <span key={assignee.id} className="text-sm font-medium">
                {assignee.name || 'Unknown'}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No assignee</span>
          )}
        </div>
      )
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
        >
          Due Date
          <ArrowUpDown className="ml-3 h-4 w-4" />
        </Button>
      )
    },

    cell: ({ row }) => {
      const dueDate = row.original.dueDate;

      return <TaskDate value={dueDate} />

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
        >
          Status
          <ArrowUpDown className="ml-3 h-4 w-4" />
        </Button>
      )
    },

    cell: ({ row }) => {
      const status = row.original.status;

      return <StatusBadge status={status} size="sm" />

    }
  }
];
