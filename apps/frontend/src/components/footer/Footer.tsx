import Link from 'next/link';
import { Col, Container, Image, Row } from 'react-bootstrap';
import ELKA from '../../image/logos/ELKA.png';
import eu from '../../image/logos/eu_white.png';
import KK from '../../image/logos/KK_white.png';
import maakuntaliitto from '../../image/logos/maakuntaliitto_white.png';
import xamk from '../../image/logos/xamk_white.png';
import styles from './footer.module.css';

const logos = [eu.src, maakuntaliitto.src, KK.src, ELKA.src, xamk.src];

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <Container fluid className='px-3'>
        <Row className={`justify-content-center ${styles.logoRow}`}>
          {logos.map((src, index) => (
            <Col key={index} xs={4} sm={2} className=''>
              <Image src={src} alt={`Logo ${index + 1}`} fluid className={styles.footerLogos} />
            </Col>
          ))}
        </Row>
        <Row>
          <Col className={`text-center ${styles.footerText}`}>
            <p>
              ETKOT - Etelä-Savon koulutettu tekoäly Memory Labissa -hanke on Euroopan unionin
              osarahoittama. Tuen on myöntänyt Etelä-Savon maakuntaliitto. Hanke toteutetaan Xamkin,
              Kansalliskirjaston ja Suomen Elinkeinoelämän Keskusarkiston (ELKA) yhteishankkeena
              1.9.2024-31.12.2025.
            </p>
            <p>
              <Link className={styles.link} href='/accessibility'>
                Saavutettavuusseloste
              </Link>{' '}
              | © 2025
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
