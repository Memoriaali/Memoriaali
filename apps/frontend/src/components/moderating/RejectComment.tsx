'use client';
import { useComments } from '@/hooks/useComments';
import { faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import styles from './PendingComments.module.css';

interface RejectComment {
  getPendingComments: () => Promise<void>;
  handleShowMessage: (text: string) => void;
  setSubmitError: (error: string | null) => void;
  commentId: string;
}

const RejectComment: React.FC<RejectComment> = ({
  getPendingComments,
  handleShowMessage,
  setSubmitError,
  commentId,
}) => {
  const t = useTranslations('Moderating');
  const { rejectUsersComment } = useComments();
  const router = useRouter();

  const rejectComment = useCallback(
    async (commentId: string) => {
      try {
        await rejectUsersComment(commentId);
        getPendingComments();
        handleShowMessage(t('commentRejectSuccess'));
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'statusCode' in error) {
          const { statusCode } = error as { statusCode: number };
          if (statusCode === 401) {
            router.push('/login?error=sessionExpired');
            return;
          } else if (statusCode === 403) {
            setSubmitError(t('accessDenied'));
          } else if (statusCode === 404 || statusCode === 400) {
            setSubmitError(t('commentNotFound'));
          } else {
            setSubmitError(t('unexpectedError'));
          }
        } else {
          setSubmitError(t('unexpectedError'));
        }
      }
    },
    [rejectUsersComment, getPendingComments, handleShowMessage, t, router, setSubmitError],
  );

  return (
    <FontAwesomeIcon
      icon={faCircleXmark}
      className={`${styles.pendingCommentsIcon}`}
      onClick={() => rejectComment(commentId)}
    />
  );
};

export default RejectComment;
