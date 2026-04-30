'use client';
import { faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { Col, Dropdown, DropdownButton, Row } from 'react-bootstrap';
import styles from './SearchControls.module.css';

interface Pagination {
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

interface SearchControlsProps {
  handleLimit?: (limit: string | null) => void;
  handleOrder?: (order: 'asc' | 'desc' | null) => void;
  selectedLimit: number;
  selectedOrder?: 'asc' | 'desc';
  pagination?: Pagination;
}

const SearchControls: React.FC<SearchControlsProps> = ({
  handleLimit,
  handleOrder,
  selectedLimit,
  selectedOrder,
  pagination,
}) => {
  const t = useTranslations('Search');

  return (
    <Row className='align-items-center mb-3'>
      <Col>
        <span className={styles.amountOfResults}>
          {t('resultsCount', { count: pagination?.total ?? 0 })}
        </span>
      </Col>
      <Col className='d-flex justify-content-end'>
        <DropdownButton
          id='dropdown-results-per-page'
          title={t('resultsPerPage', { count: selectedLimit })}
          className='me-2'
          variant='outline-secondary'
          onSelect={handleLimit}
        >
          <Dropdown.Item eventKey='10'>10</Dropdown.Item>
          <Dropdown.Item eventKey='20'>20</Dropdown.Item>
          <Dropdown.Item eventKey='50'>50</Dropdown.Item>
        </DropdownButton>
        <DropdownButton
          id='dropdown-sort-order'
          title={t('sortOrder')}
          variant='outline-secondary'
          onSelect={(eventKey) => {
            if (eventKey === 'asc' || eventKey === 'desc' || eventKey === null) {
              handleOrder?.(eventKey);
            }
          }}
        >
          <Dropdown.Item eventKey='desc' active={selectedOrder === 'desc'}>
            {t('newestFirst')} <FontAwesomeIcon icon={faArrowDown} />
          </Dropdown.Item>
          <Dropdown.Item eventKey='asc' active={selectedOrder === 'asc'}>
            {t('oldestFirst')} <FontAwesomeIcon icon={faArrowUp} />
          </Dropdown.Item>
        </DropdownButton>
      </Col>
    </Row>
  );
};

export default SearchControls;
