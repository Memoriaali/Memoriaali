import { useDocuments } from '@/hooks/useDocuments';
import { Document as DocumentType } from '@/lib/api/generated/types.gen';
import { faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Button, Image, Modal } from 'react-bootstrap';
import styles from './SelectedDocumentsTab.module.css';

interface SelectedDocumentsTabProps {
  handleClose: () => void;
  setKey: (key: string) => void;
  selectedDocuments: string[];
  setSelectedDocuments: Dispatch<SetStateAction<string[]>>;
}

interface DocumentWithImage extends DocumentType {
  imageUrl?: string;
}

const SelectedDocuments = ({
  handleClose,
  setKey,
  selectedDocuments,
  setSelectedDocuments,
}: SelectedDocumentsTabProps) => {
  const t = useTranslations('SipPackageCreation');
  const { getOneDocumentById, getDocumentImage } = useDocuments();
  const [documents, setDocuments] = useState<DocumentWithImage[]>([]);

  useEffect(() => {
    if (!selectedDocuments.length) return;

    const fetchDocuments = async () => {
      try {
        const docs = await Promise.all(
          selectedDocuments.map(async (id) => {
            const result = await getOneDocumentById(id);
            const document = result.data?.data as DocumentType;

            const imageResult = await getDocumentImage(id);

            return {
              ...document,
              imageUrl: imageResult,
            } as DocumentWithImage;
          }),
        );

        setDocuments(docs);
        console.log('Fetched documents:', docs);
      } catch (error) {
        console.error('Error fetching documents:', error);
      }
    };

    const handleRemove = (id: string) => {
      setSelectedDocuments((prev) => prev.filter((docId) => docId !== id));
    };

    fetchDocuments();
  }, [selectedDocuments, getOneDocumentById, getDocumentImage]);

  return (
    <>
      <Modal.Header
        className={`${styles.modalBg} ${styles.modalHeader} d-flex justify-content-center position-relative`}
      >
        <Modal.Title className={styles.modalTitle}>{t('selectedDocuments')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleClose}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>
      <Modal.Body className={`${styles.modalBody} ${styles.modalBg}`}>
        {documents.length > 0 ? (
          <ul className={styles.list}>
            {documents.map((doc) => (
              <li key={doc.id} className={styles.listItem}>
                <Image className={`${styles.image}`} src={doc.imageUrl} alt={doc.metadata.header} />
                <div className={styles.content}>
                  <p className={styles.title}>{doc.metadata.header}</p>
                </div>
                <div className={styles.actions}>
                  <FontAwesomeIcon
                    icon={faTrash}
                    className={styles.trashIcon}
                    onClick={() =>
                      setSelectedDocuments((prev) => prev.filter((docId) => docId !== doc.id))
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t('noDocumentsSelected')}</p>
        )}
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='secondary' onClick={handleClose}>
          {t('cancel')}
        </Button>
        <Button variant='primary' onClick={() => setKey('metadata')}>
          {t('next')}
        </Button>
      </Modal.Footer>
    </>
  );
};

export default SelectedDocuments;
