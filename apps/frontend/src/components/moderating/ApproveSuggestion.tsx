'use client';
import { useMetadatasuggestions } from '@/hooks/useMetadatasuggestions';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import styles from './PendingMetadataSuggestions.module.css';

interface ApproveSuggestion {
  getPendingSuggestions: () => Promise<void>;
  handleShowMessage: (text: string) => void;
  setSubmitError: (error: string | null) => void;
  suggestionId: string;
}

const ApproveSuggestion: React.FC<ApproveSuggestion> = ({
  getPendingSuggestions,
  handleShowMessage,
  setSubmitError,
  suggestionId,
}) => {
  const t = useTranslations('Moderating');
  const { approveUsersSuggestion } = useMetadatasuggestions();
  const router = useRouter();

  const approveComment = useCallback(
    async (suggestionId: string) => {
      try {
        await approveUsersSuggestion(suggestionId);
        getPendingSuggestions();
        handleShowMessage(t('suggestionModeratingSuccess'));
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'statusCode' in error) {
          const { statusCode } = error as { statusCode: number };
          if (statusCode === 401) {
            router.push('/login?error=sessionExpired');
            return;
          } else if (statusCode === 403) {
            setSubmitError(t('accessDenied'));
          } else if (statusCode === 404 || statusCode === 400) {
            setSubmitError(t('suggestionNotFound'));
          } else {
            setSubmitError(t('unexpectedError'));
          }
        } else {
          setSubmitError(t('unexpectedError'));
        }
      }
    },
    [approveUsersSuggestion, getPendingSuggestions, handleShowMessage, router, setSubmitError, t],
  );

  return (
    <FontAwesomeIcon
      icon={faCircleCheck}
      className={`${styles.pendingMetadataSuggestionsIcon}`}
      onClick={() => approveComment(suggestionId)}
    />
  );
};

export default ApproveSuggestion;
