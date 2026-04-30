'use client';

import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import OtpCodeInput from './OtpCodeInput';

interface VerifyUserModalProps {
  show: boolean;
  onHide: () => void;
  setActivationSuccess: (message: string) => void;
}

const VerifyUserModal: React.FC<VerifyUserModalProps> = ({
  show,
  onHide,
  setActivationSuccess,
}) => {
  const t = useTranslations('Login');
  const { activateUserAccount } = useAuth();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setError(null);
    setLoading(true);

    try {
      await activateUserAccount(email, code);
      setActivationSuccess(t('activationSuccess'));
      onHide();
    } catch (error: unknown) {
      // Handle different error scenarios
      if (error instanceof Error) {
        const message = error.message;
        console.error('Activation error:', message);

        if (
          message === 'User not found with this email' ||
          message === 'Invalid verification code'
        ) {
          setError(t('activationFailed'));
        } else {
          setError(t('unexpectedError'));
        }
      } else {
        setError(t('unexpectedError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{t('accountVerificationNeeded')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{t('accountNotVerified')}</p>

        {error && <Alert variant='danger'>{error}</Alert>}

        <Form.Group>
          <Form.Label className='mt-3'>{t('email')}</Form.Label>
          <Form.Control
            type='email'
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Form.Group>

        <Form.Label className='mt-3'>{t('verificationCode')}</Form.Label>
        {/*<div className={styles.codeInputContainer}>
          <ReactCodeInput
            type='text'
            fields={6}
            name='verificationCode'
            inputMode='url'
            value={code}
            onChange={(value) => setCode(value)}
          />
        </div>*/}

        <OtpCodeInput
          value={code}
          onChange={(next) => setCode(next)}
          length={6}
          name='verificationCode'
          autoFocus
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant='secondary' onClick={onHide}>
          {t('close')}
        </Button>
        <Button
          variant='primary'
          onClick={handleVerify}
          disabled={loading || !email || code.length !== 6}
        >
          {loading ? t('verifying') : t('verifyAccount')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default VerifyUserModal;
