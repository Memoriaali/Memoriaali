'use client';
import { useComments } from '@/hooks/useComments';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import styles from './PendingComments.module.css';

interface ApproveComment {
  getPendingComments: () => Promise<void>;
  handleShowMessage: (text: string) => void;
  setSubmitError: (error: string | null) => void;
  commentId: string;
}

const ApproveComment: React.FC<ApproveComment> = ({
  getPendingComments,
  handleShowMessage,
  setSubmitError,
  commentId,
}) => {
  const t = useTranslations('Moderating');
  const { approveUsersComment } = useComments();
  const router = useRouter();

  const approveComment = useCallback(
    async (commentId: string) => {
      try {
        await approveUsersComment(commentId);
        getPendingComments();
        handleShowMessage(t('commentModeratingSuccess'));
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
    [approveUsersComment, getPendingComments, handleShowMessage, router, setSubmitError, t],
  );

  return (
    <FontAwesomeIcon
      icon={faCircleCheck}
      className={`${styles.pendingCommentsIcon}`}
      onClick={() => approveComment(commentId)}
    />
  );
};

export default ApproveComment;
