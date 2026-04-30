import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Card } from 'react-bootstrap';

import styles from './InstructionsCard.module.css';

interface InstructionsCardProps {
  icon: IconProp;
  title: string;
  text: string;
}

const InstructionsCard = ({ icon, title, text }: InstructionsCardProps) => {
  return (
    <Card className={styles.card}>
      <Card.Body>
        <Card.Text className={styles.card_text}>
          <FontAwesomeIcon icon={icon} />
        </Card.Text>
        <Card.Title className={styles.cardTitle}>{title}</Card.Title>
        <Card.Text className={styles.cardText}>{text}</Card.Text>
      </Card.Body>
    </Card>
  );
};

export default InstructionsCard;
