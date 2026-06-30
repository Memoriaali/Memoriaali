'use client';
import { useComments } from '@/hooks/useComments';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Table, ToastContainer } from 'react-bootstrap';
import GetDocumentByIdForPreview from '../preview/GetDocumentByIdForPreview';
import ToastMessage from '../toasts/ToastMessage';
import ApproveComment from './ApproveComment';
import styles from './PendingComments.module.css';
import RejectComment from './RejectComment';

interface PendingComment {
  id: string;
  documentId: string;
  comment: string;
  user: {
    username: string;
  };
}

interface ToastData {
  id: number;
  time: Date;
  text: string;
}

const PendingComments: React.FC = () => {
  const t = useTranslations('Moderating');
  const router = useRouter();
  const { getAllPendingComments } = useComments();

  //Toasts
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const handleShowMessage = (text: string) => {
    const newToast = { id: Date.now(), time: new Date(), text };
    setToasts((prevToasts) => [...prevToasts, newToast]);
  };

  const handleCloseMessage = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);

  const getPendingComments = useCallback(async () => {
    try {
      const result = await getAllPendingComments();
      setPendingComments(result?.comments ?? []);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };
        if (statusCode === 401) {
          router.push('/login?error=sessionExpired');
          return;
        } else if (statusCode === 403) {
          setSubmitError(t('accessDenied'));
        } else {
          setSubmitError(t('unexpectedError'));
        }
      } else {
        setSubmitError(t('unexpectedError'));
      }
    }
  }, [getAllPendingComments, router, t]);

  useEffect(() => {
    getPendingComments();
  }, [getPendingComments]);

  return (
    <>
      <Card className={styles.pendingCommentsCard}>
        <Card.Body>
          <h4>{t('checkUserCommentsHeader')}</h4>

          {submitError && <Alert variant='danger'>{submitError}</Alert>}

          <Table striped bordered hover responsive variant='light'>
            <thead>
              <tr>
                <th>{t('materialColumn')}</th>
                <th>{t('userColumn')}</th>
                <th>{t('commentColumn')}</th>
                <th>{t('approveColumn')}</th>
                <th>{t('rejectColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {pendingComments.map((comment) => (
                <tr key={comment?.id}>
                  <td className={styles.pendingCommentsTd}>
                    <GetDocumentByIdForPreview documentId={comment?.documentId} />
                  </td>
                  <td className={styles.pendingCommentsTd}>{comment?.user.username}</td>
                  <td className={styles.pendingCommentsTd}>{comment?.comment}</td>
                  <td className={`${styles.pendingCommentsTd} ${styles.iconTd}`}>
                    <ApproveComment
                      commentId={comment.id}
                      getPendingComments={getPendingComments}
                      handleShowMessage={handleShowMessage}
                      setSubmitError={setSubmitError}
                    />
                  </td>
                  <td className={`${styles.pendingCommentsTd} ${styles.iconTd}`}>
                    <RejectComment
                      commentId={comment.id}
                      getPendingComments={getPendingComments}
                      handleShowMessage={handleShowMessage}
                      setSubmitError={setSubmitError}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <ToastContainer
        className='p-3'
        position='bottom-start'
        style={{
          zIndex: 1065,
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
        }}
      >
        {toasts.map((toast) => (
          <ToastMessage
            key={toast.id}
            id={toast.id}
            time={toast.time}
            toastText={toast.text}
            onClose={handleCloseMessage}
          />
        ))}
      </ToastContainer>
    </>
  );
};

export default PendingComments;
