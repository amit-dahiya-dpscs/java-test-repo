import React from 'react';
import './Pagination.css';
// Helper function to generate the array of page numbers with ellipses
const getPageNumbers = (totalPages, currentPage) => {
    const pageNeighbours = 1; // How many pages to show on each side of the current page
    const totalNumbers = (pageNeighbours * 2) + 3; // total page numbers to show
    const totalBlocks = totalNumbers + 2; // total numbers + 2 ellipses
    if (totalPages > totalBlocks) {
        const startPage = Math.max(2, currentPage - pageNeighbours);
        const endPage = Math.min(totalPages - 1, currentPage + pageNeighbours);
        let pages = Array.from({ length: (endPage - startPage) + 1 }, (_, i) => startPage + i);

        const hasLeftSpill = startPage > 2;
        const hasRightSpill = (totalPages - endPage) > 1;
        const spillOffset = totalNumbers - (pages.length + 1);

        switch (true) {
            // handle: (1) < {4 5} [6] {7 8} > (10)
            case (hasLeftSpill && !hasRightSpill): {
                const extraPages = Array.from({ length: spillOffset + 1 }, (_, i) => startPage - 1 - i).reverse();
                pages = [...extraPages, ...pages];
                break;
            }
            // handle: (1) < {2 3} [4] {5 6} > ... (10)
            case (!hasLeftSpill && hasRightSpill): {
                const extraPages = Array.from({ length: spillOffset }, (_, i) => endPage + 1 + i);
                pages = [...pages, ...extraPages];
                break;
            }
            // handle: (1) ... < {4 5} [6] {7 8} > ... (10)
            case (hasLeftSpill && hasRightSpill):
            default: {
                pages = ['...', ...pages, '...'];
                break;
            }
        }
        return [1, ...pages, totalPages];
    }
    return Array.from({ length: totalPages }, (_, i) => i + 1);
};
const Pagination = ({ currentPage, totalPages, onPageChange, pageSize, onPageSizeChange, pageSizeOptions = [10, 25, 50, 100] }) => {
    if (totalPages <= 1 && !onPageSizeChange) {
        return null;
    }
    const pages = getPageNumbers(totalPages, currentPage);

     return (
        <div className="pagination-container">
            {/* --- NEW: Page Size Selector --- */}
            {onPageSizeChange && (
                <div className="page-size-selector">
                    <label htmlFor="pageSize">Records per page:</label>
                    <select 
                        id="pageSize" 
                        value={pageSize} 
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    >
                        {pageSizeOptions.map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Existing Pagination Controls */}
            <div className="page-controls">
                <button
                    className="pagination-button arrow-button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Go to previous page"
                >
                    &laquo;
                </button>

                {pages.map((page, index) => {
                    if (typeof page === 'string') {
                        return <span key={`${page}-${index}`} className="pagination-ellipsis">{page}</span>;
                    }
                    return (
                        <button
                            key={page}
                            className={`pagination-button page-number ${currentPage === page ? 'active' : ''}`}
                            onClick={() => onPageChange(page)}
                            disabled={currentPage === page}
                        >
                            {page}
                        </button>
                    );
                })}
                
                <button
                    className="pagination-button arrow-button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Go to next page"
                >
                    &raquo;
                </button>
            </div>
        </div>
    );
};

export default Pagination;