import { useDocuments } from '@/hooks/useDocuments';
import { Document as DocumentType } from '@/lib/api/generated/types.gen';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import { SubmitHandler, useForm } from 'react-hook-form';
import NewEventEmitter from '../eventEmitter/EventEmitter';
import MetadataForm, { type FormData, type FormValues } from '../metadata/MetadataForm';
import { mapPrivacy } from '../metadata/hooks/privacyMapper';
import styles from './EditFileModal.module.css';

interface EditFileModalProps {
  showEditFileModal: boolean;
  handleCloseEditFileModal: () => void;
  document: DocumentType;
  handleShowMessage: (_message: string) => void;
}

const EditFileModal = ({
  showEditFileModal,
  handleCloseEditFileModal,
  document,
  handleShowMessage,
}: EditFileModalProps) => {
  const t = useTranslations('Files');
  const { updateUsersDocument } = useDocuments();

  const formatDateForInput = (date: string) => {
    const parts = date.split('.');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month?.padStart(2, '0')}-${day?.padStart(2, '0')}`;
    }
    return '';
  };

  const mergedDefaults: FormData = {
    header: document.metadata.header ?? '',
    subjectIndexing: document.metadata.subjectIndexing ?? [],
    events: document.metadata.events ?? '',
    locations: Array.isArray(document.metadata.locations)
      ? document.metadata.locations.join(', ')
      : (document.metadata.locations ?? ''),
    description: document.metadata.description ?? '',
    author: document.metadata.author ?? '',
    exactDate: formatDateForInput(document.metadata.exactDate ?? ''),
    estimatedDate: document.metadata.estimatedDate ?? '',
    type: document.metadata.type ?? '',
    language: document.metadata.language ?? '',
    personNames: document.metadata.personNames ?? '',
    organizations: Array.isArray(document.metadata.organizations)
      ? document.metadata.organizations.join(', ')
      : (document.metadata.organizations ?? ''),
    businessIdentityCode: document.metadata.businessIdentityCode ?? '',
    journalNumber: document.metadata.journalNumber ?? '',
    products: document.metadata.products ?? '',
    nationalityReligiousPolitical: document.metadata.nationalityReligiousPolitical ?? '',
    other: document.metadata.other ?? '',
    public: document.documentPrivacy === 'PUBLIC',
    group: document.documentPrivacy === 'GROUP',
    restricted: document.documentPrivacy === 'PRIVATE',
    groupSelect: '',
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>();

  // State for handling submission errors
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const metadataForFile = data.forms[0];

    // Handle document publicity
    const publicity = mapPrivacy(
      metadataForFile?.public,
      metadataForFile?.group,
      metadataForFile?.restricted,
    );

    // Prepare document data
    const documentData: {
      fileName: string;
      originalFileName: string;
      mimeType: string;
      documentPrivacy: 'PUBLIC' | 'PRIVATE' | 'GROUP' | 'RESEARCH_ONLY';
      shareToGroup: boolean | undefined;
      groupToShare: string | undefined;
      metadata: Record<string, string | string[]> | undefined;
      aiModified: boolean;
      aiModifiedFields: string[] | undefined;
      hasErrors: boolean;
      errorTypes: string[];
      errorPageNumbers: string[];
    } = {
      fileName: document.fileName,
      originalFileName: document.fileName,
      mimeType: document.mimeType ?? '',
      documentPrivacy: publicity,
      shareToGroup: metadataForFile?.group,
      // TODO: add group to share identifier (groupSelect)
      groupToShare: undefined,
      aiModified: document.aiModified,
      aiModifiedFields: undefined,
      hasErrors: document.hasErrors,
      errorTypes: document.errorTypes,
      errorPageNumbers: [],
      metadata: {
        author: metadataForFile?.author ?? '',
        businessIdentityCode: metadataForFile?.businessIdentityCode ?? '',
        description: metadataForFile?.description ?? '',
        estimatedDate: metadataForFile?.estimatedDate ?? '',
        events: metadataForFile?.events ?? '',
        exactDate: metadataForFile?.exactDate ?? '',
        header: metadataForFile?.header ?? '',
        journalNumber: metadataForFile?.journalNumber ?? '',
        language: metadataForFile?.language ?? '',
        locations: metadataForFile?.locations ?? '',
        nationalityReligiousPolitical: metadataForFile?.nationalityReligiousPolitical ?? '',
        organizations: metadataForFile?.organizations ?? '',
        other: metadataForFile?.other ?? '',
        personNames: metadataForFile?.personNames ?? '',
        products: metadataForFile?.products ?? '',
        subjectIndexing: metadataForFile?.subjectIndexing ?? [],
        type: metadataForFile?.type ?? '',
      },
    };

    try {
      const result = await updateUsersDocument(document.id, documentData);

      if (result.data?.message === 'Document updated successfully') {
        handleCloseEditFileModal();
        NewEventEmitter.emit('documentAdded');
        handleShowMessage(t('updateSuccess'));
      }
    } catch (error) {
      if (error instanceof Error) {
        const message = error.message;

        if (message === 'Insufficient permissions. Required roles: MODERATOR, ADMIN') {
          setSubmitError(t('noPermissionUpdate'));
        } else {
          setSubmitError(t('unexpectedError'));
        }
      }
    }
  };

  return (
    <Modal show={showEditFileModal} onHide={handleCloseEditFileModal} size='lg' centered>
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('editFile')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleCloseEditFileModal}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      {/*TODO: Send aiModifiedFields and show badges at correct places*/}
      <Modal.Body className={styles.modalBg}>
        {submitError && <Alert variant='danger'>{submitError}</Alert>}
        <MetadataForm
          index={'0'}
          register={register}
          errors={errors}
          sharedMetadata={{ forms: { '0': mergedDefaults } }}
          setValue={setValue}
          watch={watch}
          source='EditFileModal'
          control={control}
          aiModifiedFields={document.aiModifiedFields}
        />
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='primary' onClick={handleSubmit(onSubmit)}>
          {t('saveChanges')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditFileModal;
