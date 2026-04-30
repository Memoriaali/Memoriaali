import { useMetadatasuggestions } from '@/hooks/useMetadatasuggestions';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useCallback, useState } from 'react';
import { Alert, Button, Form, InputGroup, Modal } from 'react-bootstrap';
import SubjectSelectorNoHookForm from '../metadata/SubjectSelectorNoHookForm';
import styles from './metadataSuggestionsModal.module.css';

type MetadataSuggestionEvent = React.ChangeEvent<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
>;

interface MetadataSuggestionsModalProps {
  showMetadataSuggestionsModal: boolean;
  handleCloseMetadataSuggestionsModal: () => void;
  handleShowMessage: (_message: string) => void;
  documentId: string;
}

const MetadataSuggestionsModal = ({
  showMetadataSuggestionsModal,
  handleCloseMetadataSuggestionsModal,
  handleShowMessage,
  documentId,
}: MetadataSuggestionsModalProps) => {
  const t = useTranslations('Metadata');

  // Is metadata field disabled before starting
  // Check .env file
  const disabled_header = process.env.REACT_APP_HEADER_DISABLED === 'true';
  const disabled_subjectIndexing = process.env.REACT_APP_SUBJECTINDEXING_DISABLED === 'true';
  const disabled_events = process.env.REACT_APP_EVENTS_DISABLED === 'true';
  const disabled_locations = process.env.REACT_APP_LOCATIONS_DISABLED === 'true';
  const disabled_description = process.env.REACT_APP_DESCRIPTION_DISABLED === 'true';
  const disabled_author = process.env.REACT_APP_AUTHOR_DISABLED === 'true';
  const disabled_exactDate = process.env.REACT_APP_EXACTDATE_DISABLED === 'true';
  const disabled_estimatedDate = process.env.REACT_APP_ESTIMATEDDATE_DISABLED === 'true';
  const disabled_type = process.env.REACT_APP_TYPE_DISABLED === 'true';
  const disabled_language = process.env.REACT_APP_LANGUAGE_DISABLED === 'true';
  const disabled_personNames = process.env.REACT_APP_PERSONNAMES_DISABLED === 'true';
  const disabled_organizations = process.env.REACT_APP_ORGANIZATIONS_DISABLED === 'true';
  const disabled_businessIdentityCode =
    process.env.REACT_APP_BUSINESSIDENTITYCODE_DISABLED === 'true';
  const disabled_journalNumber = process.env.REACT_APP_JOURNALNUMBER_DISABLED === 'true';
  const disabled_products = process.env.REACT_APP_PRODUCTS_DISABLED === 'true';
  const disabled_nationalityReligiousPolitical =
    process.env.REACT_APP_NATIONALITYRELIGIOUSPOLITICAL_DISABLED === 'true';
  const disabled_other = process.env.REACT_APP_OTHER_DISABLED === 'true';

  // If suggestion is empty cant send the suggestion
  const [cantSend, setCantSend] = useState(true);

  // String value for all fields except 'subject'
  const [metadataSuggestion, setMetadataSuggestion] = useState<string>('');
  const handleMetadataSuggestion = (event: MetadataSuggestionEvent): void => {
    const value = event.target.value;
    setMetadataSuggestion(value);
    setCantSend(value.trim() === '');
  };

  // Subject values (array internally, joined to string when sending)
  const [subjects, setSubjects] = useState<string[]>([]);
  const handleSubjectsChange = (labels: string[]): void => {
    setSubjects(labels);
    setCantSend(labels.length === 0);
  };

  // Field to change
  const [fieldToChange, setFieldToChange] = useState<string>('header');
  const handleFieldToChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setFieldToChange(event.target.value);
    setMetadataSuggestion('');
    setSubjects([]);
    setCantSend(true);
  };

  const router = useRouter();
  const { createMetadatasuggestion } = useMetadatasuggestions();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const createSuggestion = useCallback(async () => {
    try {
      const changedValue =
        fieldToChange === 'subjectIndexing' ? subjects.join(', ') : metadataSuggestion;

      const suggestionData = {
        documentId,
        fieldToChange,
        changedValue,
      };

      await createMetadatasuggestion(suggestionData);

      handleShowMessage(t('suggestionSentMessage'));
      setMetadataSuggestion('');
      setSubjects([]);
      setFieldToChange('header');
      handleCloseMetadataSuggestionsModal();
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };
        if (statusCode === 400) {
          setSubmitError(t('invalidInputData'));
        } else if (statusCode === 401) {
          router.push('/login?error=sessionExpired');
          return;
        } else if (statusCode === 403) {
          setSubmitError(t('accessDenied'));
        } else if (statusCode === 404) {
          setSubmitError(t('documentNotFound'));
        } else {
          setSubmitError(t('unexpectedError'));
        }
      } else {
        setSubmitError(t('unexpectedError'));
      }
    }
  }, [
    createMetadatasuggestion,
    documentId,
    fieldToChange,
    handleCloseMetadataSuggestionsModal,
    handleShowMessage,
    metadataSuggestion,
    subjects,
    router,
    t,
  ]);

  return (
    <Modal
      show={showMetadataSuggestionsModal}
      onHide={handleCloseMetadataSuggestionsModal}
      size='lg'
      centered
      className='commentsModal-modal'
    >
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('metadataSuggestionTitle')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleCloseMetadataSuggestionsModal}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.modalBg}>
        {submitError && <Alert variant='danger'>{submitError}</Alert>}
        <Form.Group controlId='formFieldToChange' className='mb-3'>
          <Form.Label>{t('fieldToChangeLabel')}</Form.Label>
          <Form.Select onChange={handleFieldToChange} aria-label={t('fieldToChangeAriaLabel')}>
            <option value='header' hidden={disabled_header}>
              {t('headerLabel')}
            </option>
            <option value='subjectIndexing' hidden={disabled_subjectIndexing}>
              {t('subjectIndexingLabel')}
            </option>
            <option value='events' hidden={disabled_events}>
              {t('eventsLabel')}
            </option>
            <option value='locations' hidden={disabled_locations}>
              {t('locationsLabel')}
            </option>
            <option value='description' hidden={disabled_description}>
              {t('descriptionLabel')}
            </option>
            <option value='author' hidden={disabled_author}>
              {t('authorLabel')}
            </option>
            <option value='date' hidden={disabled_exactDate}>
              {t('exactDateLabel')}
            </option>
            <option value='date2' hidden={disabled_estimatedDate}>
              {t('estimatedDateLabel')}
            </option>
            <option value='type' hidden={disabled_type}>
              {t('typeLabel')}
            </option>
            <option value='language' hidden={disabled_language}>
              {t('languageLabel')}
            </option>
            <option value='personNames' hidden={disabled_personNames}>
              {t('personNamesLabel')}
            </option>
            <option value='organizations' hidden={disabled_organizations}>
              {t('organizationsLabel')}
            </option>
            <option value='businessIdentityCode' hidden={disabled_businessIdentityCode}>
              {t('businessIdentityCodeLabel')}
            </option>
            <option value='journalNumber' hidden={disabled_journalNumber}>
              {t('journalNumberLabel')}
            </option>
            <option value='products' hidden={disabled_products}>
              {t('productsLabel')}
            </option>
            <option
              value='nationalityReligiousPolitical'
              hidden={disabled_nationalityReligiousPolitical}
            >
              {t('nationalityReligiousPoliticalLabel')}
            </option>
            <option value='other' hidden={disabled_other}>
              {t('otherLabel')}
            </option>
          </Form.Select>
        </Form.Group>

        <Form.Label htmlFor='metadatasuggestion'>{t('suggestedChangeLabel')}</Form.Label>

        {fieldToChange === 'header' && (
          <InputGroup>
            <Form.Control
              id='header'
              aria-label='metadatasuggestion'
              type='text'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}

        {fieldToChange === 'subjectIndexing' && (
          <InputGroup>
            <SubjectSelectorNoHookForm onChange={handleSubjectsChange} />
          </InputGroup>
        )}

        {fieldToChange === 'events' && (
          <InputGroup>
            <Form.Control
              id='events'
              aria-label='metadatasuggestion'
              type='text'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}

        {fieldToChange === 'locations' && (
          <InputGroup>
            <Form.Control
              id='locations'
              aria-label='metadatasuggestion'
              type='text'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}

        {fieldToChange === 'description' && (
          <InputGroup>
            <Form.Control
              id='description'
              aria-label='metadatasuggestion'
              as='textarea'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}

        {fieldToChange === 'author' && (
          <InputGroup>
            <Form.Control
              id='author'
              aria-label='metadatasuggestion'
              type='text'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}

        {fieldToChange === 'date' && (
          <InputGroup>
            <Form.Control
              id='date'
              aria-label='metadatasuggestion'
              type='date'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}

        {fieldToChange === 'date2' && (
          <InputGroup>
            <Form.Control
              id='date2'
              aria-label='metadatasuggestion'
              type='text'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}

        {fieldToChange === 'type' && (
          <InputGroup>
            <Form.Select
              id='type'
              aria-label='metadatasuggestion'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            >
              <option value='Valokuva'>{t('typePhoto')}</option>
              <option value='Video'>{t('typeVideo')}</option>
              <option value='Asiakirja'>{t('typeDocument')}</option>
              <option value='Esine'>{t('typeObject')}</option>
              <option value='Kirja'>{t('typeBook')}</option>
              <option value='Muistelu'>{t('typeMemoir')}</option>
              <option value='Kirje'>{t('typeLetter')}</option>
              <option value='Äänite'>{t('typeRecording')}</option>
              <option value='Postikortti'>{t('typePostcard')}</option>
              <option value='Teksti'>{t('typeText')}</option>
              <option value='Lehtikirjoitus'>{t('typeArticle')}</option>
              <option value='Kartta'>{t('typeMap')}</option>
              <option value='Piirros'>{t('typeDrawing')}</option>
              <option value='Muu'>{t('typeOther')}</option>
            </Form.Select>
          </InputGroup>
        )}

        {fieldToChange === 'language' && (
          <InputGroup>
            <Form.Select
              id='language'
              aria-label='metadatasuggestion'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            >
              <option value='fi'>{t('languageFinnish')}</option>
              <option value='en'>{t('languageEnglish')}</option>
              <option value='sv'>{t('languageSwedish')}</option>
            </Form.Select>
          </InputGroup>
        )}

        {fieldToChange === 'personNames' && (
          <InputGroup>
            <Form.Control
              id='personNames'
              aria-label='metadatasuggestion'
              type='text'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}

        {fieldToChange === 'organizations' && (
          <InputGroup>
            <Form.Control
              id='organizations'
              aria-label='metadatasuggestion'
              type='text'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}

        {fieldToChange === 'businessIdentityCode' && (
          <InputGroup>
            <Form.Control
              id='businessIdentityCode'
              aria-label='metadatasuggestion'
              type='text'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}

        {fieldToChange === 'journalNumber' && (
          <InputGroup>
            <Form.Control
              id='journalNumber'
              aria-label='metadatasuggestion'
              type='text'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}

        {fieldToChange === 'products' && (
          <InputGroup>
            <Form.Control
              id='products'
              aria-label='metadatasuggestion'
              type='text'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}

        {fieldToChange === 'nationalityReligiousPolitical' && (
          <InputGroup>
            <Form.Control
              id='nationalityReligiousPolitical'
              aria-label='metadatasuggestion'
              type='text'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}

        {fieldToChange === 'other' && (
          <InputGroup>
            <Form.Control
              id='other'
              aria-label='metadatasuggestion'
              as='textarea'
              name='metadatasuggestion'
              onChange={handleMetadataSuggestion}
            />
          </InputGroup>
        )}
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='outline-secondary' onClick={handleCloseMetadataSuggestionsModal}>
          {t('cancelButton')}
        </Button>
        <Button
          disabled={cantSend}
          variant='primary'
          onClick={() => {
            createSuggestion();
          }}
        >
          {t('sendSuggestionButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MetadataSuggestionsModal;
