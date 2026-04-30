import { useFeatureConfig } from '@/hooks/useVariant';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import NewEventEmitter from '../../components/eventEmitter/EventEmitter';

interface FlawDetectionSettingsModalProps {
  showFlawDetectionSettingsModal: boolean;
  handleCloseFlawDetectionSettingsModal: () => void;
}

const FlawDetectionSettingsModal = ({
  showFlawDetectionSettingsModal,
  handleCloseFlawDetectionSettingsModal,
}: FlawDetectionSettingsModalProps) => {
  const t = useTranslations('FlawDetection');

  // This comes from variants and checks if the flaw detection feature is enabled by admins
  const feature = useFeatureConfig('flawDetection');
  const emptyEnabled = feature?.config?.emptyPages !== false;
  const postItEnabled = feature?.config?.postIt !== false;
  const cornerEnabled = feature?.config?.foldedCorner !== false;

  // Reset the switches to true when the modal is opened if the feature is enabled by admin, otherwise set them to false
  useEffect(() => {
    if (!emptyEnabled) {
      setEmpty(false);
      NewEventEmitter.emit('emptySelected', false);
    }

    if (!postItEnabled) {
      setPostIt(false);
      NewEventEmitter.emit('postItSelected', false);
    }

    if (!cornerEnabled) {
      setCorner(false);
      NewEventEmitter.emit('cornerSelected', false);
    }
  }, [emptyEnabled, postItEnabled, cornerEnabled]);

  // These are the states for the switches in the modal
  const [empty, setEmpty] = useState<boolean>(true);
  const [postIt, setPostIt] = useState<boolean>(true);
  const [corner, setCorner] = useState<boolean>(true);

  // Callbacks for the switches
  const changeEmpty = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      if (!emptyEnabled) return;
      const value = event.target.checked;
      setEmpty(value);
      NewEventEmitter.emit('emptySelected', value);
    },
    [emptyEnabled],
  );

  const changePostIt = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      if (!postItEnabled) return;
      const value = event.target.checked;
      setPostIt(value);
      NewEventEmitter.emit('postItSelected', value);
    },
    [postItEnabled],
  );

  const changeCorner = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      if (!cornerEnabled) return;
      const value = event.target.checked;
      setCorner(value);
      NewEventEmitter.emit('cornerSelected', value);
    },
    [cornerEnabled],
  );

  useEffect(() => {
    const handleEmpty = (value: boolean) => setEmpty(value);
    const handlePostIt = (value: boolean) => setPostIt(value);
    const handleCorner = (value: boolean) => setCorner(value);

    NewEventEmitter.on('emptySelected', handleEmpty);
    NewEventEmitter.on('postItSelected', handlePostIt);
    NewEventEmitter.on('cornerSelected', handleCorner);

    return () => {
      NewEventEmitter.off('emptySelected', handleEmpty);
      NewEventEmitter.off('postItSelected', handlePostIt);
      NewEventEmitter.off('cornerSelected', handleCorner);
    };
  }, []);

  return (
    <Modal
      show={showFlawDetectionSettingsModal}
      onHide={handleCloseFlawDetectionSettingsModal}
      size='lg'
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title className='ms-auto'>{t('flawDetectionSettings')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {emptyEnabled && (
          <Form.Check type='switch' id='emptyPage'>
            <Form.Check.Input checked={empty} onChange={changeEmpty} />
            <Form.Check.Label>{t('empty')}</Form.Check.Label>
          </Form.Check>
        )}
        {postItEnabled && (
          <Form.Check type='switch' id='postIt'>
            <Form.Check.Input checked={postIt} onChange={changePostIt} />
            <Form.Check.Label>{t('postIt')}</Form.Check.Label>
          </Form.Check>
        )}
        {cornerEnabled && (
          <Form.Check type='switch' id='corner'>
            <Form.Check.Input checked={corner} onChange={changeCorner} />
            <Form.Check.Label>{t('corner')}</Form.Check.Label>
          </Form.Check>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant='primary' onClick={handleCloseFlawDetectionSettingsModal}>
          {t('close')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FlawDetectionSettingsModal;
