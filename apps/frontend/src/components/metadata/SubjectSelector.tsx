import debounce from 'lodash.debounce';
import { useTranslations } from 'next-intl';
import { Control, Controller, FieldErrors, FieldValues, Path, PathValue } from 'react-hook-form';
import AsyncSelect from 'react-select/async';
import { FormValues } from './MetadataForm';
import styles from './subjectSelector.module.css';

interface SubjectSelectorProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  defaultValue?: string[];
  required: boolean;
  errors: FieldErrors<FormValues>;
  index: string;
}

interface SubjectOption {
  prefLabel: string;
}

interface FintoResult {
  prefLabel: string;
}

const SubjectSelectorMetadataForm = <T extends FieldValues>({
  control,
  name,
  defaultValue,
  required,
  errors,
  index,
}: SubjectSelectorProps<T>) => {
  const t = useTranslations('Metadata');
  const searchSubjects = async (inputValue: string): Promise<SubjectOption[]> => {
    if (!inputValue) return [];
    const response = await fetch(
      `https://api.finto.fi/rest/v1/yso/search?query=${encodeURIComponent(inputValue)}*&lang=fi&fields=prefLabel`,
    );
    const data = await response.json();
    return data.results.map((item: FintoResult) => ({
      prefLabel: item.prefLabel,
    }));
  };

  const debouncedFetch = debounce(
    (inputValue: string, callback: (_options: SubjectOption[]) => void) => {
      searchSubjects(inputValue)
        .then(callback)
        .catch(() => {
          callback([]);
        });
    },
    500,
  );

  return (
    <>
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue as unknown as PathValue<T, Path<T>>}
        rules={{ required }}
        render={({ field }) => (
          <AsyncSelect<SubjectOption, true>
            aria-label='sucject selector'
            cacheOptions
            className={styles.inputField}
            classNamePrefix='subject-select'
            loadOptions={debouncedFetch}
            isMulti
            getOptionLabel={(option) => option.prefLabel}
            getOptionValue={(option) => option.prefLabel}
            placeholder={t('writeWord')}
            loadingMessage={() => `${t('loading')}`}
            noOptionsMessage={() => `${t('noResults')}`}
            onChange={(selected) => {
              field.onChange(selected.map((opt) => opt.prefLabel));
            }}
            value={
              Array.isArray(field.value)
                ? field.value.map((label: string) => ({ prefLabel: label }))
                : []
            }
            styles={{
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused
                  ? 'var(--bs-primary)' // highlight color when hovered
                  : '#fff', // default background
                color: '#000', // text color for options
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: '#fff', // dropdown background
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
        )}
      />
      {errors?.forms?.[index]?.subjectIndexing && (
        <span className={styles.validationErrorText}>{t('subjectIndexingError')}</span>
      )}
    </>
  );
};

export default SubjectSelectorMetadataForm;
