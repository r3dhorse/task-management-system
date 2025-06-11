"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  SortingState,
  useReactTable,
  getFilteredRowModel,
  getPaginationRowModel,
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

import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";


interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const handleRowDoubleClick = (row: { original: unknown }) => {
    const original = row.original as { $id?: string };
    const taskId = original.$id;
    if (taskId && workspaceId) {
      router.push(`/workspaces/${workspaceId}/tasks/${taskId}`);
    }
  };

  return (
    <div>

      {/* <div className="flex items-center py-4">
        <Input
          placeholder="Filter tasks"
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div> */}




      <div className="rounded-lg border-2 border-neutral-200/80 bg-white/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    return (
                      <TableHead key={header.id} className="whitespace-nowrap">
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
                  onDoubleClick={() => handleRowDoubleClick(row)}
                  onClick={() => handleRowDoubleClick(row)}
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

      <div className="flex items-center justify-center sm:justify-end mt-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="min-h-[44px] px-4 touch-manipulation"
          >
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="min-h-[44px] px-4 touch-manipulation"
          >
            Next
          </Button>
        </div>
      </div>

    </div>
  );
}
