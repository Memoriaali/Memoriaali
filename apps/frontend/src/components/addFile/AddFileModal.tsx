import { useFlawDetectionEnabled } from '@/hooks/useFlawDetectionEnabled';
import { useFeatureConfig } from '@/hooks/useVariant';
import cuid from 'cuid';
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Tab, Tabs } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import { FlawDetection } from '../../expansions/flawDetection/FlawDetection';
import NewEventEmitter from '../eventEmitter/EventEmitter';
import type { FormData } from '../metadata/MetadataForm';
import styles from './AddFileModal.module.css';
import AddFileTab from './AddFileTab';
import FinishedTab from './FinishedTab';
import MetadataFormGridTab from './MetadataFormGridTab';
import MetadataFormTab from './MetadataFormTab';

interface FlawResult {
  [key: string]: unknown;
}

export interface UploadedFile {
  id: string;
  src: string;
  file: File;
  filetype: string;
  pdfString: string;
}

interface AddFileModalProps {
  handleClose: () => void;
  showAddFileModal: boolean;
  keyForModal: string;
  setKey: (key: string) => void;
}

const AddFileModal = ({
  handleClose,
  showAddFileModal,
  keyForModal,
  setKey,
}: AddFileModalProps) => {
  const feature = useFeatureConfig('flawDetection');

  // Steps for the modals tabs, counting the steps for the progressbar
  const steps = ['addFile', 'metadataForm', 'metadataForms', 'finished'];
  const currentStepIndex = steps.indexOf(keyForModal);

  const renderedSteps = steps.map((step, index) => {
    const isActive = index <= currentStepIndex;

    return (
      <React.Fragment key={step}>
        <div className={`${styles.circle} ${isActive ? styles.active : ''}`}>{index + 1}</div>
        {index < steps.length - 1 && <div className={styles.line} />}
      </React.Fragment>
    );
  });

  // Uploaded and rejected files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Received flaws
  const [receivedFlaw, setReceivedFlaw] = useState<FlawResult[]>([]);

  // Collect shared metadata
  const [sharedMetadata, setSharedMetadata] = useState<{
    forms: { [id: string]: FormData };
  }>({
    forms: {},
  });

  // Is flawDetection enabled by user
  const [flawDetectionEnabled, setFlawDetectionEnabled] = useState<boolean>(true);

  // This comes from variants and checks if the flaw detection feature is enabled by admins
  const flawDetectionEnabledByAdmin = useFlawDetectionEnabled();

  // Spinner for flaw detection
  const [isDetectingFlaws, setIsDetectingFlaws] = useState(false);

  // Is empty enabled
  const [empty, setEmpty] = useState<boolean>(true);

  // Is post-it enabled
  const [postIt, setPostIt] = useState<boolean>(true);

  // Is corner enabled
  const [corner, setCorner] = useState<boolean>(true);

  // For resetting modal data after closing and collecting if flawDetection is selected
  useEffect(() => {
    const resetData = () => {
      setUploadedFiles([]);
      setSharedMetadata({ forms: {} });
    };

    const handleFlawSelected = (value: boolean) => {
      setFlawDetectionEnabled(value);
    };

    const handleEmptySelected = (value: boolean) => {
      setEmpty(value);
    };

    const handlePostItSelected = (value: boolean) => {
      setPostIt(value);
    };

    const handleCornerSelected = (value: boolean) => {
      setCorner(value);
    };

    NewEventEmitter.on('resetData', resetData);
    NewEventEmitter.on('flawSelected', handleFlawSelected);
    NewEventEmitter.on('emptySelected', handleEmptySelected);
    NewEventEmitter.on('postItSelected', handlePostItSelected);
    NewEventEmitter.on('cornerSelected', handleCornerSelected);

    return () => {
      NewEventEmitter.off('resetData', resetData);
      NewEventEmitter.off('flawSelected', handleFlawSelected);
      NewEventEmitter.off('emptySelected', handleEmptySelected);
      NewEventEmitter.off('postItSelected', handlePostItSelected);
      NewEventEmitter.off('cornerSelected', handleCornerSelected);
    };
  }, []);

  // Dropzone callback
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach(async (file: File) => {
        const reader = new FileReader();
        const id = cuid();

        reader.onload = (e: ProgressEvent<FileReader>) => {
          const base64 = e.target?.result;
          if (typeof base64 === 'string') {
            setUploadedFiles((prevState) => [
              ...prevState,
              {
                id,
                src: base64,
                file,
                filetype: file.type,
                pdfString: base64.substr(base64.indexOf(',') + 1),
              },
            ]);
          }
        };

        if (flawDetectionEnabled && flawDetectionEnabledByAdmin) {
          const flawApi = feature?.config.api;
          setIsDetectingFlaws(true);
          try {
            const response: FlawResult = await FlawDetection(
              file,
              id,
              postIt,
              corner,
              empty,
              flawApi,
            );

            setReceivedFlaw((prevState) => {
              const updated = [...prevState, response];
              NewEventEmitter.emit('receivedFlaw', updated);
              return updated;
            });
          } catch (err) {
            console.error('Expansion upload error:', err);
          } finally {
            setIsDetectingFlaws(false);
          }
        }

        reader.readAsDataURL(file);
      });
    },
    [flawDetectionEnabled, flawDetectionEnabledByAdmin, feature?.config.api, postIt, corner, empty],
  ); // End: dropzone callback

  // Setting up react-dropzone
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
  }); // End: Setting up react-dropzone

  // Delete document from uploaded files
  const deleteFromUploadedFiles = useCallback(
    (id: string) => {
      const array = [...uploadedFiles];
      const index = array.findIndex((i) => i.id === id);
      if (index !== -1) {
        array.splice(index, 1);
      }
      setUploadedFiles(array);
    },
    [uploadedFiles],
  ); // End: Delete document from uploaded files

  return (
    <Modal
      show={showAddFileModal}
      onHide={handleClose}
      size='lg'
      centered
      className={`${styles.addFileModal}`}
    >
      <div className={styles.progressWrapper}>
        <div className={styles.progressContainer}>{renderedSteps}</div>
      </div>

      <Tabs defaultActiveKey='addFile' activeKey={keyForModal} hidden>
        <Tab eventKey='addFile' title='addFile'>
          <AddFileTab
            handleClose={handleClose}
            setKey={setKey}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            uploadedFiles={uploadedFiles}
            deleteFromUploadedFiles={deleteFromUploadedFiles}
            isDetectingFlaws={isDetectingFlaws}
            receivedFlaw={receivedFlaw}
          />
        </Tab>
        <Tab eventKey='metadataForm' title='metadataForm'>
          <MetadataFormTab
            setKey={setKey}
            setSharedMetadata={setSharedMetadata}
            sharedMetadata={sharedMetadata}
            handleClose={handleClose}
          />
        </Tab>
        <Tab eventKey='metadataForms' title='metadataForms'>
          <MetadataFormGridTab
            handleClose={handleClose}
            setKey={setKey}
            uploadedFiles={uploadedFiles}
            sharedMetadata={sharedMetadata}
          />
        </Tab>
        <Tab eventKey='finished' title='finished'>
          <FinishedTab handleClose={handleClose} />
        </Tab>
      </Tabs>
    </Modal>
  );
};

export default AddFileModal;
