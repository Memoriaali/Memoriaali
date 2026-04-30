import { useTranslations } from 'next-intl';
import { Button, Modal } from 'react-bootstrap';

interface FlawData {
  [key: string]: unknown;
  id?: string;
  post_it?: number;
  taittunut_kulma?: number;
  tyhja_sivu?: number;
}

interface FlawModalProps {
  showFlawModal: boolean;
  handleCloseFlawModal: () => void;
  flawData?: FlawData | undefined;
  deleteFromUploadedFiles: (_id: string) => void;
  fileId: string;
}

const FlawModal = ({
  showFlawModal,
  handleCloseFlawModal,
  flawData,
  deleteFromUploadedFiles,
  fileId,
}: FlawModalProps) => {
  const t = useTranslations('FlawDetection');

  return (
    <Modal show={showFlawModal} onHide={handleCloseFlawModal} centered>
      <Modal.Header closeButton>
        <Modal.Title className='ms-auto'>{t('fileMayContainFlaws')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {flawData?.post_it === 1 && (
          <p>Tämä tiedosto saattaa sisältää sisällön peittäviä post-it lappuja.</p>
        )}
        {flawData?.taittunut_kulma === 1 && (
          <p>Tämä tiedosto saattaa sisältää taittuneen kulman.</p>
        )}
        {flawData?.tyhja_sivu === 1 && <p>Tämä tiedosto saattaa sisältää tyhjän/tyhjiä sivuja.</p>}
        <br />
        Suosittelemme, että tarkistat tiedoston ennen sen lisäämistä Memoriaaliin. Jos ohitat tämän
        virheilmoituksen, mahdollisesta virheestä jää tieto tiedoston kuvailutietoihin.
        <br />
        <br />
      </Modal.Body>

      <Modal.Footer>
        <Button variant='secondary' onClick={handleCloseFlawModal}>
          {t('continueWithoutDeleting')}
        </Button>
        <Button variant='primary' onClick={() => deleteFromUploadedFiles(fileId)}>
          {t('deleteFile')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FlawModal;
