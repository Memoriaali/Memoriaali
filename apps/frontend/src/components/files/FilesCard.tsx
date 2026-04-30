'use client';

import { useDocuments } from '@/hooks/useDocuments';
import { Document as DocumentType } from '@/lib/api/generated/types.gen';
import { useTranslations } from 'next-intl';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import placeholderImage from '../../image/homepage/placeholder-image.jpg';
import { MetadataSuggestionsProvider } from '../metadataSuggestions/MetadataSuggestionsProvider';
import MetadataValueWithSuggestions from '../metadataSuggestions/MetadataValueWithSuggestions';
import PreviewModal from '../preview/PreviewModal';
import { typeLabelKeys } from '../search/searchTypes';
import DeleteFileModal from './DeleteFileModal';
import EditFileModal from './EditFileModal';
import styles from './FilesCard.module.css';

interface FilesCardProps {
  id: string;
  doc: DocumentType;
  isChecked: boolean;
  onCheckboxChange: (id: string, checked: boolean) => void;
  pathName: string;
  handleShowMessage: (message: string) => void;
}

/** ---- Session-level image cache & inflight dedupe ---- */
const imageCache = new Map<string, string>(); // documentId -> image URL
const inflight = new Set<string>(); // documentId currently loading

const FilesCardComponent = ({
  id,
  isChecked,
  onCheckboxChange,
  doc,
  pathName,
  handleShowMessage,
}: FilesCardProps) => {
  const t = useTranslations('Files');

  // ---- Lazy visibility gate (so we don't fetch until visible) ----
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) setIsVisible(true);
      },
      { root: null, rootMargin: '200px', threshold: 0.01 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ---- Image loading (lazy + cache + inflight dedupe + stale-response ignore) ----
  const { getDocumentImage } = useDocuments();
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);

  // Reset local image when id changes
  useEffect(() => {
    setImageSrc(undefined);
  }, [id]);

  useEffect(() => {
    if (!isVisible) return;

    // Serve from cache if available
    const cached = imageCache.get(id);
    if (cached) {
      setImageSrc(cached);
      return;
    }

    // Dedupe: if this id is already being fetched somewhere else, just wait
    if (inflight.has(id)) return;

    // Token to ignore stale responses (no AbortSignal support needed)
    const requestToken = Symbol(`img-${id}`);
    let activeToken = requestToken;

    inflight.add(id);

    getDocumentImage(id)
      .then((url) => {
        if (activeToken !== requestToken) return; // stale
        if (url) {
          imageCache.set(id, url);
          setImageSrc(url);
        } else {
          setImageSrc(undefined);
        }
      })
      .catch(() => {
        if (activeToken !== requestToken) return; // stale
        setImageSrc(undefined);
      })
      .finally(() => {
        if (activeToken !== requestToken) return; // stale
        inflight.delete(id);
      });

    return () => {
      // Invalidate this request so its eventual resolution is ignored
      activeToken = Symbol('inactive');
    };
    // Keep deps tight; `t` and `handleShowMessage` aren't needed for image
  }, [id, isVisible, getDocumentImage]);

  // ---- UI state (unchanged) ----
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const handleClosePreviewModal = () => setShowPreviewModal(false);
  const handleShowPreviewModal = () => setShowPreviewModal(true);

  const [showDeleteFileModal, setShowDeleteFileModal] = useState(false);
  const handleCloseDeleteFileModal = () => setShowDeleteFileModal(false);
  const handleShowDeleteFileModal = () => setShowDeleteFileModal(true);

  const [showEditFileModal, setShowEditFileModal] = useState(false);
  const handleCloseEditFileModal = () => setShowEditFileModal(false);
  const handleShowEditFileModal = () => setShowEditFileModal(true);

  const showCheckbox = pathName.includes('/usersfiles');

  // Only re-compute type label when the type changes
  const typeLabel = useMemo(() => {
    const typeKey = doc?.metadata.type ?? 'other';
    return t(typeLabelKeys[typeKey]);
  }, [doc?.metadata.type, t]);

  return (
    <div ref={containerRef}>
      <Card className={`${styles.card} ${isChecked ? 'checked' : ''}`}>
        <div className={styles.checkboxContainer}>
          {showCheckbox && (
            <input
              type='checkbox'
              className={styles.cardCheckbox}
              checked={isChecked}
              onChange={(e) => onCheckboxChange(id, e.target.checked)}
              aria-label='choose file'
            />
          )}
        </div>

        {doc?.mimeType?.startsWith('image') ? (
          <Card.Img
            variant='top'
            src={imageSrc ?? placeholderImage.src}
            alt={doc.metadata.header ?? 'Document'}
            className={styles.linkCardImage}
          />
        ) : (
          <Card.Img
            variant='top'
            src={placeholderImage.src}
            alt={doc.metadata.header ?? 'Document'}
            className={styles.linkCardImage}
          />
        )}

        {/* Lazy-enable metadata suggestions when visible to avoid early requests */}
        <MetadataSuggestionsProvider documentId={doc.id} enabled={isVisible}>
          <Card.Body>
            {/* Header with suggestions */}
            <Card.Title>
              <MetadataValueWithSuggestions
                field='header'
                baseValue={doc?.metadata.header ?? t('noHeader')}
              />
            </Card.Title>
            <Card.Text>
              {t('description')}:&nbsp;
              <MetadataValueWithSuggestions
                field='description'
                baseValue={doc?.metadata.description ?? t('noDescription')}
              />
              <br />
              {t('date')}:&nbsp;
              <MetadataValueWithSuggestions
                field='exactDate'
                baseValue={doc?.metadata.exactDate ?? t('noDate')}
              />
              <br />
              {t('type')}:&nbsp;
              <MetadataValueWithSuggestions field='type' baseValue={typeLabel} />
              <br />
            </Card.Text>

            <Button
              variant='primary'
              className={styles.filesCardButton}
              onClick={handleShowPreviewModal}
            >
              {t('preview')}
            </Button>
            <Button
              variant='primary'
              className={styles.filesCardButton}
              onClick={handleShowEditFileModal}
            >
              {t('edit')}
            </Button>
            <Button
              variant='primary'
              className={styles.filesCardButton}
              onClick={handleShowDeleteFileModal}
            >
              {t('delete')}
            </Button>
          </Card.Body>
        </MetadataSuggestionsProvider>
      </Card>

      {/* Mount modals only when open (prevents their effects from running on initial render) */}
      {showPreviewModal && (
        <PreviewModal
          showPreviewModal={showPreviewModal}
          handleClosePreviewModal={handleClosePreviewModal}
          document={doc}
          imageSrc={imageSrc}
        />
      )}
      {showDeleteFileModal && (
        <DeleteFileModal
          showDeleteFileModal={showDeleteFileModal}
          handleCloseDeleteFileModal={handleCloseDeleteFileModal}
          document={doc}
          handleShowMessage={handleShowMessage}
        />
      )}
      {showEditFileModal && (
        <EditFileModal
          showEditFileModal={showEditFileModal}
          handleCloseEditFileModal={handleCloseEditFileModal}
          document={doc}
          handleShowMessage={handleShowMessage}
        />
      )}
    </div>
  );
};

/**
 * React.memo with a custom comparator:
 * Only re-render when the props we actually use have changed.
 * This prevents re-renders if parent recreates `doc` objects that are semantically the same.
 */
function areEqual(prev: FilesCardProps, next: FilesCardProps): boolean {
  if (prev.id !== next.id) return false;
  if (prev.isChecked !== next.isChecked) return false;
  if (prev.pathName !== next.pathName) return false;

  // We only use a subset of doc fields in this component; compare those
  const p = prev.doc;
  const n = next.doc;

  if (p.id !== n.id) return false;
  if (p.mimeType !== n.mimeType) return false;

  const pm = p.metadata;
  const nm = n.metadata;

  if (pm.header !== nm.header) return false;
  if (pm.description !== nm.description) return false;
  if (pm.exactDate !== nm.exactDate) return false;
  if (pm.type !== nm.type) return false;

  // Functions: we don't compare `onCheckboxChange` or `handleShowMessage` identities.
  // They may be stable (useCallback) in parent, but even if not, they don't affect our rendering logic.
  return true;
}

const FilesCard = memo(FilesCardComponent, areEqual);

export default FilesCard;
