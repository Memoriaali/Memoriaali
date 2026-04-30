import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Form } from 'react-bootstrap';
import NewEventEmitter from '../../components/eventEmitter/EventEmitter';

const FlawDetectionSwitch: React.FC = () => {
  const t = useTranslations('FlawDetection');
  const [selectedOption, setSelectedOption] = useState<boolean>(true);

  // Track the three toggle states locally
  const [empty, setEmpty] = useState(true);
  const [postIt, setPostIt] = useState(true);
  const [corner, setCorner] = useState(true);

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.checked;
    setSelectedOption(value);
    NewEventEmitter.emit('flawSelected', value);

    if (value) {
      // Flaw detection turned ON → turn ON all three toggles
      NewEventEmitter.emit('emptySelected', true);
      NewEventEmitter.emit('postItSelected', true);
      NewEventEmitter.emit('cornerSelected', true);
    } else {
      // Flaw detection turned OFF → turn OFF all three toggles
      NewEventEmitter.emit('emptySelected', false);
      NewEventEmitter.emit('postItSelected', false);
      NewEventEmitter.emit('cornerSelected', false);
    }
  };

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

  useEffect(() => {
    const anyOn = empty || postIt || corner;

    if (anyOn && !selectedOption) {
      setSelectedOption(true);
      NewEventEmitter.emit('flawSelected', true);
    }
  }, [empty, postIt, corner, selectedOption]);

  return (
    <Form.Check type='switch' id='flawDetection'>
      <Form.Check.Input checked={selectedOption} onChange={handleRadioChange} />
      <Form.Check.Label>
        {t('useFlawDetection')} <FontAwesomeIcon icon={faCircleInfo} />
      </Form.Check.Label>
    </Form.Check>
  );
};

export default FlawDetectionSwitch;
