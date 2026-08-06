"use client"

import * as React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export interface DataTableColumn<T> {
  /** Column header label. */
  header: React.ReactNode
  /** Unique key for this column. */
  key: string
  /** Render function for this column's cells. */
  cell: (row: T, index: number) => React.ReactNode
  /** Optional className applied to header and cells in this column. */
  className?: string
  /** Optional width hint (e.g. "w-12" for an icon column). */
  width?: string
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  /** Unique key extractor for the row (falls back to array index). */
  getRowKey?: (row: T, index: number) => React.Key
  /** Called when a row is clicked (makes rows appear clickable). */
  onRowClick?: (row: T, index: number) => void
  /** Optional loading state. */
  loading?: boolean
  /** Loading placeholder (default: table-shaped skeleton with 5 rows). */
  loadingSlot?: React.ReactNode
  /** Optional empty state when data.length === 0 and not loading. */
  emptySlot?: React.ReactNode
  /** Optional error state. */
  error?: React.ReactNode
  className?: string
  tableClassName?: string
}

/**
 * Generic data table with loading/empty/error slots. Built on the ui/table
 * primitive, so horizontal scroll and CSS hover come for free. Replaces the
 * hand-built <table> in DomainTable and elsewhere.
 */
export function DataTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  loading = false,
  loadingSlot,
  emptySlot,
  error,
  className,
  tableClassName,
}: DataTableProps<T>) {
  if (error) {
    return <div className={cn("text-sm text-destructive", className)}>{error}</div>
  }

  if (loading) {
    return (
      loadingSlot ?? (
        <div className={cn("space-y-2", className)}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      )
    )
  }

  if (data.length === 0) {
    return emptySlot ? <div className={className}>{emptySlot}</div> : null
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border", className)}>
      <Table className={tableClassName}>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(col.className, col.width)}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => {
            const rowKey = getRowKey?.(row, i) ?? i
            return (
              <TableRow
                key={rowKey}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(col.className, col.width)}
                  >
                    {col.cell(row, i)}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
