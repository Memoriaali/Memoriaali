'use client';

import InstructionsGrid from '@/components/instructions/InstructionsGrid';
import { useAuth } from '@/hooks/useAuth';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, Button, Col, Container, Form, Row } from 'react-bootstrap';
import { SubmitHandler, useForm } from 'react-hook-form';
import styles from './page.module.css';
import VerifyUserModal from './VerifyUserModal';

type LoginFormInputs = {
  userName: string;
  password: string;
};

const LoginPage: React.FC = () => {
  const { locale } = useParams();

  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const t = useTranslations('Login');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>();

  // Access authentication context
  const { login } = useAuth();

  // State for handling submission errors
  const [submitError, setSubmitError] = useState<string | null>(null);

  // State for successfull activation
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  // Verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'registration') {
      setSuccessMessage(t('registrationSuccess'));
    }
  }, [searchParams, t]);

  // Display error message if user session has expired
  useEffect(() => {
    if (error === 'sessionExpired') {
      setSubmitError(t('authenticationError'));
    }
  }, [error, t]);

  // Form submission handler and connection to authentication
  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setSubmitError(null);
    try {
      // Attempt to log in the user
      await login(data.userName, data.password);

      const next = searchParams.get('next');
      router.push(next ?? `/${locale}`);
      router.refresh();
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };
        if (statusCode === 400) {
          setSubmitError(t('invalidCredentials'));
        } else if (statusCode === 401) {
          setSubmitError(t('invalidCredentials'));
        } else if (statusCode === 403) {
          setShowVerifyModal(true);
        } else {
          setSubmitError(t('unexpectedError'));
        }
      }
    }
  };

  return (
    <Container>
      <Row>
        <Col xs={12} md={6} className={`${styles['columns']} ${styles['column-left']}`}>
          <h2 className={styles['header-text']}>
            {t('loginHeader')} <FontAwesomeIcon icon={faCircleInfo} />
          </h2>

          <Form onSubmit={handleSubmit(onSubmit)}>
            {submitError && <Alert variant='danger'>{submitError}</Alert>}
            {activationSuccess && <Alert variant='success'>{activationSuccess}</Alert>}
            {successMessage && <Alert variant='success'>{successMessage}</Alert>}
            <Form.Group>
              <Form.Label className={styles['form-label']}>{t('usernameOrEmailLabel')}</Form.Label>
              <Form.Control
                placeholder={t('emailPlaceholder')}
                className={styles['form-control']}
                {...register('userName', { required: true })}
              />
              {errors.userName && (
                <span className={styles['validation-error-text']}>{t('usernameOrEmailError')}</span>
              )}
            </Form.Group>
            <Form.Group>
              <Form.Label className={styles['form-label']}>{t('passwordLabel')}</Form.Label>
              <Form.Control
                type='password'
                placeholder={t('passwordPlaceholder')}
                className={styles['form-control']}
                {...register('password', { required: true })}
              />
              {errors.password && (
                <span className={styles['validation-error-text']}>{t('passwordError')}</span>
              )}
            </Form.Group>
            <Link href={`/${locale}/forgot-password`}>{t('forgotUsernamePasswordLink')}</Link>{' '}
            <br />
            <Button
              className={styles['button']}
              variant='primary'
              type='submit'
              disabled={isSubmitting}
            >
              {t('loginButton')}
            </Button>
          </Form>
        </Col>

        <Col className={styles.columns} xs={12} md={6}>
          <h2 className={styles.headerText}>
            {t('newUserHeader')} <FontAwesomeIcon icon={faCircleInfo} />
          </h2>
          <Link href={`/${locale}/register`}>
            <Button size='lg'>{t('registerButton')}</Button>
          </Link>
        </Col>
      </Row>
      <InstructionsGrid />
      <VerifyUserModal
        show={showVerifyModal}
        onHide={() => setShowVerifyModal(false)}
        setActivationSuccess={setActivationSuccess}
      />
    </Container>
  );
};

export default LoginPage;
