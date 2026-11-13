import * as React from "react"
import { Search as SearchIcon } from "lucide-react"
import { Input } from "./input"
import { cn } from "@/lib/utils"

export interface SearchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

const Search = React.forwardRef<HTMLInputElement, SearchProps>(
  ({ className, containerClassName, ...props }, ref) => {
    return (
      <div className={cn("relative border border-gray-200 rounded-full w-[calc(100%-40px)]", containerClassName)}>
        <SearchIcon 
          className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
        />
        <Input
          type="search"
          placeholder="Search"
          className={cn(
            "pl-11 text-md rounded-full pr-4 h-10 bg-white border-0 w-full",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
Search.displayName = "Search"

export { Search } 