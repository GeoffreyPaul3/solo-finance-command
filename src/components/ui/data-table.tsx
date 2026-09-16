import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: ((pageSize: number) => void) | undefined;
  pageSizeOptions?: number[] | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
}

export function TablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
  disabled = false,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span>
          Showing <span className="font-semibold text-foreground">{from}</span> to{" "}
          <span className="font-semibold text-foreground">{to}</span> of{" "}
          <span className="font-semibold text-foreground">{totalCount}</span> results
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => onPageSizeChange(Number(val))}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-18 text-xs font-medium">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <span className="font-medium mr-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(1)}
            disabled={page <= 1 || disabled}
            aria-label="First page"
          >
            <ChevronsLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || disabled}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || disabled}
            aria-label="Next page"
          >
            <ChevronRight className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages || disabled}
            aria-label="Last page"
          >
            <ChevronsRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface DataTableProps<T> {
  data: T[];
  totalCount?: number | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  onPageChange?: ((page: number) => void) | undefined;
  onPageSizeChange?: ((pageSize: number) => void) | undefined;
  pageSizeOptions?: number[] | undefined;
  isLoading?: boolean | undefined;
  error?: Error | string | null | undefined;
  emptyTitle?: string | undefined;
  emptyDescription?: string | undefined;
  emptyAction?: React.ReactNode | undefined;
  children: (paginatedData: T[]) => React.ReactNode;
  mobileView?: ((paginatedData: T[]) => React.ReactNode) | undefined;
  className?: string | undefined;
}

export function DataTable<T>({
  data,
  totalCount,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  isLoading = false,
  error,
  emptyTitle = "No records found",
  emptyDescription = "There are currently no items matching your criteria.",
  emptyAction,
  children,
  mobileView,
  className,
}: DataTableProps<T>) {
  // If server-side totalCount isn't provided, paginate client-side
  const effectiveTotal = totalCount ?? data.length;
  const isClientSide = totalCount === undefined;

  const paginatedData = React.useMemo(() => {
    if (!isClientSide) return data;
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, isClientSide, page, pageSize]);

  if (isLoading) {
    return (
      <div className={cn("rounded-lg border border-border bg-card p-12 text-center", className)}>
        <Loader2 className="size-7 animate-spin mx-auto text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Loading records...</p>
      </div>
    );
  }

  if (error) {
    const errorMsg = typeof error === "string" ? error : error.message;
    return (
      <div
        className={cn(
          "rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center",
          className,
        )}
      >
        <p className="text-sm font-semibold text-destructive">Failed to load data</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{errorMsg}</p>
      </div>
    );
  }

  if (effectiveTotal === 0) {
    return (
      <div className={cn("rounded-lg border border-border bg-card p-12 text-center", className)}>
        <h3 className="text-base font-semibold text-foreground">{emptyTitle}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
          {emptyDescription}
        </p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-lg border border-border bg-card overflow-hidden shadow-sm", className)}
    >
      {/* Desktop Table */}
      <div className={cn("overflow-x-auto", mobileView ? "hidden md:block" : "block")}>
        {children(paginatedData)}
      </div>

      {/* Mobile Alternative View (if provided) */}
      {mobileView && (
        <div className="block md:hidden divide-y divide-border/60">{mobileView(paginatedData)}</div>
      )}

      {/* Pagination Footer */}
      {(onPageChange || isClientSide) && effectiveTotal > pageSize && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalCount={effectiveTotal}
          onPageChange={onPageChange ?? (() => {})}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}
