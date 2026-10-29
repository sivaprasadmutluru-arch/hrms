import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table'
import { useState } from 'react'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import EmptyState from './EmptyState'
import { TableSkeleton } from './Skeleton'

export default function DataTable({ columns, data = [], loading = false, onRowClick }) {
  const [sorting, setSorting] = useState([])
  const table = useReactTable({ data, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() })
  if (loading) return <TableSkeleton rows={6} cols={columns.length || 5} />
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(header => (
                <th key={header.id} onClick={header.column.getToggleSortingHandler()}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide select-none ${header.column.columnDef.meta?.stickyLeft ? 'sticky left-0 z-20 bg-gray-50' : ''} ${header.column.getCanSort() ? 'cursor-pointer hover:text-gray-700' : ''}`}>
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && <ChevronUpIcon className="h-3 w-3" />}
                    {header.column.getIsSorted() === 'desc' && <ChevronDownIcon className="h-3 w-3" />}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-50 bg-white">
          {table.getRowModel().rows.length === 0 ? (
            <tr><td colSpan={columns.length}><EmptyState /></td></tr>
          ) : (
            table.getRowModel().rows.map(row => (
              <tr key={row.id} onClick={() => onRowClick?.(row.original)}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50/50'}`}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className={`px-4 py-3 text-sm text-gray-700 whitespace-nowrap ${cell.column.columnDef.meta?.stickyLeft ? 'sticky left-0 z-10 bg-white shadow-[1px_0_0_0_#f3f4f6]' : ''}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
