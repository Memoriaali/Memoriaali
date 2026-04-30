'use client';

import { useFlawDetectionEnabled } from '@/hooks/useFlawDetectionEnabled';
import { useMetadataDetectionEnabled } from '@/hooks/useMetadataDetectionEnabled';
import { useFeatureConfig } from '@/hooks/useVariant';
import { useTranslations } from 'next-intl';
import { Accordion, Container } from 'react-bootstrap';

const InfoAboutMemoriaali = () => {
  const flawDetectionEnabledByAdmin = useFlawDetectionEnabled();
  const metadataDetectionEnabledByAdmin = useMetadataDetectionEnabled();
  const feature = useFeatureConfig('oralHistory');
  const isOralHistoryEnabled = feature?.config?.enabled;
  const t = useTranslations('InfoAboutMemoriaali');

  const loginRegisterText = t('loginRegisterText');
  const searchText = t('searchText');

  return (
    <Container>
      <h1>Näin käytät Memoriaalia</h1>

      <p />
      <Accordion defaultActiveKey='' className='mt-3 mb-3'>
        <Accordion.Item eventKey='1'>
          <Accordion.Header>{t('loginRegister')}</Accordion.Header>
          <Accordion.Body>
            <span>
              {loginRegisterText.split('/n').map((line, index) => (
                <p key={index}>{line.trim()}</p>
              ))}
            </span>
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey='2'>
          <Accordion.Header>{t('search')}</Accordion.Header>
          <Accordion.Body>
            <span>
              {searchText.split('/n').map((line, index) => (
                <p key={index}>{line.trim()}</p>
              ))}
            </span>
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey='3'>
          <Accordion.Header>{t('saveMaterial')}</Accordion.Header>
          <Accordion.Body>
            <p>{t('saveMaterialText')}</p>
            {(flawDetectionEnabledByAdmin || metadataDetectionEnabledByAdmin) && (
              <p>{t('aiComponentsText')}</p>
            )}
            {isOralHistoryEnabled && <p>{t('oralHistoryText')}</p>}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
};

export default InfoAboutMemoriaali;
