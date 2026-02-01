import React, { useCallback, useEffect, useState } from "react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Search, X, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";

export interface ListToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;

  onFilterClick?: () => void;
  filterCount?: number;

  sort?: string;
  onSortChange?: (value: string | undefined) => void;
  sortOptions?: { label: string; value: string }[];

  className?: string;
  children?: React.ReactNode; // Extra slots
}

export const ListToolbar: React.FC<ListToolbarProps> = ({
  search,
  onSearchChange,
  placeholder = "Search...",
  onFilterClick,
  filterCount,
  sort,
  onSortChange,
  sortOptions = [],
  className,
  children,
}) => {
  const [localSearch, setLocalSearch] = useState(search ?? "");

  // Sync prop changes to local state
  useEffect(() => {
    setLocalSearch(search ?? "");
  }, [search]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = search ?? "";
      if (localSearch !== currentSearch) {
        onSearchChange?.(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange, search]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2 w-full", className)}>
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          className="pl-9 pr-8"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
        {localSearch ? (
          <button
            onClick={() => {
              setLocalSearch("");
              onSearchChange?.("");
            }}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Sort Menu */}
      {sortOptions.length > 0 && onSortChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={sort === opt.value}
                onCheckedChange={(checked) => onSortChange(checked ? opt.value : undefined)}
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))}
            {sort && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSortChange(undefined)}>
                  Clear sort
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Filter Button */}
      {onFilterClick && (
        <Button variant="outline" size="sm" className="gap-2" onClick={onFilterClick}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {filterCount ? (
            <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
              {filterCount}
            </span>
          ) : null}
        </Button>
      )}

      {/* Extra slots */}
      {children}
    </div>
  );
};
