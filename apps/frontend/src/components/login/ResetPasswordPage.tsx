'use client';

import InstructionsGrid from '@/components/instructions/InstructionsGrid';
import { useAuth } from '@/hooks/useAuth';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Col, Container, Form, Row } from 'react-bootstrap';
import { SubmitHandler, useForm } from 'react-hook-form';
import styles from './page.module.css';

type ResetPasswordFormInput = {
  password: string;
  passwordAgain: string;
};

const ResetPasswordPage: React.FC = () => {
  // const { locale: _locale } = useParams();

  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const t = useTranslations('Login');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormInput>();

  // Access authentication context
  const { resetUserPassword } = useAuth();

  // State for handling submission errors
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState('');

  // Form submission handler and connection to authentication
  const onSubmit: SubmitHandler<ResetPasswordFormInput> = async (data) => {
    setSubmitError(null);
    try {
      const { password = '', passwordAgain = '' } = data;

      if (password === passwordAgain) {
        await resetUserPassword(token, data.password);
        setSuccessMessage(t('passwordResetSuccess'));
      } else {
        setSubmitError(t('passwordMismatch'));
      }
    } catch (error: unknown) {
      // Handle different error scenarios
      if (error instanceof Error) {
        const message = error.message;
        setSuccessMessage('');

        if (message === 'Invalid or expired reset token') {
          setSubmitError(t('tokenExpired'));
        } else if (message === 'Current password is incorrect') {
          setSubmitError(t('currentPasswordIncorrect'));
        } else if (message === 'New password must be at least 8 characters') {
          setSubmitError(t('passwordTooShort'));
        } else if (message === 'New password must contain uppercase, lowercase, and number') {
          setSubmitError(t('passwordComplexityError'));
        } else {
          setSubmitError(t('unexpectedError'));
        }
        return;
      }
    }
  };

  return (
    <Container>
      <Row>
        <Col xs={12} md={6} className={`${styles['columns']} ${styles['column-left']}`}>
          <h2 className={styles['header-text']}>
            {t('resetPasswordTitle')}
            <FontAwesomeIcon icon={faCircleInfo} />
          </h2>

          <p className={styles['instructionText']}>{t('resetPasswordText')}</p>

          <Form onSubmit={handleSubmit(onSubmit)}>
            {submitError && <Alert variant='danger'>{submitError}</Alert>}
            {successMessage && <Alert variant='success'>{successMessage}</Alert>}
            <Form.Group>
              <Form.Label className={styles['form-label']}>{t('newPassword')}</Form.Label>
              <Form.Control
                type='password'
                placeholder={t('passwordPlaceholder')}
                className={styles['form-control']}
                {...register('password', { required: t('passwordError') })}
              />
              {errors.password && (
                <span className={styles['validation-error-text']}>{errors.password.message}</span>
              )}
            </Form.Group>
            <Form.Group>
              <Form.Label className={styles['form-label']}>{t('newPasswordAgain')}</Form.Label>
              <Form.Control
                type='password'
                placeholder={t('passwordPlaceholder')}
                className={styles['form-control']}
                {...register('passwordAgain', {
                  required: t('passwordAgainError'),
                  validate: (value) => value === watch('password') || t('passwordMismatch'),
                })}
              />
              {errors.passwordAgain && (
                <span className={styles['validation-error-text']}>
                  {errors.passwordAgain.message}
                </span>
              )}
            </Form.Group>
            <Button
              className={styles['button']}
              variant='primary'
              type='submit'
              disabled={isSubmitting}
            >
              {t('savePassword')}
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

export default ResetPasswordPage;
