import {
  faCircleQuestion,
  faUserCheck,
  faUserLock,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { Col, Container, Row } from 'react-bootstrap';
import InstructionsCard from './InstructionsCard';
import styles from './InstructionsGrid.module.css';

const InstructionsGrid = () => {
  const t = useTranslations('InstructionsGrid');

  return (
    <Container className={styles.container}>
      <h2 className={styles.header}>{t('instructionsHeader')}</h2>
      <Row>
        <Col sm={6} md={3}>
          <InstructionsCard
            icon={faUserPlus}
            title={t('registrationTitle')}
            text={t('registrationText')}
          />
        </Col>
        <Col sm={6} md={3}>
          <InstructionsCard icon={faUserCheck} title={t('loginTitle')} text={t('loginText')} />
        </Col>
        <Col sm={6} md={3}>
          <InstructionsCard
            icon={faCircleQuestion}
            title={t('forgotUsernamePasswordTitle')}
            text={t('forgotUsernamePasswordText')}
          />
        </Col>
        <Col sm={6} md={3}>
          <InstructionsCard icon={faUserLock} title={t('logoutTitle')} text={t('logoutText')} />
        </Col>
      </Row>
    </Container>
  );
};

export default InstructionsGrid;
