import { Modal, Tab, Tabs } from 'react-bootstrap';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import styles from './CreateSipModal.module.css';
import FinishSipCreation from './FinishSipCreationTab';
import SelectedDocumentsTab from './SelectedDocumentsTab';
import SipMetadataTab from './SipMetadataTab';
import SipSummary from './SipSummaryTab';

interface CreateSipModalProps {
  handleClose: () => void;
  showCreateSipModal: boolean;
  keyForModal: string;
  setKey: (key: string) => void;
  selectedDocuments: string[];

  setSelectedDocuments: React.Dispatch<React.SetStateAction<string[]>>;
}

const CreateSipModal = ({
  handleClose,
  showCreateSipModal,
  keyForModal,
  setKey,
  selectedDocuments,
  setSelectedDocuments,
}: CreateSipModalProps) => {
  const t = useTranslations('SipPackageCreation');
  // Steps for the modals tabs, counting the steps for the progressbar
  const steps = ['selectedDocuments', 'metadata', 'sipSummary', 'finishSipCreation'];
  const currentStepIndex = steps.indexOf(keyForModal);

  const [sipMetadata, setSipMetadata] = useState({
    title: '',
    description: '',
    creator: '',
    subject: '',
  });
  const [sipError, setSipError] = useState<string | null>(null);

  const renderedSteps = steps.map((step, index) => {
    const isActive = index <= currentStepIndex;

    return (
      <React.Fragment key={step}>
        <div className={`${styles.circle} ${isActive ? styles.active : ''}`}>{index + 1}</div>
        {index < steps.length - 1 && <div className={styles.line} />}
      </React.Fragment>
    );
  });
  return (
    <Modal
      show={showCreateSipModal}
      onHide={handleClose}
      size='lg'
      centered
      className={`${styles.createSipModal}`}
    >
      <Tabs defaultActiveKey='selectedDocuments' activeKey={keyForModal} hidden>
        <Tab eventKey='selectedDocuments' title='Selected Documents'>
          <SelectedDocumentsTab
            setSelectedDocuments={setSelectedDocuments}
            handleClose={handleClose}
            setKey={setKey}
            selectedDocuments={selectedDocuments}
          />
        </Tab>
        <Tab eventKey='metadata' title='Metadata'>
          <SipMetadataTab
            handleClose={handleClose}
            setKey={setKey}
            selectedDocuments={selectedDocuments}
            setSipMetadata={setSipMetadata}
            sipMetadata={sipMetadata}
          />
        </Tab>
        <Tab eventKey='sipSummary' title='Summary'>
          <SipSummary
            handleClose={handleClose}
            setKey={setKey}
            setSelectedDocuments={setSelectedDocuments}
            selectedDocuments={selectedDocuments}
            sipMetadata={sipMetadata}
            setSipError={setSipError}
          />
        </Tab>
        <Tab eventKey='finishSipCreation' title='Finish'>
          <FinishSipCreation
            handleClose={handleClose}
            setKey={setKey}
            selectedDocuments={selectedDocuments}
            sipError={sipError}
          />
        </Tab>
      </Tabs>
    </Modal>
  );
};

export default CreateSipModal;
