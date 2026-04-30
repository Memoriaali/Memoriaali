'use client';
import { useMetadatasuggestions } from '@/hooks/useMetadatasuggestions';
import { MetadataSuggestionWithUser } from '@/lib/api/generated/types.gen';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Table, ToastContainer } from 'react-bootstrap';
import GetDocumentByIdForPreview from '../preview/GetDocumentByIdForPreview';
import ToastMessage from '../toasts/ToastMessage';
import ApproveSuggestion from './ApproveSuggestion';
import styles from './PendingMetadataSuggestions.module.css';
import RejectSuggestion from './RejectSuggestion';

interface ToastData {
  id: number;
  time: Date;
  text: string;
}

const PendingMetadataSuggestions: React.FC = () => {
  const t = useTranslations('Moderating');
  const router = useRouter();
  const { getAllPendingSuggestions } = useMetadatasuggestions();

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

  const [pendingSuggestions, setPendingSuggestions] = useState<MetadataSuggestionWithUser[]>([]);

  const getPendingSuggestions = useCallback(async () => {
    try {
      const result = await getAllPendingSuggestions();
      setPendingSuggestions(result?.metadataSuggestions ?? []);
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
  }, [getAllPendingSuggestions, router, t]);

  useEffect(() => {
    getPendingSuggestions();
  }, [getPendingSuggestions]);

  return (
    <>
      <Card className={styles.pendingMetadataSuggestionsCard}>
        <Card.Body>
          <h4>{t('checkUserMetadataSuggestionsHeader')}</h4>

          {submitError && <Alert variant='danger'>{submitError}</Alert>}

          <Table striped bordered hover responsive variant='dark'>
            <thead>
              <tr>
                <th>{t('materialColumn')}</th>
                <th>{t('userColumn')}</th>
                <th>{t('suggestionFieldColumn')}</th>
                <th>{t('suggestionColumn')}</th>
                <th>{t('approveColumn')}</th>
                <th>{t('rejectColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {pendingSuggestions.map((suggestion) => (
                <tr key={suggestion.id}>
                  <td className={styles.pendingMetadataSuggestionsTd}>
                    <GetDocumentByIdForPreview documentId={suggestion?.documentId} />
                  </td>
                  <td className={styles.pendingMetadataSuggestionsTd}>
                    {suggestion.suggestedBy?.username}
                  </td>
                  <td className={styles.pendingMetadataSuggestionsTd}>
                    {suggestion.fieldToChange}
                  </td>
                  <td className={styles.pendingMetadataSuggestionsTd}>{suggestion.changedValue}</td>
                  <td className={`${styles.pendingMetadataSuggestionsTd} ${styles.iconTd}`}>
                    <ApproveSuggestion
                      suggestionId={suggestion.id}
                      getPendingSuggestions={getPendingSuggestions}
                      handleShowMessage={handleShowMessage}
                      setSubmitError={setSubmitError}
                    />
                  </td>
                  <td className={`${styles.pendingMetadataSuggestionsTd} ${styles.iconTd}`}>
                    <RejectSuggestion
                      suggestionId={suggestion.id}
                      getPendingSuggestions={getPendingSuggestions}
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

export default PendingMetadataSuggestions;
