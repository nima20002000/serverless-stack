'use client';

import Button from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  showPageNumbers?: boolean;
  maxPageButtons?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  showPageNumbers = true,
  maxPageButtons = 5,
}: PaginationProps) {
  // Validate props
  if (totalPages <= 1 || totalPages < 1 || currentPage < 1) {
    return null;
  }

  // Ensure currentPage is within bounds
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // Handle page change with validation
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage || disabled) {
      return;
    }
    onPageChange(page);
  };

  // Calculate page numbers to display
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];

    if (totalPages <= maxPageButtons) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show a subset of pages with current page in the middle
      let start = Math.max(1, safePage - Math.floor(maxPageButtons / 2));
      const end = Math.min(totalPages, start + maxPageButtons - 1);

      // Adjust start if we're near the end
      if (end - start < maxPageButtons - 1) {
        start = Math.max(1, end - maxPageButtons + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Previous Button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => handlePageChange(safePage - 1)}
        disabled={disabled || safePage === 1}
      >
        قبلی
      </Button>

      {/* Page Numbers */}
      {showPageNumbers && (
        <div className="flex items-center gap-1">
          {/* First page if not visible */}
          {pageNumbers[0] > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={disabled}
              >
                1
              </Button>
              {pageNumbers[0] > 2 && (
                <span className="px-2 text-gray-500 dark:text-slate-500">
                  ...
                </span>
              )}
            </>
          )}

          {/* Page number buttons */}
          {pageNumbers.map((pageNum) => (
            <Button
              key={pageNum}
              variant={safePage === pageNum ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handlePageChange(pageNum)}
              disabled={disabled}
            >
              {pageNum.toLocaleString('fa-IR')}
            </Button>
          ))}

          {/* Last page if not visible */}
          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="px-2 text-gray-500 dark:text-slate-500">
                  ...
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={disabled}
              >
                {totalPages.toLocaleString('fa-IR')}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Next Button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => handlePageChange(safePage + 1)}
        disabled={disabled || safePage === totalPages}
      >
        بعدی
      </Button>

      {/* Page Info */}
      {!showPageNumbers && (
        <span className="text-sm text-gray-600 dark:text-slate-400 mx-2">
          صفحه {safePage.toLocaleString('fa-IR')} از{' '}
          {totalPages.toLocaleString('fa-IR')}
        </span>
      )}
    </div>
  );
}
