'use client';

import { useTranslations } from 'next-intl';
import { Container } from 'react-bootstrap';
import styles from './accessibility.module.css';

export default function Accessibility() {
  const t = useTranslations();

  return (
    <Container>
      <h1 className={styles.title}>Saavutettavuusseloste - Digitalia teema</h1>
      <p className={styles.text}>
        Tämä saavutettavuusseloste koskee palvelua https://memoriaali.memorylab.fi ja on laadittu /
        päivitetty 23.3.2026. Palvelua koskee laki digitaalisten palvelujen tarjoamisesta, jossa
        edellytetään, että julkisten verkkopalvelujen on oltava saavutettavia. Olemme arvioineet
        palvelun saavutettavuuden itse.
      </p>
      <h2 className={styles.secondaryTitle}>Digipalvelun saavutettavuuden tila</h2>
      <p className={styles.text}>Täyttää saavutettavuusvaatimukset</p>
      <h2 className={styles.secondaryTitle}>Anna palautetta</h2>
      <p className={styles.text}>
        Jos havaitset saavutettavuusongelmia tässä digipalvelussa, ota yhteyttä sähköpostitse
        osoitteeseen: stina.westman(at)xamk.fi tai puhelimitse numeroon: 050 524 8599
      </p>
    </Container>
  );
}
