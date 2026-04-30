import { useTranslations } from 'next-intl';
import { Spinner } from 'react-bootstrap';

const MetadataDetectionSpinner: React.FC = () => {
  const t = useTranslations('MetadataDetection');

  return (
    <>
      {/*TODO: add counter (tiedostoja käsitelty 1/4)*/}
      <Spinner animation='border' variant='primary' role='status' size='sm'>
        <span className='visually-hidden'>{t('loading')}</span>
      </Spinner>{' '}
      {t('metadataDetectionInProgress')}
    </>
  );
};

export default MetadataDetectionSpinner;
