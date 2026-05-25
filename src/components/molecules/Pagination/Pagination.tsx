import React from 'react';

import styles from './Pagination.module.css';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    totalItems
}) => {
    if (totalPages <= 1) return null;

    return (
        <div className={styles.pagination}>
            <button
                className={styles.arrowBtn}
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous Page"
            >
                <FiChevronLeft size={20} />
            </button>
            <div className={styles.infoWrapper}>
                <span className={styles.pageInfo}>
                    Page {currentPage} of {totalPages}
                </span>
                {totalItems !== undefined && (
                    <span className={styles.totalInfo}>
                        (Total {totalItems} items)
                    </span>
                )}
            </div>
            <button
                className={styles.arrowBtn}
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next Page"
            >
                <FiChevronRight size={20} />
            </button>
        </div>
    );
};
