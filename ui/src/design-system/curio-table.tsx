import * as React from "react"
import { cn } from "@/lib/utils"

export interface CurioTableProps
  extends React.HTMLAttributes<HTMLTableElement> {}

const CurioTable = React.forwardRef<HTMLTableElement, CurioTableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <table
        ref={ref}
        className={cn(
          "w-full",
          className
        )}
        {...props}
      >
        {children}
      </table>
    )
  }
)
CurioTable.displayName = "CurioTable"

export interface CurioTableHeaderRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  headings: string[]
}

const CurioTableHeaderRow = React.forwardRef<HTMLTableRowElement, CurioTableHeaderRowProps>(
  ({ className, headings, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cn(
          "text-sm font-semibold border-b border-border",
          className
        )}
        {...props}
      >
        {headings.map((heading, index) => (
          <th
            key={index}
            className={cn(
              "text-left px-2 py-3",
              index === headings.length - 1 && "text-right"
            )}
          >
            {heading}
          </th>
        ))}
      </tr>
    )
  }
)
CurioTableHeaderRow.displayName = "CurioTableHeaderRow"

export interface CurioTableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  cells: (string | React.ReactNode)[]
  isLast?: boolean
}

const CurioTableRow = React.forwardRef<HTMLTableRowElement, CurioTableRowProps>(
  ({ className, cells, isLast = false, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cn(
          !isLast && "border-b border-border",
          className
        )}
        {...props}
      >
        {cells.map((cell, index) => (
          <td
            key={index}
            className={cn(
              "px-2 text-sm",
              typeof cell === 'string' && "text-foreground",
              index === cells.length - 1 && "text-right"
            )}
          >
            {cell}
          </td>
        ))}
      </tr>
    )
  }
)
CurioTableRow.displayName = "CurioTableRow"

export interface CurioTableRowActionColumnProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CurioTableRowActionColumn = React.forwardRef<HTMLDivElement, CurioTableRowActionColumnProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex justify-end",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CurioTableRowActionColumn.displayName = "CurioTableRowActionColumn"

export interface CurioTableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

const CurioTableBody = React.forwardRef<HTMLTableSectionElement, CurioTableBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={cn(className)}
        {...props}
      >
        {children}
      </tbody>
    )
  }
)
CurioTableBody.displayName = "CurioTableBody"

export {
  CurioTable,
  CurioTableHeaderRow,
  CurioTableRow,
  CurioTableRowActionColumn,
  CurioTableBody,
}
