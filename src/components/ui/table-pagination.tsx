import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  page: number; // 0-indexed
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  itemLabel?: string;
}

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className,
  itemLabel = "items",
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);

  if (totalItems <= 0) {
    return null;
  }

  const startItem = safePage * pageSize + 1;
  const endItem = Math.min((safePage + 1) * pageSize, totalItems);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground pt-3 border-t border-border/60",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(0);
              }}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
        <span className="font-mono text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{startItem}</span>–
          <span className="font-semibold text-foreground">{endItem}</span> of{" "}
          <span className="font-semibold text-foreground">{totalItems}</span> {itemLabel}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={safePage === 0}
          onClick={() => onPageChange(0)}
          aria-label="Go to first page"
        >
          <ChevronsLeft className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2.5 text-xs"
          disabled={safePage === 0}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-3.5" />
          <span>Prev</span>
        </Button>

        <span className="px-2 text-xs font-medium">
          Page {safePage + 1} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2.5 text-xs"
          disabled={safePage >= totalPages - 1}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={safePage >= totalPages - 1}
          onClick={() => onPageChange(totalPages - 1)}
          aria-label="Go to last page"
        >
          <ChevronsRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
