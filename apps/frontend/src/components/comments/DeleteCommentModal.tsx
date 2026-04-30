import { useComments } from '@/hooks/useComments';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import styles from './DeleteCommentModal.module.css';

type CommentStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

interface DeleteCommentModalProps {
  showDeleteCommentModal: boolean;
  handleCloseDeleteCommentModal: () => void;
  handleShowMessage: (_message: string) => void;
  comment: {
    id: string;
    documentId: string;
    comment: string;
    createdAt: string;
    state: CommentStatus;
    user: {
      id: string;
      username: string;
    };
  };
  getComments: () => Promise<void>;
}

const DeleteCommentModal = ({
  showDeleteCommentModal,
  handleCloseDeleteCommentModal,
  handleShowMessage,
  comment,
  getComments,
}: DeleteCommentModalProps) => {
  const t = useTranslations('Comments');

  const router = useRouter();
  const { deleteUsersComment } = useComments();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const deleteComment = useCallback(async () => {
    try {
      await deleteUsersComment(comment.id);
      handleShowMessage(t('commentDeletedMessage'));
      handleCloseDeleteCommentModal();
      getComments();
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };
        if (statusCode === 400) {
          setSubmitError(t('commentNotFound'));
        } else if (statusCode === 401) {
          router.push('/login?error=sessionExpired');
          return;
        } else if (statusCode === 403) {
          setSubmitError(t('accessDenied'));
        } else if (statusCode === 404) {
          setSubmitError(t('commentNotFound'));
        } else {
          setSubmitError(t('unexpectedError'));
        }
      } else {
        setSubmitError(t('unexpectedError'));
      }
    }
  }, [
    comment.id,
    deleteUsersComment,
    getComments,
    handleCloseDeleteCommentModal,
    handleShowMessage,
    router,
    t,
  ]);

  return (
    <Modal
      show={showDeleteCommentModal}
      onHide={handleCloseDeleteCommentModal}
      size='lg'
      centered
      className={`${styles.deleteCommentModal}`}
    >
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('deleteCommentTitle')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleCloseDeleteCommentModal}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.modalBg}>
        {submitError && <Alert variant='danger'>{submitError}</Alert>}
        <p>{t('deleteCommentWarning')}</p>
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='outline-secondary' onClick={handleCloseDeleteCommentModal}>
          {t('cancel')}
        </Button>
        <Button
          variant='primary'
          onClick={() => {
            deleteComment();
          }}
        >
          {t('deleteComment')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteCommentModal;
