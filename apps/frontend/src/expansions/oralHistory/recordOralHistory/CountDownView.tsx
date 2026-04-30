'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container, Modal } from 'react-bootstrap';
import { CountdownTimer, TimerTick } from '../../../utils/CountdownTimer';
import styles from './CountDownView.module.css';

export interface TimerProps {
  timer: CountdownTimer;
}

const leftPad = (value: number): string => (value < 10 ? `0${value}` : value.toString());

const CountDownTimer = ({ timer }: TimerProps) => {
  const [currentTime, setCurrentTime] = useState<TimerTick | null>(null);

  useEffect(() => {
    const subscription = timer.currentTime.subscribe(setCurrentTime);
    return () => subscription.unsubscribe();
  }, [timer]);

  const counter = useMemo(() => {
    if (!currentTime) return '';

    return currentTime.minutes === 0
      ? currentTime.seconds.toString()
      : `${currentTime.minutes}:${leftPad(currentTime.seconds)}`;
  }, [currentTime]);

  return (
    <Container className={styles.container}>
      <Modal.Title
        className={
          currentTime?.minutes === 0 ? `${styles.counter} ${styles.lessThanMinute}` : styles.counter
        }
      >
        {counter}
      </Modal.Title>
    </Container>
  );
};

export default CountDownTimer;
