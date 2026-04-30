import debounce from 'lodash.debounce';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';
import AsyncSelect from 'react-select/async';
import styles from './subjectSelector.module.css';

interface SubjectOption {
  prefLabel: string;
}

interface FintoResult {
  prefLabel: string;
}

interface SubjectSelectorProps {
  onChange: (values: string[]) => void;
}

const SubjectSelector: React.FC<SubjectSelectorProps> = ({ onChange }) => {
  const t = useTranslations('Metadata');
  const [selected, setSelected] = useState<SubjectOption[]>([]);

  const searchSubjects = async (inputValue: string): Promise<SubjectOption[]> => {
    if (!inputValue) return [];
    const response = await fetch(
      `https://api.finto.fi/rest/v1/yso/search?query=${encodeURIComponent(inputValue)}*&lang=fi&fields=prefLabel`,
    );
    const data = await response.json();
    return (data?.results ?? []).map((item: FintoResult) => ({
      prefLabel: item.prefLabel,
    }));
  };

  const loadOptions = useMemo(
    () =>
      debounce((inputValue: string, callback: (options: SubjectOption[]) => void) => {
        searchSubjects(inputValue)
          .then(callback)
          .catch(() => callback([]));
      }, 500),
    [],
  );

  useEffect(() => {
    return () => loadOptions.cancel();
  }, [loadOptions]);

  return (
    <AsyncSelect<SubjectOption, true>
      aria-label='subject selector'
      cacheOptions
      className={styles.inputField}
      classNamePrefix='subject-select'
      loadOptions={loadOptions}
      isMulti
      getOptionLabel={(o) => o.prefLabel}
      getOptionValue={(o) => o.prefLabel}
      placeholder={t('writeWord')}
      loadingMessage={() => `${t('loading')}`}
      noOptionsMessage={() => `${t('noResults')}`}
      value={selected}
      onChange={(items) => {
        const next = Array.isArray(items) ? items : [];
        setSelected(next);
        onChange(next.map((opt) => opt.prefLabel));
      }}
      styles={{
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isFocused ? 'var(--bs-primary)' : '#fff',
          color: '#000',
        }),
        menu: (base) => ({
          ...base,
          backgroundColor: '#fff',
        }),
        multiValue: (base) => ({
          ...base,
          backgroundColor: 'var(--bs-primary)',
        }),
        multiValueLabel: (base) => ({
          ...base,
          color: 'var(--bs-text)',
        }),
        multiValueRemove: (base) => ({
          ...base,
          color: 'var(--bs-text)',
          ':hover': {
            backgroundColor: 'var(--bs-secondary)',
            color: 'var(--bs-text)',
          },
        }),
      }}
    />
  );
};

export default SubjectSelector;
