'use client';
import { useSearchFilters } from '@/components/search/useSearchFilters';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button, Col, Container, Row, Spinner } from 'react-bootstrap';
import FilesCardImageLeft from '../files/FilesCardImageLeft';
import PagePagination from '../pagination/Pagination';
import SearchControls from './SearchControls';
import SearchFilters from './SearchFilters';
import SearchInput from './SearchInput';
import styles from './SearchPage.module.css';
import { useSearchDocuments } from './useSearchDocuments';
import useWindowDimensions from './useWindowDimensions';

const SearchPage: React.FC = () => {
  const t = useTranslations('Search');
  const { width } = useWindowDimensions();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const params = new URLSearchParams(searchParams.toString());

  // Extract query parameters
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? 1);
  const limit = Number(searchParams.get('limit') ?? 10);
  const sortOrder: 'asc' | 'desc' = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  // UseSearchFilters hook handles the logic for filter states and URL sync
  const {
    handleCheckboxToggle,
    clearSelection,
    selectedAuthors,
    selectedLanguages,
    selectedTypes,
    selectedLocations,
    selectedSubjectIndex,
    handleDateInputChange,
    _startDate,
    _endDate,
    searchTerm,
    setSearchTerm,
  } = useSearchFilters();

  // UseSearchDocuments hook to fetch documents based on search and filters
  const { documents, pagination, typeCounts, authors, locations, subjectIndex } =
    useSearchDocuments({
      search,
      page,
      limit,
      sortOrder,
      searchTerm,
      startDate: _startDate,
      endDate: _endDate,
    });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedLimit, setSelectedLimit] = useState<number>(10);
  const [selectedOrder, setSelectedOrder] = useState<'asc' | 'desc'>('desc');

  // Handle changes in results per page
  const handleLimit = (eventKey: string | null) => {
    if (!eventKey) return;
    setSelectedLimit(Number(eventKey));
    params.set('limit', eventKey);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  // Handle changes in sort order
  const handleOrder = (eventKey: 'asc' | 'desc' | null) => {
    if (!eventKey) return;
    setSelectedOrder(eventKey);
    params.set('sortOrder', eventKey);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  // Clear search input
  const handleClear = () => {
    setSearchTerm('');
  };

  const handleCloseFilters = () => setShowFilters(false);
  const handleShowFilters = () => setShowFilters(true);

  // Count of filters selected
  const checkedCount = selectedTypes.length;

  // Show loading spinner while dimensions are being determined
  if (width === 0) {
    return (
      <Container className='mt-4 text-center'>
        <Spinner animation='border' role='status' variant='primary' />
        <p className={`mt-2 ${styles.loadingText}`}>{t('loadingApp')}</p>
      </Container>
    );
  }

  return (
    <Container>
      {width < 992 && (
        <>
          <SearchInput
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleClear={handleClear}
          />

          <Button variant='primary' onClick={handleShowFilters} className={styles.openFilters}>
            {t('filterSearch')}
          </Button>
          <SearchControls
            handleLimit={handleLimit}
            handleOrder={handleOrder}
            selectedLimit={selectedLimit}
            selectedOrder={selectedOrder}
            pagination={pagination}
          />
          <PagePagination pagination={pagination} />
        </>
      )}
      <Row>
        {width >= 992 && (
          <Col lg={3}>
            <h5 className={styles.filterText}>{t('filterSearch')}</h5>
            <SearchFilters
              show
              handleClose={handleCloseFilters}
              clearSelection={clearSelection}
              checkedCount={checkedCount}
              typeCounts={typeCounts}
              handleDateInputChange={handleDateInputChange}
              _startDate={_startDate}
              _endDate={_endDate}
              selectedLanguages={selectedLanguages}
              selectedAuthors={selectedAuthors}
              authors={authors}
              locations={locations}
              subjectIndex={subjectIndex}
              handleCheckboxToggle={handleCheckboxToggle}
              selectedTypes={selectedTypes}
              selectedLocations={selectedLocations}
              selectedSubjectIndex={selectedSubjectIndex}
            />
          </Col>
        )}
        <Col lg={width >= 992 ? 9 : 12}>
          <div className='d-none d-lg-block'>
            <SearchInput
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              handleClear={handleClear}
            />
            <SearchControls
              handleLimit={handleLimit}
              handleOrder={handleOrder}
              selectedLimit={selectedLimit}
              selectedOrder={selectedOrder}
              pagination={pagination}
            />
            <PagePagination pagination={pagination} />
          </div>

          <div>
            {documents.length === 0 ? (
              <p>{t('noResults')}</p>
            ) : (
              documents.map((document) => {
                return (
                  <FilesCardImageLeft key={document.id} id={document.id} document={document} />
                );
              })
            )}
          </div>

          <PagePagination pagination={pagination} />
        </Col>
      </Row>
      {width < 992 && (
        <SearchFilters
          show={showFilters}
          handleClose={handleCloseFilters}
          clearSelection={clearSelection}
          checkedCount={checkedCount}
          typeCounts={typeCounts}
          handleDateInputChange={handleDateInputChange}
          _startDate={_startDate}
          _endDate={_endDate}
          selectedAuthors={selectedAuthors}
          selectedLanguages={selectedLanguages}
          authors={authors}
          locations={locations}
          subjectIndex={subjectIndex}
          handleCheckboxToggle={handleCheckboxToggle}
          selectedTypes={selectedTypes}
          selectedLocations={selectedLocations}
          selectedSubjectIndex={selectedSubjectIndex}
        />
      )}
    </Container>
  );
};

export default SearchPage;
