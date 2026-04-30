import { faCircleInfo, faCircleXmark, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import styles from './SearchPage.module.css';

interface SearchInputProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleClear: () => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ searchTerm, setSearchTerm, handleClear }) => {
  const t = useTranslations('Search');

  const [inputValue, setInputValue] = useState('');
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(inputValue);
  };

  const handleInputClear = () => {
    setInputValue('');
    handleClear();
  };

  useEffect(() => {
    setInputValue(searchTerm || '');
  }, [searchTerm]);

  return (
    <Form onSubmit={handleSearch}>
      <InputGroup className={styles.searchInputGroup}>
        <Form.Control
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          aria-describedby='searchInput'
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <Button type='submit' variant='primary' id='searchButton'>
          <FontAwesomeIcon icon={faMagnifyingGlass} /> {t('searchButton')}
        </Button>
        <Button className='clear-button' onClick={handleInputClear} aria-label='clear input'>
          <FontAwesomeIcon icon={faCircleXmark} />
        </Button>
        <FontAwesomeIcon icon={faCircleInfo} className={`${styles.infoCircle}`} />
      </InputGroup>
    </Form>
  );
};

export default SearchInput;
