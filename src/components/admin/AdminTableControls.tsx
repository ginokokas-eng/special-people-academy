import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface AdminTableControlsProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  // Filter
  filterOptions?: { label: string; value: string }[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterPlaceholder?: string;
  
  // Sort
  sortOptions?: { label: string; value: string }[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  
  // Pagination
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  
  // Refresh
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AdminTableControls({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterOptions,
  filterValue,
  onFilterChange,
  filterPlaceholder = 'Filter',
  sortOptions,
  sortValue,
  onSortChange,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems = 0,
  itemsPerPage = 10,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}: AdminTableControlsProps) {
  const [showFilters, setShowFilters] = useState(false);
  
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="space-y-3">
      {/* Main controls row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 pr-8"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter toggle and Sort */}
        <div className="flex gap-2">
          {(filterOptions || sortOptions) && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-muted' : ''}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          )}

          {sortOptions && (
            <Select value={sortValue} onValueChange={onSortChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Refresh button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter row (collapsible) */}
      {showFilters && filterOptions && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          <Select value={filterValue} onValueChange={onFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={filterPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {filterValue && filterValue !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFilterChange?.('all')}
              className="gap-1"
            >
              <X className="h-3 w-3" />
              Clear filter
            </Button>
          )}
        </div>
      )}

      {/* Bottom row: Last updated + Pagination */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
        {/* Last updated */}
        {lastUpdated && (
          <p className="text-muted-foreground text-xs">
            Last updated: {format(lastUpdated, 'dd MMM yyyy, HH:mm')}
          </p>
        )}

        {/* Pagination */}
        {totalPages > 1 && onPageChange && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">
              {startItem}–{endItem} of {totalItems}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
