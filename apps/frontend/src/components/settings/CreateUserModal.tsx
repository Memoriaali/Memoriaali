import { useAuth } from '@/hooks/useAuth';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { SubmitHandler, useForm } from 'react-hook-form';
import styles from './CreateUserModal.module.css';

interface CreateUserModalProps {
  showCreateUserModal: boolean;
  handleCloseCreateUserModal: () => void;
  handleShowMessage: (text: string) => void;
}

interface CreateUserFormData {
  username: string;
  email: string;
  password: string;
  passwordAgain: string;
}

const CreateUserModal = ({
  showCreateUserModal,
  handleCloseCreateUserModal,
  handleShowMessage,
}: CreateUserModalProps) => {
  const t = useTranslations('Settings');

  // React-hook-form (validation and data collection)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateUserFormData>();

  const password = useRef({});
  password.current = watch('password', '');

  // Connect to auth context and handle form submit
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { registerUser } = useAuth();

  const onSubmit: SubmitHandler<CreateUserFormData> = async (data) => {
    setSubmitError(null);
    try {
      const { username, email, password } = data;

      const userData = {
        username,
        email,
        password,
        role: 'USER' as const,
        accountType: 'PRIVATE' as const,
        firstName: undefined,
        lastName: undefined,
        streetAddress: undefined,
        postalCode: undefined,
        postOffice: undefined,
        telephone: undefined,
        profession: undefined,
        companyName: undefined,
        companyEmail: undefined,
        companyTelephone: undefined,
        companyContactPerson: undefined,
      };

      await registerUser(userData);

      handleShowMessage(t('userCreatedSuccess'));
      reset();
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };
        if (statusCode === 400) {
          setSubmitError(t('passwordComplexityError'));
        } else if (statusCode === 409) {
          setSubmitError(t('usernameTakenError'));
        } else {
          setSubmitError(t('unexpectedError'));
        }
      } else {
        setSubmitError(t('unexpectedError'));
      }
    }
  };

  return (
    <Modal show={showCreateUserModal} onHide={handleCloseCreateUserModal} size='lg' centered>
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('createUserForAnotherPerson')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleCloseCreateUserModal}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body className={styles.modalBg}>
          {submitError && <Alert variant='danger'>{submitError}</Alert>}

          <p className={styles.createUserText}>{t('createUserMessage')}</p>

          <Form.Group>
            <Form.Label className='register-form-label'>* {t('username')}</Form.Label>
            <Form.Control
              placeholder={t('usernamePlaceholder')}
              className='register-form-control'
              {...register('username', { required: true })}
            />
            {errors.username && (
              <span className='register-validation-error-text'>{t('usernameRequired')}</span>
            )}
          </Form.Group>

          <Form.Group>
            <Form.Label className='register-form-label'>* {t('email')}</Form.Label>
            <Form.Control
              placeholder={t('emailPlaceholder')}
              className='register-form-control'
              {...register('email', {
                required: true,
                pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              })}
            />
            {errors.email?.type === 'required' && (
              <span className='register-validation-error-text'>{t('emailRequired')}</span>
            )}
            {errors.email?.type === 'pattern' && (
              <span className='register-validation-error-text'>{t('emailInvalid')}</span>
            )}
          </Form.Group>

          <Form.Group>
            <Form.Label className='register-form-label'>* {t('password')}</Form.Label>
            <Form.Control
              type='password'
              placeholder='********'
              className='register-form-control'
              {...register('password', { required: true, minLength: 8 })}
            />
            {errors.password?.type === 'required' && (
              <span className='register-validation-error-text'>{t('passwordRequired')}</span>
            )}
            {errors.password?.type === 'minLength' && (
              <span className='register-validation-error-text'>{t('passwordMinLength')}</span>
            )}
          </Form.Group>

          <Form.Group>
            <Form.Label className='register-form-label'>* {t('passwordAgain')}</Form.Label>
            <Form.Control
              type='password'
              placeholder='********'
              className='register-form-control'
              {...register('passwordAgain', {
                required: true,
                validate: (value) => value === password.current || t('passwordMismatch'),
              })}
            />
            {errors.passwordAgain?.type === 'required' && (
              <span className='register-validation-error-text'>{t('passwordAgainRequired')}</span>
            )}
            {errors.passwordAgain && (
              <span className='register-validation-error-text'>{`${errors.passwordAgain.message}`}</span>
            )}
          </Form.Group>
        </Modal.Body>

        <Modal.Footer className={styles.modalBg}>
          <Button variant='secondary'>{t('exit')}</Button>
          <Button variant='primary' type='submit'>
            {t('createNewUser')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateUserModal;
