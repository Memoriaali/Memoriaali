'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, Form } from 'react-bootstrap';

interface FilterCheckboxListProps {
  items: string[];
  selectedItems?: string[];
  filterType: 'languages' | 'types' | 'authors' | 'locations' | 'subjectIndex';
  handleCheckboxToggle: (
    e: React.ChangeEvent<HTMLInputElement>,
    filterType: 'languages' | 'types' | 'authors' | 'locations' | 'subjectIndex',
  ) => void;
  initialDisplayCount?: number;
  formatLabel?: (item: string) => string;
}

const DEFAULT_SELECTED_ITEMS: string[] = [];
const DEFAULT_FORMAT_LABEL = (item: string) => item.charAt(0).toUpperCase() + item.slice(1);

const FilterCheckboxList: React.FC<FilterCheckboxListProps> = ({
  items,
  selectedItems = DEFAULT_SELECTED_ITEMS,
  filterType,
  handleCheckboxToggle,
  initialDisplayCount = 3,
  formatLabel = DEFAULT_FORMAT_LABEL,
}) => {
  const t = useTranslations('Search');
  const [showAll, setShowAll] = useState(false);

  if (!items || items.length === 0) {
    return <p>{t('noResults')}</p>;
  }

  const displayedItems = showAll ? items : items.slice(0, initialDisplayCount);
  const hasMore = items.length > initialDisplayCount;
  const remainingCount = items.length - initialDisplayCount;

  return (
    <>
      {displayedItems.map((item) => (
        <Form.Check type='switch' id={`${filterType}-${item}`} key={item}>
          <Form.Check.Input
            checked={selectedItems.includes(item)}
            onChange={(e) => handleCheckboxToggle(e, filterType)}
            value={item}
          />
          <Form.Check.Label>{formatLabel(item)}</Form.Check.Label>
        </Form.Check>
      ))}

      {hasMore && (
        <Button
          variant='link'
          size='sm'
          onClick={() => setShowAll(!showAll)}
          className='mt-2 p-0 text-decoration-none text-white'
        >
          {showAll ? (
            <>− {t('showLess')}</>
          ) : (
            <>
              + {t('showMore')} ({remainingCount})
            </>
          )}
        </Button>
      )}
    </>
  );
};

export default FilterCheckboxList;
