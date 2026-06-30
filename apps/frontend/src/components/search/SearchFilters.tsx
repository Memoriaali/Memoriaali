import { useTranslations } from 'next-intl';
import { Accordion, Badge, Button, Form, InputGroup, Offcanvas } from 'react-bootstrap';
import FiltersCheckboxList from './FiltersCheckboxList';
import styles from './SearchFilters.module.css';
import { documentTypes, languageLabelKeys, languages, typeLabelKeys } from './searchTypes';

interface SearchFiltersProps {
  show: boolean;
  handleClose: () => void;
  clearSelection: () => void;
  checkedCount: number;
  typeCounts: Record<string, number>;
  handleDateInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  _startDate?: Date | null;
  _endDate?: Date | null;
  selectedLanguages?: string[];
  authors?: string[];
  locations?: string[];
  subjectIndex?: string[];
  handleCheckboxToggle: (
    event: React.ChangeEvent<HTMLInputElement>,
    filterType: 'languages' | 'types' | 'authors' | 'locations' | 'subjectIndex',
  ) => void;
  selectedTypes?: string[];
  selectedAuthors?: string[];
  selectedSubjectIndex?: string[];
  selectedLocations?: string[];
}

const SearchFilters = ({
  show,
  handleClose,
  clearSelection,
  checkedCount,
  typeCounts,
  handleDateInputChange,
  _startDate,
  _endDate,
  selectedLanguages,
  subjectIndex,
  handleCheckboxToggle,
  selectedTypes,
  selectedSubjectIndex,
  // authors,
  //locations,
  // selectedLocations,
  // selectedAuthors,
}: SearchFiltersProps) => {
  const t = useTranslations('Search');

  return (
    <Offcanvas show={show} onHide={handleClose} responsive='lg'>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title className={styles.offCanvasTitle}>{t('filterSearch')}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Accordion defaultActiveKey={['0']} className={styles.filtersAccordion} alwaysOpen>
          <Accordion.Item eventKey='0'>
            <Accordion.Header>
              {t('type')}{' '}
              {checkedCount > 0 && (
                <Badge bg='secondaryBg' className={styles.filtersBadge}>
                  {checkedCount}
                </Badge>
              )}
            </Accordion.Header>
            <Accordion.Body>
              {documentTypes.map((type) => (
                <Form.Check type='switch' id={type} key={type}>
                  <Form.Check.Input
                    checked={selectedTypes?.includes(type)}
                    onChange={(e) => handleCheckboxToggle(e, 'types')}
                    value={type}
                  />
                  <Form.Check.Label>
                    {t(typeLabelKeys[type])} ({typeCounts[type] ?? 0})
                  </Form.Check.Label>
                </Form.Check>
              ))}
            </Accordion.Body>
          </Accordion.Item>

          {/*TODO: Implement collection filter
           Blocked:  Document metadata structure cannot safely be parsed on frontend - e.g., "John Doe" might be one name or two separate values
           Requires fix to standardize metadata format at upload/storage level */}

          {/* <Accordion.Item eventKey='1'>
            <Accordion.Header>{t('authorLabel')}</Accordion.Header>
            <Accordion.Body>
              <FiltersCheckboxList
                items={authors ?? []}
                selectedItems={selectedAuthors}
                filterType='authors'
                handleCheckboxToggle={handleCheckboxToggle}
              />
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey='2'>
            <Accordion.Header>{t('areaLabel')}</Accordion.Header>
            <Accordion.Body>
              <FiltersCheckboxList
                items={locations ?? []}
                selectedItems={selectedLocations}
                filterType='locations'
                handleCheckboxToggle={handleCheckboxToggle}
              />
            </Accordion.Body>
          </Accordion.Item> */}
          <Accordion.Item eventKey='3'>
            <Accordion.Header>{t('subjectLabel')}</Accordion.Header>
            <Accordion.Body>
              <FiltersCheckboxList
                items={subjectIndex ?? []}
                selectedItems={selectedSubjectIndex}
                filterType='subjectIndex'
                handleCheckboxToggle={handleCheckboxToggle}
              />
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey='4'>
            <Accordion.Header>{t('timeLabel')}</Accordion.Header>
            <Accordion.Body>
              <Form.Label>{t('startLabel')}</Form.Label>
              <InputGroup className='mb-2'>
                <Form.Control
                  id='date'
                  aria-describedby='startDate'
                  aria-label='start day'
                  type='date'
                  name='startDate'
                  value={_startDate?.toISOString().split('T')[0] ?? ''}
                  max={_endDate ? _endDate.toISOString().split('T')[0] : undefined}
                  onChange={handleDateInputChange}
                />
              </InputGroup>
              <Form.Label>{t('endLabel')}</Form.Label>
              <InputGroup>
                <Form.Control
                  id='date'
                  aria-describedby='endDate'
                  aria-label='end date'
                  type='date'
                  name='endDate'
                  value={_endDate?.toISOString().split('T')[0] ?? ''}
                  min={_startDate ? _startDate.toISOString().split('T')[0] : undefined}
                  onChange={handleDateInputChange}
                />
              </InputGroup>
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey='5'>
            <Accordion.Header>{t('languageLabel')}</Accordion.Header>
            <Accordion.Body>
              {languages.map((lang) => (
                <Form.Check type='switch' key={lang} id={lang}>
                  <Form.Check.Input
                    checked={selectedLanguages?.includes(lang)}
                    onChange={(e) => handleCheckboxToggle(e, 'languages')}
                    value={lang}
                  />
                  <Form.Check.Label>{t(languageLabelKeys[lang])}</Form.Check.Label>
                </Form.Check>
              ))}
            </Accordion.Body>
          </Accordion.Item>
          {/* TODO: Collections filtering to be implemented with the collections-functionality */}
          {/* <Accordion.Item eventKey='6'>
            <Accordion.Header>{t('collectionLabel')}</Accordion.Header>
            <Accordion.Body>
              <Form.Check type='switch' id='collection1'>
                <Form.Check.Input />
                <Form.Check.Label>Eeva ja Valo Laitisen kirjeet (0)</Form.Check.Label>
              </Form.Check>
              <Form.Check type='switch' id='collection2'>
                <Form.Check.Input />
                <Form.Check.Label>Esimerkki kokoelma (0)</Form.Check.Label>
              </Form.Check>
            </Accordion.Body>
          </Accordion.Item>  */}

          <Button className={styles.emptyFilters} onClick={clearSelection}>
            {t('clearFilters')}
          </Button>
        </Accordion>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default SearchFilters;
