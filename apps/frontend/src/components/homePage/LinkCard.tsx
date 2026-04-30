'use client';

import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Card from 'react-bootstrap/Card';

import styles from './LinkCard.module.css';

//import placeholder from '../../image/homepage/placeholder-square.png';
import linkCard from '../../image/homepage/linkCard.png';

interface LinkCardProps {
  title: string;
  icon: IconDefinition;
  path: string;
}

//TODO: check authentication for links

const LinkCard = ({ title, icon, path }: LinkCardProps) => {
  const { locale } = useParams();

  return (
    <Link href={`/${locale}/${path}`} className={styles.link}>
      <Card
        className={styles.card}
        style={{
          backgroundImage: `url(${linkCard.src})`,
        }}
      >
        <Card.Body>
          <Card.Text className={styles.cardText}>
            <FontAwesomeIcon icon={icon} />
          </Card.Text>
          <Card.Title className={styles.cardTitle}>{title}</Card.Title>
        </Card.Body>
      </Card>
    </Link>
  );
};

export default LinkCard;
