import MetadataDetectionSettingsButton from '@/expansions/metadataDetection/MetadataDetectionSettingsButton';
import { useFlawDetectionEnabled } from '@/hooks/useFlawDetectionEnabled';
import { useMetadataDetectionEnabled } from '@/hooks/useMetadataDetectionEnabled';
import { useFeatureConfig } from '@/hooks/useVariant';
import { faUpload, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone';
import FlawDetectionSettingsButton from '../../expansions/flawDetection/FlawDetectionSettingsButton';
import FlawDetectionSpinner from '../../expansions/flawDetection/FlawDetectionSpinner';
import FlawDetectionSwitch from '../../expansions/flawDetection/FlawDetectionSwitch';
import { MetadataDetection } from '../../expansions/metadataDetection/MetadataDetection';
import MetadataDetectionSpinner from '../../expansions/metadataDetection/MetadataDetectionSpinner';
import MetadataDetectionSwitch from '../../expansions/metadataDetection/MetadataDetectionSwitch';
import type { UploadedFile } from '../addFile/AddFileModal';
import NewEventEmitter from '../eventEmitter/EventEmitter';
import styles from './AddFileTab.module.css';
import InfoBox from './InfoBox';
import UploadedFiles from './UploadedFiles';

const FIELD_KEYS = [
  'annif',
  'gpe',
  'date',
  'name',
  'act',
  'y_field',
  'diar',
  'product',
  'event',
  'norp',
] as const;

type FieldKey = (typeof FIELD_KEYS)[number];
type DetectionState = Record<FieldKey, boolean>;

interface FlawResult {
  [key: string]: unknown;
}

interface AddFileTabProps {
  handleClose: () => void;
  setKey: (key: string) => void;
  getRootProps: <T extends DropzoneRootProps>(props?: T | undefined) => DropzoneRootProps;
  getInputProps: <T extends DropzoneInputProps>(props?: T | undefined) => DropzoneInputProps;
  uploadedFiles: UploadedFile[];
  deleteFromUploadedFiles: (id: string) => void;
  isDetectingFlaws: boolean;
  receivedFlaw: FlawResult[];
}

const AddFileTab = ({
  handleClose,
  setKey,
  getRootProps,
  getInputProps,
  uploadedFiles,
  deleteFromUploadedFiles,
  isDetectingFlaws,
  receivedFlaw,
}: AddFileTabProps) => {
  // Admin feature toggles (coarse-grained)
  const flawDetectionEnabled = useFlawDetectionEnabled();
  const metadataDetectionEnabledByAdmin = useMetadataDetectionEnabled();

  const feature = useFeatureConfig('metadataDetection');

  const t = useTranslations('AddFiles');

  // Radio option state
  const [selectedOption, setSelectedOption] = useState<string>('option1');
  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSelectedOption(value);
    NewEventEmitter.emit('optionChange', value);
  };

  // Spinners
  const [isDetectingMetadata, setIsDetectingMetadata] = useState(false);

  // Whether user enabled metadata detection via the switch
  const [metadataDetectionEnabled, setMetadataDetectionEnabled] = useState<boolean>(true);

  // Hold the latest canonical selection snapshot from the settings modal
  // Start safe (all false) so we never send accidental "true" before snapshot arrives.
  const DEFAULT_SELECTION: DetectionState = useMemo(
    () =>
      FIELD_KEYS.reduce((acc, k) => {
        acc[k] = false;
        return acc;
      }, {} as DetectionState),
    [],
  );

  const latestDetectionRef = useRef<DetectionState>(DEFAULT_SELECTION);

  // Listen to user toggle for enabling/disabling the whole metadata detection
  useEffect(() => {
    const handleMetadataSelected = (value: boolean) => {
      setMetadataDetectionEnabled(value);
    };

    NewEventEmitter.on('metadataSelected', handleMetadataSelected);
    return () => {
      NewEventEmitter.off('metadataSelected', handleMetadataSelected);
    };
  }, []);

  useEffect(() => {
    const handleSnapshot = (state: Partial<DetectionState>) => {
      // Normalize to full boolean map
      const normalized = FIELD_KEYS.reduce((acc, k) => {
        acc[k] = Boolean(state?.[k]);
        return acc;
      }, {} as DetectionState);

      latestDetectionRef.current = normalized;
    };

    NewEventEmitter.on('metadataSelectionSnapshot', handleSnapshot);
    return () => {
      NewEventEmitter.off('metadataSelectionSnapshot', handleSnapshot);
    };
  }, []);

  const handleNextClick = async () => {
    if (selectedOption === 'option1') {
      setKey('metadataForm');
    } else if (selectedOption === 'option2') {
      setKey('metadataForms');
    }

    if (metadataDetectionEnabled && metadataDetectionEnabledByAdmin) {
      const metadataApi = feature?.config.api;
      setIsDetectingMetadata(true);

      const selectionToSend = latestDetectionRef.current;
      let response: unknown = [];

      try {
        response = await MetadataDetection(uploadedFiles, selectionToSend, metadataApi);
      } catch (err) {
        console.error('Expansion upload error:', err);
      } finally {
        setIsDetectingMetadata(false);
        NewEventEmitter.emit('metadataReceived', response);
      }
    }
  };

  return (
    <>
      <Modal.Header
        className={`${styles.modalBg} ${styles.modalHeader} d-flex justify-content-center position-relative`}
      >
        <Modal.Title className={styles.modalTitle}>{t('addFiles')}</Modal.Title>
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
        <section>
          <div className={styles.reactDropzoneContainer} {...getRootProps({})}>
            <input {...getInputProps()} aria-label='add file' />
            <FontAwesomeIcon icon={faUpload} className={`${styles.uploadIcon}`} />
            <span>{t('dragAndDropOrClick')}</span>
          </div>
        </section>

        {flawDetectionEnabled && <FlawDetectionSwitch />}
        {flawDetectionEnabled && <FlawDetectionSettingsButton />}

        <br />

        {isDetectingFlaws && <FlawDetectionSpinner />}

        <InfoBox />

        <UploadedFiles
          files={uploadedFiles}
          deleteFromUploadedFiles={deleteFromUploadedFiles}
          receivedFlaw={receivedFlaw}
        />

        <div hidden={uploadedFiles.length == 0}>
          <Form.Group>
            <Form.Label className={styles.formLabel}>{t('howToAddInfo')}</Form.Label>
            <Form.Check
              type='radio'
              label={t('commonInfo')}
              value='option1'
              id='radio1'
              checked={selectedOption === 'option1'}
              onChange={handleRadioChange}
            />
            <Form.Check
              type='radio'
              label={t('individualInfo')}
              value='option2'
              id='radio2'
              checked={selectedOption === 'option2'}
              onChange={handleRadioChange}
            />
          </Form.Group>

          {metadataDetectionEnabledByAdmin && <MetadataDetectionSwitch />}
          {metadataDetectionEnabledByAdmin && <MetadataDetectionSettingsButton />}

          <br />

          {isDetectingMetadata && <MetadataDetectionSpinner />}
        </div>
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='secondary' onClick={handleClose}>
          {t('cancel')}
        </Button>
        <Button variant='primary' disabled={uploadedFiles.length == 0} onClick={handleNextClick}>
          {t('next')}
        </Button>
      </Modal.Footer>
    </>
  );
};

export default AddFileTab;
