import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';

import { Button, Form, FormGroup, Modal } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import styles from './SipMetadataTab.module.css';

interface SipMetadataTabProps {
  handleClose: () => void;
  setKey: (key: string) => void;
  selectedDocuments: string[];
  sipMetadata: SipMetadataFormValues;
  setSipMetadata: React.Dispatch<React.SetStateAction<SipMetadataFormValues>>;
}

interface SipMetadataFormValues {
  title: string;
  description: string;
  creator: string;
  subject: string;
}

const SipMetadata = ({
  handleClose,
  setKey,
  selectedDocuments,
  sipMetadata,
  setSipMetadata,
}: SipMetadataTabProps) => {
  const t = useTranslations('SipPackageCreation');

  const onSubmit = async (data: SipMetadataFormValues) => {
    try {
      setSipMetadata(data);

      setKey('sipSummary');
    } catch (error) {
      console.error('Error creating SIP package:', error);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SipMetadataFormValues>();

  return (
    <>
      <Modal.Header
        className={`${styles.modalBg} ${styles.modalHeader} d-flex justify-content-center position-relative`}
      >
        <Modal.Title className={styles.modalTitle}>{t('addInfo')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleClose}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>
      <Modal.Body className={`${styles.modalBody} ${styles.modalBg}`}>
        <Form>
          <FormGroup>
            <Form.Label className={styles.formLabel}>{t('title')}</Form.Label>
            <Form.Control
              placeholder={t('titlePlaceholder')}
              className={styles.formControl}
              {...register('title', { required: t('titleRequired') })}
            />
            {errors.title && <div className={styles.errorText}>{errors.title.message}</div>}
          </FormGroup>

          <FormGroup>
            <Form.Label className={styles.formLabel}>{t('description')}</Form.Label>
            <Form.Control
              as='textarea'
              placeholder={t('descriptionPlaceholder')}
              className={styles.formControl}
              {...register('description', { required: t('descriptionRequired') })}
            />
            {errors.description && (
              <div className={styles.errorText}>{errors.description.message}</div>
            )}
          </FormGroup>

          <FormGroup>
            <Form.Label className={styles.formLabel}>{t('creator')}</Form.Label>
            <Form.Control
              as='textarea'
              placeholder={t('creatorPlaceholder')}
              className={styles.formControl}
              {...register('creator', { required: t('creatorRequired') })}
            />
            {errors.creator && <div className={styles.errorText}>{errors.creator.message}</div>}
          </FormGroup>

          <FormGroup>
            <Form.Label className={styles.formLabel}>{t('subject')}</Form.Label>
            <Form.Control
              as='textarea'
              placeholder={t('subjectPlaceholder')}
              className={styles.formControl}
              {...register('subject', { required: t('subjectRequired') })}
            />
            {errors.subject && <div className={styles.errorText}>{errors.subject.message}</div>}
          </FormGroup>
        </Form>
      </Modal.Body>
      <Modal.Footer className={styles.modalBg}>
        <Button variant='secondary' onClick={() => setKey('selectedDocuments')}>
          {t('previous')}
        </Button>
        <Button variant='primary' onClick={handleSubmit(onSubmit)}>
          {t('next')}
        </Button>
      </Modal.Footer>
    </>
  );
};

export default SipMetadata;
