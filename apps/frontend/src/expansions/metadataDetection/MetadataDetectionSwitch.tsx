import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Form } from 'react-bootstrap';
import NewEventEmitter from '../../components/eventEmitter/EventEmitter';

const MetadataDetectionSwitch: React.FC = () => {
  const t = useTranslations('MetadataDetection');
  const [selectedOption, setSelectedOption] = useState<boolean>(true);

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.checked;
    setSelectedOption(value);
    NewEventEmitter.emit('metadataSelected', value);
  };

  return (
    <Form.Check type='switch' id='metadataDetection' className='mt-2'>
      <Form.Check.Input checked={selectedOption} onChange={handleRadioChange} />
      <Form.Check.Label>
        {t('useMetadataDetection')} <FontAwesomeIcon icon={faCircleInfo} />
      </Form.Check.Label>
    </Form.Check>
  );
};

export default MetadataDetectionSwitch;
