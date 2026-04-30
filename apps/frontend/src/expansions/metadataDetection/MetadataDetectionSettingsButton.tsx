import { faGear } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import MetadataDetectionSettingsModal from './MetadataDetectionSettingsModal';
import styles from './metadataDetectionSettingsButton.module.css';

const MetadataDetectionSettingsButton: React.FC = () => {
  const t = useTranslations('MetadataDetection');

  // State for opening and closing Metadata detection settings modal
  const [showMetadataDetectionSettingsModal, setShowMetadataDetectionSettingsModal] =
    useState(false);

  // Functions to handle opening and closing Metadata detection settings modal
  const handleCloseMetadataDetectionSettingsModal = () =>
    setShowMetadataDetectionSettingsModal(false);
  const handleShowMetadataDetectionSettingsModal = () =>
    setShowMetadataDetectionSettingsModal(true);

  return (
    <>
      <Button onClick={handleShowMetadataDetectionSettingsModal}>
        <FontAwesomeIcon icon={faGear} /> {t('metadataDetectionSettings')}
      </Button>

      <MetadataDetectionSettingsModal
        handleCloseMetadataDetectionSettingsModal={handleCloseMetadataDetectionSettingsModal}
        showMetadataDetectionSettingsModal={showMetadataDetectionSettingsModal}
      />

      {showMetadataDetectionSettingsModal && <div className={styles.overlay} />}
    </>
  );
};

export default MetadataDetectionSettingsButton;
