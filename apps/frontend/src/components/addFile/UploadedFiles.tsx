import { faFile, faTrash, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, Card, Col, Row } from 'react-bootstrap';
import FlawModal from '../../expansions/flawDetection/FlawModal';
import type { UploadedFile } from '../addFile/AddFileModal';
import styles from './UploadedFiles.module.css';

interface FlawResult {
  [key: string]: unknown;
  id?: string;
  post_it?: number;
  taittunut_kulma?: number;
  tyhja_sivu?: number;
}

interface FileProps {
  file: UploadedFile;
  deleteFromUploadedFiles: (_id: string) => void;
  flawData?: FlawResult | undefined;
}

const File = ({ file, deleteFromUploadedFiles, flawData }: FileProps) => {
  const t = useTranslations('AddFiles');

  const hasFlaw =
    flawData &&
    (flawData.post_it === 1 || flawData.taittunut_kulma === 1 || flawData.tyhja_sivu === 1);

  const [showFlawModal, setShowFlawModal] = useState(false);

  const handleCloseFlawModal = () => setShowFlawModal(false);
  const handleShowFlawModal = () => setShowFlawModal(true);

  return (
    <>
      <Card className={styles.cardStyle}>
        <Row className={styles.cardTextCenter}>
          <Col xs={3} sm={4} md={4} className={styles.column}>
            {file.filetype.includes('image') && (
              <Card.Img className={styles.cardImage} src={file.src} alt='added file' />
            )}
            {!file.filetype.includes('image') && (
              <FontAwesomeIcon className={`${styles.fileIcon}`} icon={faFile} />
            )}
          </Col>
          <Col xs={4} sm={3} md={3} className={styles.column}>
            {file.file.name}
          </Col>
          <Col xs={3} sm={3} md={3}>
            {/*TODO: this is part of expansion pack and needs to be conditional */}
            {hasFlaw && (
              <Button onClick={handleShowFlawModal} variant='primary'>
                <FontAwesomeIcon icon={faTriangleExclamation} />{' '}
                <span>{t('fileMayContainFlaws')}</span>
              </Button>
            )}
          </Col>
          <Col xs={2} sm={2} md={2} className={styles.column}>
            <FontAwesomeIcon
              className={`${styles.trashIcon}`}
              icon={faTrash}
              aria-label={t('deleteFile')}
              onClick={() => {
                deleteFromUploadedFiles(file.id);
              }}
            />
          </Col>
        </Row>
      </Card>

      <FlawModal
        handleCloseFlawModal={handleCloseFlawModal}
        showFlawModal={showFlawModal}
        flawData={flawData}
        deleteFromUploadedFiles={deleteFromUploadedFiles}
        fileId={file.id}
      />

      {showFlawModal && <div className={styles.overlay} />}
    </>
  );
};

interface UploadedFilesProps {
  files: UploadedFile[];
  receivedFlaw: FlawResult[];
  deleteFromUploadedFiles: (_id: string) => void;
}

const UploadedFiles = ({ files, receivedFlaw, deleteFromUploadedFiles }: UploadedFilesProps) => {
  // Flatten the receivedFlaw array
  const flattenedFlaws = receivedFlaw.flat();

  const renderFile = (file: UploadedFile) => {
    const flawData = flattenedFlaws.find((flaw: FlawResult) => flaw.id === file.id);

    return (
      <File
        key={`${file.id}-image`}
        file={file}
        flawData={flawData}
        deleteFromUploadedFiles={deleteFromUploadedFiles}
      />
    );
  };

  return <div>{files.map(renderFile)}</div>;
};

export default UploadedFiles;
