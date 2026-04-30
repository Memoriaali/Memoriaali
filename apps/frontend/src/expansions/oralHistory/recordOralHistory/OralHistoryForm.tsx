import { useTranslations } from 'next-intl';
import { Form } from 'react-bootstrap';
import { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import SubjectSelectorNoHookForm from '../../../components/metadata/SubjectSelectorNoHookForm';
import styles from './OralHistoryForm.module.css';

export interface FormData {
  person: string;
  subjectIndexing: string | string[];
  event: string;
  description: string;
  reporter: string;
  language: string;
}

export type FormValues = {
  forms: {
    [id: string]: FormData;
  };
};

interface OralHistoryFormProps {
  index: string;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  setValue: UseFormSetValue<FormValues>;
}

const OralHistoryForm = ({ index, register, errors, setValue }: OralHistoryFormProps) => {
  const t = useTranslations('RecordOralHistory');

  return (
    <Form>
      {/* Name of the memoirist and year */}
      <Form.Group>
        <Form.Label className={styles.formLabel}>* {t('personLabel')}</Form.Label>
        <Form.Control
          placeholder={t('personPlaceholder')}
          className={styles.formControl}
          {...register(`forms.${index}.person`, {
            required: true,
          })}
        />
        {errors?.forms?.[index]?.person && (
          <span className={styles.validationErrorText}>{t('personError')}</span>
        )}
      </Form.Group>

      {/* Keywords */}
      <Form.Group>
        <Form.Label className={styles.formLabel}>{t('subjectIndexingLabel')}</Form.Label>

        <SubjectSelectorNoHookForm
          onChange={(values) =>
            setValue(`forms.${index}.subjectIndexing`, values, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </Form.Group>

      {/* Event or time period */}
      <Form.Group>
        <Form.Label className={styles.formLabel}>* {t('eventsLabel')}</Form.Label>

        <Form.Control
          placeholder={t('eventsPlaceholder')}
          className={styles.formControl}
          {...register(`forms.${index}.event`, { required: true })}
        />

        {errors?.forms?.[index]?.event && (
          <span className={styles.validationErrorText}>{t('eventError')}</span>
        )}
      </Form.Group>

      {/* Description */}
      <Form.Group>
        <Form.Label className={styles.formLabel}>* {t('descriptionLabel')}</Form.Label>

        <Form.Control
          placeholder={t('descriptionPlaceholder')}
          className={styles.formControl}
          as='textarea'
          rows={3}
          {...register(`forms.${index}.description`, { required: true })}
        />

        {errors?.forms?.[index]?.description && (
          <span className={styles.validationErrorText}>{t('descriptionError')}</span>
        )}
      </Form.Group>

      {/* Interviewer name */}
      <Form.Group>
        <Form.Label className={styles.formLabel}>* {t('reporterLabel')}</Form.Label>

        <Form.Control
          placeholder={t('reporterPlaceholder')}
          className={styles.formControl}
          {...register(`forms.${index}.reporter`, { required: true })}
        />
        {errors?.forms?.[index]?.reporter && (
          <span className={styles.validationErrorText}>{t('reporterError')}</span>
        )}
      </Form.Group>

      {/* Language */}
      <Form.Group>
        <Form.Label className={styles.formLabel}>{t('languageLabel')}</Form.Label>

        <Form.Select
          aria-label={'languageAria'}
          className={styles.formControl}
          {...register(`forms.${index}.language`, { required: true })}
        >
          <option value='fi'>{t('languageFinnish')}</option>
          <option value='en'>{t('languageEnglish')}</option>
          <option value='sv'>{t('languageSwedish')}</option>
        </Form.Select>
      </Form.Group>
    </Form>
  );
};

export default OralHistoryForm;
