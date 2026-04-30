'use client';

import InstructionsGrid from '@/components/instructions/InstructionsGrid';
import { useAuth } from '@/hooks/useAuth';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Col, Container, Form, Row } from 'react-bootstrap';
import { SubmitHandler, useForm } from 'react-hook-form';
import styles from './page.module.css';

type ForgotPasswordFormInput = {
  email: string;
};

const ForgotPasswordPage: React.FC = () => {
  useParams();
  const t = useTranslations('Login');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormInput>();

  // Access authentication context
  const { sendPasswordResetEmail } = useAuth();

  // State for handling submission errors
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState('');

  // Form submission handler and connection to authentication
  const onSubmit: SubmitHandler<ForgotPasswordFormInput> = async (data) => {
    setSubmitError(null);
    try {
      await sendPasswordResetEmail(data.email);
      // Alwaus display success message to prevent email enumeration attacks
      setSuccessMessage(t('passwordResetLinkSent'));
    } catch {
      // TODO: Fix error hiding code smell
      setSubmitError(t('unexpectedError'));
    }
  };

  return (
    <Container>
      <Row>
        <Col xs={12} md={6} className={`${styles['columns']} ${styles['column-left']}`}>
          <h2 className={styles['header-text']}>
            {t('forgotUsernamePasswordLink')} <FontAwesomeIcon icon={faCircleInfo} />
          </h2>

          <p className={styles['instructionText']}>{t('forgotPasswordText')}</p>

          <Form onSubmit={handleSubmit(onSubmit)}>
            {submitError && <Alert variant='danger'>{submitError}</Alert>}
            {successMessage && <Alert variant='success'>{successMessage}</Alert>}
            <Form.Group>
              <Form.Label className={styles['form-label']}>{t('email')}</Form.Label>
              <Form.Control
                placeholder={t('emailPlaceholder')}
                className={styles['form-control']}
                {...register('email', {
                  required: true,
                  pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                })}
              />
              {errors.email?.type === 'required' && (
                <span className={styles['validation-error-text']}>{t('emailRequiredError')}</span>
              )}
              {errors.email?.type === 'pattern' && (
                <span className={styles['validation-error-text']}>{t('emailPatternError')}</span>
              )}
            </Form.Group>

            <Button
              className={styles['button']}
              variant='primary'
              type='submit'
              disabled={isSubmitting}
            >
              {t('sendResetLink')}
            </Button>
          </Form>
        </Col>
        <Col className={styles.columns} xs={12} md={6}>
          <Button className={styles['button']} variant='primary' href='/login'>
            {t('returnToLogin')}
          </Button>
        </Col>
      </Row>
      <InstructionsGrid />
    </Container>
  );
};

export default ForgotPasswordPage;
