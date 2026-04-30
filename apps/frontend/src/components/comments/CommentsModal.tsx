import { useAuth } from '@/hooks/useAuth';
import { useComments } from '@/hooks/useComments';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import CommentCard from './CommentCard';
import CommentSendModal from './CommentSendModal';
import styles from './CommentsModal.module.css';

interface CommentsProps {
  showCommentsModal: boolean;
  handleCloseCommentsModal: () => void;
  handleShowMessage: (_message: string) => void;
  documentId: string;
}

interface Comment {
  id: string;
  documentId: string;
  comment: string;
  createdAt: string;
  state: 'APPROVED' | 'PENDING' | 'REJECTED';
  user: {
    id: string;
    username: string;
  };
}

const CommentsModal = ({
  showCommentsModal,
  handleCloseCommentsModal,
  handleShowMessage,
  documentId,
}: CommentsProps) => {
  const t = useTranslations('Comments');
  const { user, isAuthenticated, fetchMe } = useAuth();
  const { getCommentByDocId } = useComments();
  const router = useRouter();

  // State for opening and closing comment send modal
  const [showCommentSendModal, setShowCommentSendModal] = useState(false);
  const handleCloseCommentSendModal = () => setShowCommentSendModal(false);
  const handleShowCommentSendModal = () => setShowCommentSendModal(true);

  // If comment is empty cant send the comment
  const [cantSend, setCantSend] = useState(true);

  // State and function to handle comment change
  const [comment, setComment] = useState<string>('');
  const handleCommentChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const value = event.target.value;
    setComment(value);
    setCantSend(value.trim() === '');
  };

  // State for comments for document and errors
  const [comments, setComments] = useState<Comment[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Loading state waiting for the comments to load
  const [loading, setLoading] = useState(false);

  // ---- Guards to prevent duplicate & unnecessary fetches ----
  const inFlightRef = useRef(false);
  const cacheRef = useRef<Record<string, Comment[]>>({});

  const getComments = useCallback(async () => {
    // Only fetch if modal is visible
    if (!showCommentsModal) return;

    // Serve from cache if available
    const cached = cacheRef.current[documentId];
    if (cached) {
      setComments(cached);
      setSubmitError(null);
      return;
    }

    // Prevent overlapping calls
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setSubmitError(null);

    try {
      const result = await getCommentByDocId(documentId);
      const list = result?.comments ?? [];
      cacheRef.current[documentId] = list;
      setComments(list);
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
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [documentId, getCommentByDocId, router, t, showCommentsModal]);

  // Fetch when the modal transitions to open
  useEffect(() => {
    if (showCommentsModal) {
      void getComments();
    }
    // When closing, we don't clear cache—keeps next open instant.
  }, [showCommentsModal, getComments]);

  useEffect(() => {
    if (!showCommentsModal) return;
    if (!isAuthenticated) return;
    if (user) return;

    fetchMe().catch(console.error);
  }, [showCommentsModal, isAuthenticated, user, fetchMe]);

  // Expose a way for child actions to force-refresh (e.g., after sending a new comment)
  // Invalidate cache and refetch
  const refreshComments = useCallback(async () => {
    delete cacheRef.current[documentId];
    await getComments();
  }, [documentId, getComments]);

  return (
    <>
      <Modal
        show={showCommentsModal}
        onHide={handleCloseCommentsModal}
        size='lg'
        centered
        className={`${styles.commentsModal}`}
      >
        <Modal.Header
          className={`${styles.modalBg} d-flex justify-content-center position-relative`}
        >
          <Modal.Title className={styles.modalTitle}>{t('itemComments')}</Modal.Title>
          <Button
            variant='link'
            onClick={handleCloseCommentsModal}
            className={styles.customClose}
            aria-label='close modal'
          >
            <FontAwesomeIcon icon={faXmark} />
          </Button>
        </Modal.Header>

        <Modal.Body className={styles.modalBg}>
          {loading && (
            <div className='d-flex justify-content-center py-5'>
              <Spinner animation='border' />
            </div>
          )}

          {!loading && (
            <>
              {submitError && <Alert variant='danger'>{submitError}</Alert>}
              {comments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  handleShowMessage={handleShowMessage}
                  comment={comment}
                  getComments={refreshComments}
                />
              ))}
            </>
          )}

          <Form.Group controlId='comment'>
            <Form.Label>{t('addNewComment')}</Form.Label>
            <Form.Control as='textarea' rows={3} onChange={handleCommentChange} value={comment} />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer className={styles.modalBg}>
          <Button variant='outline-secondary' onClick={handleCloseCommentsModal}>
            {t('cancel')}
          </Button>
          <Button variant='primary' onClick={handleShowCommentSendModal} disabled={cantSend}>
            {t('sendComment')}
          </Button>
        </Modal.Footer>
      </Modal>

      {showCommentSendModal && <div className={styles.overlay} />}

      <CommentSendModal
        showCommentSendModal={showCommentSendModal}
        handleCloseCommentSendModal={handleCloseCommentSendModal}
        handleShowMessage={handleShowMessage}
        documentId={documentId}
        comment={comment}
        setComment={setComment}
        getComments={refreshComments}
      />
    </>
  );
};

export default CommentsModal;
