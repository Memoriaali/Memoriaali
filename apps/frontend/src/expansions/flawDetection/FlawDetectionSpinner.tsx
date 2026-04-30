import { useTranslations } from 'next-intl';
import { Spinner } from 'react-bootstrap';

const FlawDetectionSpinner: React.FC = () => {
  const t = useTranslations('FlawDetection');

  return (
    <>
      {/*TODO: add counter (virheitä käsitelty 1/4)*/}
      <Spinner animation='border' variant='primary' role='status' size='sm'>
        <span className='visually-hidden'>{t('loading')}</span>
      </Spinner>{' '}
      {t('flawDetectionInProgress')}
    </>
  );
};

export default FlawDetectionSpinner;
