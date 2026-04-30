import { useComments } from '@/hooks/useComments';
import { User } from '@/lib/api/generated/types.gen';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import styles from './EditCommentModal.module.css';

type CommentStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

interface EditCommentModalProps {
  showEditCommentModal: boolean;
  handleCloseEditCommentModal: () => void;
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
  user?: User | null;
  getComments: () => Promise<void>;
}

const EditCommentModal = ({
  showEditCommentModal,
  handleCloseEditCommentModal,
  handleShowMessage,
  comment,
  user,
  getComments,
}: EditCommentModalProps) => {
  const t = useTranslations('Comments');

  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  const [state, setState] = useState<CommentStatus>(comment.state);

  const [editedComment, setEditedComment] = useState(comment.comment);

  const router = useRouter();
  const { updateUsersComment } = useComments();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const editComment = useCallback(async () => {
    try {
      await updateUsersComment(comment.id, editedComment, state);
      handleShowMessage(t('commentResentMessage'));
      handleCloseEditCommentModal();
      getComments();
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };
        if (statusCode === 400) {
          setSubmitError(t('invalidInput'));
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
    editedComment,
    getComments,
    handleCloseEditCommentModal,
    handleShowMessage,
    router,
    state,
    t,
    updateUsersComment,
  ]);

  return (
    <Modal
      show={showEditCommentModal}
      onHide={handleCloseEditCommentModal}
      size='lg'
      centered
      className={`${styles.editCommentModal}`}
    >
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('editCommentTitle')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleCloseEditCommentModal}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.modalBg}>
        {submitError && <Alert variant='danger'>{submitError}</Alert>}
        <Form.Group controlId='comment'>
          <Form.Label>{t('editCommentLabel')}</Form.Label>
          <Form.Control
            as='textarea'
            rows={3}
            value={editedComment}
            onChange={(e) => setEditedComment(e.target.value)}
          />
        </Form.Group>

        {isPrivileged && (
          <>
            <Form.Label className={styles.statusSelectLabel}>{t('editStateLabel')}</Form.Label>
            <Form.Select
              aria-label='Select comment status'
              value={state}
              onChange={(e) => setState(e.target.value as CommentStatus)}
            >
              <option value='APPROVED'>{t('APPROVED')}</option>
              <option value='REJECTED'>{t('REJECTED')}</option>
              <option value='PENDING'>{t('PENDING')}</option>
            </Form.Select>
          </>
        )}
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='outline-secondary' onClick={handleCloseEditCommentModal}>
          {t('cancel')}
        </Button>
        <Button
          variant='primary'
          onClick={() => {
            editComment();
          }}
        >
          {t('editComment')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditCommentModal;
