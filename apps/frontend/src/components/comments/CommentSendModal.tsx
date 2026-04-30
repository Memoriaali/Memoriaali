import { useComments } from '@/hooks/useComments';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import styles from './CommentSendModal.module.css';

interface CommentSendModalProps {
  showCommentSendModal: boolean;
  handleCloseCommentSendModal: () => void;
  handleShowMessage: (_message: string) => void;
  documentId: string;
  comment: string;
  setComment: (comment: string) => void;
  getComments: () => Promise<void>;
}

const CommentSendModal = ({
  showCommentSendModal,
  handleCloseCommentSendModal,
  handleShowMessage,
  documentId,
  comment,
  setComment,
  getComments,
}: CommentSendModalProps) => {
  const t = useTranslations('Comments');
  const router = useRouter();
  const { createNewComment } = useComments();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const createComment = useCallback(async () => {
    try {
      const commentData = {
        documentId,
        comment,
      };

      await createNewComment(commentData);
      handleShowMessage(t('commentSentMessage'));
      setComment('');
      handleCloseCommentSendModal();
      getComments();
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };
        if (statusCode === 401) {
          router.push('/login?error=sessionExpired');
          return;
        } else if (statusCode === 403) {
          setSubmitError(t('accessDenied'));
        } else if (statusCode === 404) {
          setSubmitError(t('documentNotFound'));
        } else {
          setSubmitError(t('unexpectedError'));
        }
      } else {
        setSubmitError(t('unexpectedError'));
      }
    }
  }, [
    comment,
    createNewComment,
    documentId,
    getComments,
    handleCloseCommentSendModal,
    handleShowMessage,
    router,
    setComment,
    t,
  ]);

  return (
    <Modal
      show={showCommentSendModal}
      onHide={handleCloseCommentSendModal}
      size='lg'
      centered
      className={`${styles.commentSendModal}`}
    >
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('sendCommentTitle')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleCloseCommentSendModal}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.modalBg}>
        <p>{t('sendCommentBody')}</p>

        {submitError && <Alert variant='danger'>{submitError}</Alert>}
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='outline-secondary' onClick={handleCloseCommentSendModal}>
          {t('cancel')}
        </Button>
        <Button
          variant='primary'
          onClick={() => {
            createComment();
          }}
        >
          {t('sendComment')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CommentSendModal;
