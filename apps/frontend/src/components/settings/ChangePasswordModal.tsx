import { useAuth } from '@/hooks/useAuth';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { SubmitHandler, useForm } from 'react-hook-form';
import styles from './ChangePasswordModal.module.css';

interface ChangePasswordModalProps {
  showChangePasswordModal: boolean;
  handleCloseChangePasswordModal: () => void;
  onUpdateSuccess: (_message: string) => void;
  onUpdateError: (_message: string) => void;
}

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  passwordAgain: string;
}

const ChangePasswordModal = ({
  showChangePasswordModal,
  handleCloseChangePasswordModal,
  onUpdateSuccess,
}: ChangePasswordModalProps) => {
  const t = useTranslations('Settings');
  const { updateUserPassword } = useAuth();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // React-hook-form (validation and data collection)
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<ChangePasswordFormData>({ mode: 'onSubmit' });

  const closeModalAndReset = () => {
    reset();
    setSubmitError(null);
    handleCloseChangePasswordModal();
  };

  const onSubmit: SubmitHandler<ChangePasswordFormData> = async (data) => {
    try {
      const { currentPassword = '', newPassword = '', passwordAgain = '' } = data;

      const updatePasswordData = {
        currentPassword,
        newPassword,
      };

      if (newPassword === passwordAgain) {
        await updateUserPassword(updatePasswordData);
        onUpdateSuccess(t('successMessage'));
        closeModalAndReset();
      } else {
        setSubmitError(t('passwordMismatch'));
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        const message = error.message;
        if (message === 'User not found') {
          router.push('/login');
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
    <Modal show={showChangePasswordModal} onHide={closeModalAndReset} size='lg' centered>
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('changePassword')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleCloseChangePasswordModal}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body className={styles.modalBg}>
          <Form.Group>
            <Form.Label className={styles.formLabel}>{t('enterCurrentPassword')}</Form.Label>
            <Form.Control
              type='password'
              placeholder={t('passwordPlaceholder')}
              {...register('currentPassword', { required: true })}
            />
            {errors.currentPassword && (
              <span className={styles.validationErrorText}>{t('passwordRequired')}</span>
            )}
          </Form.Group>

          <Form.Group>
            <Form.Label className={styles.formLabel}>{t('newPassword')}</Form.Label>
            <Form.Control
              type='password'
              placeholder={t('passwordPlaceholder')}
              {...register('newPassword', { required: true })}
            />
            {errors.newPassword && (
              <span className={styles.validationErrorText}>{t('passwordRequired')}</span>
            )}
          </Form.Group>

          <Form.Group>
            <Form.Label className={styles.formLabel}>{t('repeatNewPassword')}</Form.Label>
            <Form.Control
              type='password'
              placeholder={t('passwordPlaceholder')}
              {...register('passwordAgain', {
                required: t('passwordAgainRequired'),
                validate: (value) => value === watch('newPassword') || t('passwordMismatch'),
              })}
            />
            {isSubmitted && errors.passwordAgain && (
              <span className={styles.validationErrorText}>{errors.passwordAgain.message}</span>
            )}
          </Form.Group>
        </Modal.Body>

        <Modal.Footer className={styles.modalBg}>
          {submitError}
          <Button
            variant='secondary'
            onClick={() => {
              closeModalAndReset();
            }}
          >
            {t('cancel')}
          </Button>
          <Button variant='primary' type='submit'>
            {t('changePassword')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
