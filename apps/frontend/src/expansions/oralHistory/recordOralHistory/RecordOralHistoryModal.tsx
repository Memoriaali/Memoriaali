import React from 'react';
import { Modal, Tab, Tabs } from 'react-bootstrap';
import FinishedTab from './FinishedTab';
import OralHistoryFormTab from './OralHistoryFormTab';
import RecordingSettingsTab from './RecordingSettingsTab';
import RecordingTab from './RecordingTab';
import styles from './RecordOralHistoryModal.module.css';

interface RecordOralHistoryModalProps {
  handleClose: () => void;
  showRecordOralHistoryModal: boolean;
  keyForModal: string;
  setKey: (key: string) => void;
  handleShowMessage: (message: string) => void;
}

const RecordOralHistoryModal = ({
  handleClose,
  showRecordOralHistoryModal,
  keyForModal,
  setKey,
  handleShowMessage,
}: RecordOralHistoryModalProps) => {
  // Steps for the modals tabs, counting the steps for the progressbar
  const steps = ['recordingSettings', 'recording', 'oralHistoryForm', 'finished'];
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

  return (
    <Modal
      show={showRecordOralHistoryModal}
      onHide={handleClose}
      size='lg'
      centered
      className={`${styles.recordOralHistoryModal}`}
    >
      <div>
        <div className={styles.progressContainer}>{renderedSteps}</div>
      </div>

      <Tabs defaultActiveKey='recordingSettings' activeKey={keyForModal} hidden>
        <Tab eventKey='recordingSettings' title='recordingSettings'>
          <RecordingSettingsTab handleClose={handleClose} setKey={setKey} />
        </Tab>
        <Tab eventKey='recording' title='recording'>
          <RecordingTab setKey={setKey} handleClose={handleClose} />
        </Tab>
        <Tab eventKey='oralHistoryForm' title='oralHistoryForm'>
          <OralHistoryFormTab
            handleClose={handleClose}
            setKey={setKey}
            handleShowMessage={handleShowMessage}
          />
        </Tab>
        <Tab eventKey='finished' title='finished'>
          <FinishedTab handleClose={handleClose} />
        </Tab>
      </Tabs>
    </Modal>
  );
};

export default RecordOralHistoryModal;
