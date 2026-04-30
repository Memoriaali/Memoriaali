import { Document as DocumentType } from '@/lib/api/generated/types.gen';
import { faFloppyDisk, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { Button, Modal, Spinner } from 'react-bootstrap';
import Image from 'react-bootstrap/Image';
import placeholderImage from '../../image/homepage/placeholder-image.jpg';
import MetadataTable from '../metadata/MetadataTable';
import styles from './PreviewModal.module.css';

interface PreviewModalProps {
  showPreviewModal: boolean;
  handleClosePreviewModal: () => void;
  document: DocumentType;
  imageSrc: string | undefined;
  loading?: boolean;
}

const PreviewModal = ({
  showPreviewModal,
  handleClosePreviewModal,
  document,
  imageSrc,
  loading = false,
}: PreviewModalProps) => {
  const t = useTranslations('PreviewModal');

  return (
    <Modal show={showPreviewModal} onHide={handleClosePreviewModal} size='lg' centered>
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('previewTitle')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleClosePreviewModal}
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
            {document?.mimeType?.startsWith('image') && (
              <Image
                className={styles.previewImage}
                src={imageSrc ?? placeholderImage.src}
                alt={document.metadata.header ?? 'Document'}
              />
            )}
            {document?.mimeType?.startsWith('application/pdf') && (
              <iframe
                src={imageSrc}
                className={styles.previewModalPdf}
                title={document.metadata.header ?? 'PDF document'}
              />
            )}
            {imageSrc && (
              <a href={imageSrc} download target='_blank' rel='noopener noreferrer'>
                <Button className={styles.previewDownloadButton}>
                  <FontAwesomeIcon icon={faFloppyDisk} /> {t('downloadFile')}
                </Button>
              </a>
            )}
            <MetadataTable document={document} />
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default PreviewModal;
