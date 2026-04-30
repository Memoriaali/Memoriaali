import {
  faCircleInfo,
  faFileCirclePlus,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { Col, Container, Row } from 'react-bootstrap';

import LinkCard from './LinkCard';

const CardGrid = () => {
  const t = useTranslations('CardGrid');

  return (
    <Container>
      <Row className='card-grid-row'>
        <Col xs={6} md={4}>
          <LinkCard title={t('howToUseMemoriaali')} icon={faCircleInfo} path='info' />
        </Col>
        <Col xs={6} md={4}>
          <LinkCard title={t('saveMaterial')} icon={faFileCirclePlus} path='usersfiles' />
        </Col>
        <Col xs={6} md={4}>
          <LinkCard title={t('searchMaterial')} icon={faMagnifyingGlass} path='search' />
        </Col>
        {/*
        <Col xs={6} md={4}>
          <LinkCard title={t('instructionVideos')} icon={faCirclePlay} />
        </Col>
        <Col xs={6} md={4}>
          <LinkCard title={t('contactInfo')} icon={faPhone} />
        </Col>
        <Col xs={6} md={4}>
          <LinkCard title={t('giveFeedback')} icon={faThumbsUp} />
        </Col>
        */}
      </Row>
    </Container>
  );
};

export default CardGrid;
