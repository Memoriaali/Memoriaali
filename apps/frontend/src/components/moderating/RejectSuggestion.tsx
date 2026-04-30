'use client';
import { faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import styles from './PendingMetadataSuggestions.module.css';
import RejectionExplanationModal from './RejectionExpalanationModal';

interface RejectSuggestion {
  getPendingSuggestions: () => Promise<void>;
  handleShowMessage: (text: string) => void;
  setSubmitError: (error: string | null) => void;
  suggestionId: string;
}

const RejectComment: React.FC<RejectSuggestion> = ({
  getPendingSuggestions,
  handleShowMessage,
  setSubmitError,
  suggestionId,
}) => {
  // State for opening and closing comment send modal
  const [showRejectionExplanationModal, setShowRejectionExplanationModal] = useState(false);

  // Functions to handle opening and closing comment send modal
  const handleCloseRejectionExplanationModal = () => setShowRejectionExplanationModal(false);
  const handleShowRejectionExplanationModal = () => setShowRejectionExplanationModal(true);

  return (
    <>
      <FontAwesomeIcon
        icon={faCircleXmark}
        className={`${styles.pendingMetadataSuggestionsIcon}`}
        onClick={() => handleShowRejectionExplanationModal()}
      />

      <RejectionExplanationModal
        showRejectionExplanationModal={showRejectionExplanationModal}
        handleCloseRejectionExplanationModal={handleCloseRejectionExplanationModal}
        getPendingSuggestions={getPendingSuggestions}
        handleShowMessage={handleShowMessage}
        setSubmitError={setSubmitError}
        suggestionId={suggestionId}
      />

      {showRejectionExplanationModal && <div className={styles.overlay} />}
    </>
  );
};

export default RejectComment;
