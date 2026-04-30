'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Pagination from 'react-bootstrap/Pagination';
import styles from './Pagination.module.css';

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

interface PaginationProps {
  pagination: Pagination;
}

const PagePagination: React.FC<PaginationProps> = ({ pagination }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const pages = pagination.pages && pagination.pages > 0 ? pagination.pages : 1;
  const page = Math.min(Math.max(1, pagination.page || 1), pages);

  const handleClick = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNumber.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className={styles.wrapper}>
      <Pagination className={styles.pagination}>
        <Pagination.Prev onClick={() => handleClick(page - 1)} disabled={!pagination.hasPrev} />

        {/*Display Pagination Items depending on the current page and total number of pages*/}
        {page !== 1 && (
          <>
            <Pagination.Item onClick={() => handleClick(1)}>1</Pagination.Item>
            {page > 3 && <Pagination.Ellipsis disabled />}
          </>
        )}

        {page > 2 && (
          <Pagination.Item onClick={() => handleClick(page - 1)}>{page - 1}</Pagination.Item>
        )}

        <Pagination.Item active>{page}</Pagination.Item>

        {pages && page < pages && (
          <Pagination.Item onClick={() => handleClick(page + 1)}>{page + 1}</Pagination.Item>
        )}

        {pages && page < pages - 1 && (
          <>
            {page < pages - 2 && <Pagination.Ellipsis disabled />}
            <Pagination.Item onClick={() => handleClick(pages as number)}>{pages}</Pagination.Item>
          </>
        )}

        <Pagination.Next onClick={() => handleClick(page + 1)} disabled={!pagination.hasNext} />
      </Pagination>
    </div>
  );
};

export default PagePagination;
