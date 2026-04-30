import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { Button, Modal } from 'react-bootstrap';
import { SubmitHandler, useForm } from 'react-hook-form';
import MetadataForm, { type FormData, type FormValues } from '../metadata/MetadataForm';
import styles from './metadataFormTab.module.css';

interface MetadataFormTabProps {
  setKey: (_key: string) => void;
  setSharedMetadata: (_data: { forms: { [id: string]: FormData } }) => void;
  sharedMetadata: { forms: { [id: string]: FormData } };
  handleClose: () => void;
}

const MetadataFormTab = ({
  setKey,
  setSharedMetadata,
  sharedMetadata,
  handleClose,
}: MetadataFormTabProps) => {
  const t = useTranslations('AddFiles');

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    setSharedMetadata(data);
    setKey('metadataForms');
  };

  return (
    <>
      <Modal.Header
        className={`${styles.modalBg} ${styles.modalHeader} d-flex justify-content-center position-relative`}
      >
        <Modal.Title className={styles.modalTitle}>{t('commonFileInfo')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleClose}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>
      <Modal.Body className={styles.modalBg}>
        <MetadataForm
          index={'0'}
          register={register}
          errors={errors}
          sharedMetadata={sharedMetadata}
          setValue={setValue}
          source='MetadataFormTab'
          control={control}
          watch={watch}
        />
      </Modal.Body>
      <Modal.Footer className={styles.modalBg}>
        <Button variant='secondary' onClick={() => setKey('addFile')}>
          {t('previous')}
        </Button>
        <Button variant='primary' onClick={handleSubmit(onSubmit)}>
          {t('next')}
        </Button>
      </Modal.Footer>
    </>
  );
};

export default MetadataFormTab;
