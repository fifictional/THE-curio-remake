import * as React from "react"
import { Search as SearchIcon, ChevronUp, ChevronDown } from "lucide-react"
import { Input } from "./input"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { useListenToBrowserSearch } from "@/hooks/use-listen-to-browser-search"
import { useRef } from "react"

export interface SearchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
  matches?: number;
  selectedMatchIndex?: number;
  onNextMatch?: () => void;
  onPreviousMatch?: () => void;
}

const FinderSearch = ({ className, containerClassName, matches, selectedMatchIndex, onNextMatch, onPreviousMatch, ...props }: SearchProps) => {
  const hasMatches = typeof matches === 'number' && props.value !== '';
  const ref = useRef<HTMLInputElement>(null);

  useListenToBrowserSearch({
    onSearch: () => {
      (ref as React.RefObject<HTMLInputElement>)?.current?.focus();
    }
  });
  
  return (
    <div className={cn("relative border border-gray-200 rounded-full w-[calc(100%-40px)]", containerClassName)}>
      <SearchIcon 
        className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
      />
      <Input
        ref={ref}
        type="search"
        placeholder="Search"
        className={cn(
          "pl-11 text-md rounded-full pr-26 h-10 bg-white border-0 w-full",
          className
        )}
        {...props}
      />
      
      {/* Matches counter and navigation */}
      {hasMatches && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <span className="text-sm text-gray-500 mr-1">
            {selectedMatchIndex !== undefined ? `${selectedMatchIndex + 1}/${matches}` : `${matches} results`}
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-gray-100"
              onClick={onPreviousMatch}
              disabled={!matches || matches === 0}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-gray-100"
              onClick={onNextMatch}
              disabled={!matches || matches === 0}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { FinderSearch } 