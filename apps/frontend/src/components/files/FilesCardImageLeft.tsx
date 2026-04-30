'use client';

import { useDocuments } from '@/hooks/useDocuments';
import { Document as DocumentType } from '@/lib/api/generated/types.gen';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Col, Row, ToastContainer } from 'react-bootstrap';
import placeholderImage from '../../image/homepage/placeholder-image.jpg';
import CommentsModal from '../comments/CommentsModal';
import MetadataTableLite from '../metadata/MetadataTableLite';
import MetadataSuggestionsModal from '../metadataSuggestions/MetadataSuggestionsModal';
import PreviewModal from '../preview/PreviewModal';
import ToastMessage from '../toasts/ToastMessage';
import styles from './FilesCardImageLeft.module.css';

interface FilesCardProps {
  id: string;
  document: DocumentType;
}

interface ToastData {
  id: number;
  time: Date;
  text: string;
}

/** In-memory cache for this session: documentId -> image URL */
const imageCache = new Map<string, string>();
/** Track in-flight loads to dedupe (documentId) */
const inflight = new Set<string>();

const FilesCardImageLeft: React.FC<FilesCardProps> = ({ id, document }) => {
  const t = useTranslations('Files');

  // Toasts
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const handleShowMessage = (text: string) => {
    const newToast = { id: Date.now(), time: new Date(), text };
    setToasts((prev) => [...prev, newToast]);
  };
  const handleCloseMessage = (toastId: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  // Image
  const { getDocumentImage } = useDocuments();
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);

  // Lazy-load: observe when card is near viewport
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.01 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Reset when id changes
  useEffect(() => {
    setImageSrc(undefined);
  }, [id]);

  useEffect(() => {
    if (isVisible) return;

    // Serve from cache
    const cached = imageCache.get(id);
    if (cached) {
      setImageSrc(cached);
      return;
    }

    // Dedupe: if already loading this id elsewhere, just wait; this effect will run again
    if (inflight.has(id)) return;

    // Token to ignore late responses (no AbortSignal needed)
    const requestToken = Symbol(`img-${id}`);
    let activeToken = requestToken;

    inflight.add(id);

    getDocumentImage(id)
      .then((url) => {
        // Ignore if this request is outdated (id changed/unmounted and another request started)
        if (activeToken !== requestToken) return;
        if (url) {
          imageCache.set(id, url);
          setImageSrc(url);
        } else {
          setImageSrc(undefined);
        }
      })
      .catch((error) => {
        if (activeToken !== requestToken) return;
        if (error instanceof Error) {
          const message = error.message;
          if (message === 'Document is private or you lack required permissions') {
            handleShowMessage(t('noPermissionFile'));
          } else {
            handleShowMessage(t('unexpectedError'));
          }
        } else {
          handleShowMessage(t('unexpectedError'));
        }
        setImageSrc(undefined);
      })
      .finally(() => {
        if (activeToken !== requestToken) return;
        inflight.delete(id);
      });

    return () => {
      // Invalidate this request so its eventual resolution is ignored
      activeToken = Symbol('inactive');
    };
    // Keep deps tight to avoid extra runs
  }, [id, isVisible, getDocumentImage, t]);

  // Preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const handleClosePreviewModal = () => setShowPreviewModal(false);
  const handleShowPreviewModal = () => setShowPreviewModal(true);

  // Comments modal
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const handleCloseCommentsModal = () => setShowCommentsModal(false);
  const handleShowCommentsModal = () => setShowCommentsModal(true);

  // Metadata suggestions modal
  const [showMetadataSuggestionsModal, setShowMetadataSuggestionsModal] = useState(false);
  const handleCloseMetadataSuggestionsModal = () => setShowMetadataSuggestionsModal(false);
  const handleShowMetadataSuggestionsModal = () => setShowMetadataSuggestionsModal(true);

  return (
    <>
      <Card className={styles.filesCard} ref={cardRef}>
        <Row>
          <Col md={4}>
            {document?.mimeType?.startsWith('image') ? (
              <Card.Img
                src={imageSrc ?? placeholderImage.src}
                alt={document.metadata.header ?? 'Document'}
                className={styles.cardImage}
              />
            ) : (
              <Card.Img
                src={placeholderImage.src}
                alt={document.metadata.header ?? 'Document'}
                className={styles.cardImage}
              />
            )}
          </Col>
          <Col md={8}>
            <Card.Body>
              <MetadataTableLite document={document} />
            </Card.Body>
          </Col>
        </Row>
        <div className={styles.buttonContainer}>
          <Button variant='primary' onClick={handleShowPreviewModal} className={styles.btnButton}>
            {t('preview')}
          </Button>
          <Button variant='primary' onClick={handleShowCommentsModal} className={styles.btnButton}>
            {t('comments')}
          </Button>
          <Button
            variant='primary'
            onClick={handleShowMetadataSuggestionsModal}
            className={styles.btnButton}
          >
            {t('metadataSuggestion')}
          </Button>
        </div>
      </Card>

      {showPreviewModal && (
        <PreviewModal
          showPreviewModal={showPreviewModal}
          handleClosePreviewModal={handleClosePreviewModal}
          document={document}
          imageSrc={imageSrc}
        />
      )}

      {showCommentsModal && (
        <CommentsModal
          showCommentsModal={showCommentsModal}
          handleCloseCommentsModal={handleCloseCommentsModal}
          handleShowMessage={handleShowMessage}
          documentId={id}
        />
      )}

      {showMetadataSuggestionsModal && (
        <MetadataSuggestionsModal
          showMetadataSuggestionsModal={showMetadataSuggestionsModal}
          handleCloseMetadataSuggestionsModal={handleCloseMetadataSuggestionsModal}
          handleShowMessage={handleShowMessage}
          documentId={id}
        />
      )}

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

export default FilesCardImageLeft;
