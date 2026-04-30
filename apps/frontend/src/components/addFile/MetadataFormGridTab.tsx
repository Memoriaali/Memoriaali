import { useDocuments } from '@/hooks/useDocuments';
import { faFile, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Col, Modal, Row } from 'react-bootstrap';
import { SubmitHandler, useForm } from 'react-hook-form';
import type { UploadedFile } from '../addFile/AddFileModal';
import NewEventEmitter from '../eventEmitter/EventEmitter';
import MetadataForm, { type FormData, type FormValues } from '../metadata/MetadataForm';
import { mapPrivacy } from '../metadata/hooks/privacyMapper';
import styles from './MetadataFormGridTab.module.css';

interface MetadataFormGridTabProps {
  handleClose: () => void;
  setKey: (_key: string) => void;
  uploadedFiles: UploadedFile[];
  sharedMetadata: { forms: { [id: string]: FormData } };
}

interface Flaw {
  id: string;
  post_it?: number;
  taittunut_kulma?: number;
  tyhja_sivu?: number;
}

const MetadataFormGridTab = ({
  setKey,
  uploadedFiles,
  sharedMetadata,
  handleClose,
}: MetadataFormGridTabProps) => {
  const { createNewDocument, uploadFile } = useDocuments();
  const t = useTranslations('AddFiles');

  const [selectedOption, setSelectedOption] = useState<string>('option1');

  useEffect(() => {
    const handleOptionChange = (value: string) => {
      setSelectedOption(value);
    };

    NewEventEmitter.on('optionChange', handleOptionChange);

    return () => {
      NewEventEmitter.off('optionChange', handleOptionChange);
    };
  }, []);

  const latestAiFieldRef = useRef<Record<string, boolean>>({});
  const latestReceivedFlawRef = useRef<unknown[]>([]);

  useEffect(() => {
    const handleIsAiFieldChange = (value: Record<string, boolean>) => {
      latestAiFieldRef.current = value;
    };

    const handleReceivedFlawChange = (flaws: unknown[]) => {
      latestReceivedFlawRef.current = flaws;
    };

    NewEventEmitter.on('isAiField', handleIsAiFieldChange);
    NewEventEmitter.on('receivedFlaw', handleReceivedFlawChange);
    return () => {
      NewEventEmitter.off('isAiField', handleIsAiFieldChange);
      NewEventEmitter.off('receivedFlaw', handleReceivedFlawChange);
    };
  }, []);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  const [isUploading, setIsUploading] = useState(false);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsUploading(true);
    const allFlaws = latestReceivedFlawRef.current.flat();

    const promises = uploadedFiles.map(async (file) => {
      const metadataForFile = data.forms[file.id];

      // Handle document publicity
      const publicity = mapPrivacy(
        metadataForFile?.public,
        metadataForFile?.group,
        metadataForFile?.restricted,
      );

      let groupToShare = undefined;

      if (publicity === 'GROUP') {
        groupToShare = metadataForFile?.groupSelect;
      } else {
        groupToShare = undefined;
      }

      // Handle has AI values
      const aiModifiedFields = Object.keys(latestAiFieldRef.current).filter(
        (key) => latestAiFieldRef.current[key] === false,
      );
      const hasAiModifiedFields = aiModifiedFields.length > 0;

      // Find flaw object for this file and handle flaws
      const flaw = allFlaws.find((f) => (f as Flaw).id === file.id) as Flaw | undefined;
      let hasErrors = false;
      const errorTypes: string[] = [];

      if (flaw) {
        (['post_it', 'taittunut_kulma', 'tyhja_sivu'] as (keyof Flaw)[]).forEach((key) => {
          if (flaw[key] === 1) {
            hasErrors = true;
            errorTypes.push(key);
          }
        });
      }

      try {
        // Upload file to server
        const uploadResponse = await uploadFile(file.file);
        const uploadedFile = uploadResponse?.uploadedFiles?.[0];
        const serverFileName = uploadedFile?.filename;

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
          aiModifiedFields: string[];
          hasErrors: boolean;
          errorTypes: string[];
          errorPageNumbers: string[];
        } = {
          fileName: serverFileName ?? '',
          originalFileName: file.file.name,
          mimeType: file.file.type,
          documentPrivacy: publicity,
          shareToGroup: metadataForFile?.group,
          groupToShare,
          aiModified: hasAiModifiedFields,
          aiModifiedFields,
          hasErrors,
          errorTypes,
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

        await createNewDocument(documentData);

        NewEventEmitter.emit('documentAdded');
      } catch (err) {
        console.error('Error creating document for', file.file.name, err);
      } finally {
        setIsUploading(false);
      }
    });

    await Promise.all(promises);
    setKey('finished');
  };

  const [formState, setFormState] = useState<{
    [key: string]: { visible: boolean; buttonText: string };
  }>({});

  const toggleFormVisibility = (fileId: string) => {
    setFormState((prevState) => ({
      ...prevState,
      [fileId]: {
        visible: !prevState[fileId]?.visible,
        buttonText: prevState[fileId]?.visible ? t('editInfo') : t('hideInfo'),
      },
    }));
  };

  // handle back click
  const handleBackClick = () => {
    if (selectedOption === 'option1') {
      setKey('metadataForm');
    } else if (selectedOption === 'option2') {
      setKey('addFile');
    }
  };

  return (
    <>
      <Modal.Header
        className={`${styles.modalBg} ${styles.modalHeader} d-flex justify-content-center position-relative`}
      >
        <Modal.Title className={styles.modalTitle}>{t('singleFileInfo')}</Modal.Title>
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
        {uploadedFiles.map((file: UploadedFile) => (
          <span key={file.id}>
            <Card className={styles.cardStyle}>
              <Row className={styles.cardTextCenter}>
                <Col xs={3} sm={4} md={4} className={styles.column}>
                  {file.filetype.includes('image') && (
                    <Card.Img className={styles.cardImage} src={file.src} alt='added file' />
                  )}
                  {!file.filetype.includes('image') && (
                    <FontAwesomeIcon className={`${styles.fileIcon}`} icon={faFile} />
                  )}
                </Col>
                <Col xs={6} sm={5} md={5} className={styles.column}>
                  {file.file.name}
                </Col>
                <Col xs={3} sm={3} md={3} className={styles.column}>
                  <Button
                    variant='primary'
                    className={styles.showButton}
                    onClick={() => toggleFormVisibility(file.id)}
                  >
                    {formState[file.id]?.buttonText ?? t('editInfo')}
                  </Button>
                </Col>
              </Row>
            </Card>
            <div hidden={!formState[file.id]?.visible}>
              <MetadataForm
                index={file.id}
                register={register}
                errors={errors}
                sharedMetadata={sharedMetadata}
                setValue={setValue}
                source='MetadataFormGridTab'
                control={control}
                watch={watch}
              />
            </div>
          </span>
        ))}
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='secondary' onClick={handleBackClick}>
          {t('previous')}
        </Button>
        <Button variant='primary' onClick={handleSubmit(onSubmit)} disabled={isUploading}>
          {isUploading ? t('uploading') : t('next')}
        </Button>
      </Modal.Footer>
    </>
  );
};

export default MetadataFormGridTab;
