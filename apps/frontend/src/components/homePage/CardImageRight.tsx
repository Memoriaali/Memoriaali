'use client';

import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Col, Row } from 'react-bootstrap';
import Card from 'react-bootstrap/Card';

import styles from './CardImageRight.module.css';

interface CardImageRightProps {
  title: string;
  text: string;
  image: string;
  buttonText: string;
  buttonPath: string | undefined;
}

const CardImageRight: React.FC<CardImageRightProps> = ({
  title,
  text,
  image,
  buttonText,
  buttonPath,
}) => {
  const { locale } = useParams();
  return (
    <Card className={styles.card}>
      <Row className={styles.cardTextCenter}>
        <Col xs={12} sm={7} md={8}>
          <Card.Body>
            <Card.Title className={styles.cardTitle}>
              {title} <FontAwesomeIcon icon={faCircleInfo} />
            </Card.Title>
            <span>
              {text.split('/n').map((line, index) => (
                <p key={index}>{line.trim()}</p>
              ))}
            </span>
            {buttonPath ? (
              <Link href={`/${locale}/${buttonPath}`}>
                <Button variant='primary' size='lg'>
                  {buttonText}
                </Button>
              </Link>
            ) : null}
          </Card.Body>
        </Col>
        <Col xs={12} sm={5} md={4}>
          <Card.Img src={image} className={styles.cardImage} alt={title} />
        </Col>
      </Row>
    </Card>
  );
};

export default CardImageRight;
