'use client';
import { useAuth } from '@/hooks/useAuth';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { SubmitHandler, useForm } from 'react-hook-form';
import styles from './EditUsersInfoModal.module.css';

interface EditUsersInfoModalProps {
  showEditUsersInfoModal: boolean;
  handleCloseEditUsersInfoModal: () => void;
  onUpdateSuccess: (_message: string) => void;
  onUpdateError: (_message: string) => void;
}

interface EditUserInfoFormData {
  userName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  accountType?: 'PRIVATE' | 'COMPANY';
  streetAddress?: string;
  postalCode?: string;
  postOffice?: string;
  telephone?: string;
  profession?: string;
  companyName?: string;
  companyEmail?: string;
  companyTelephone?: string;
  companyContactPerson?: string;
}

const EditUsersInfoModal = ({
  showEditUsersInfoModal,
  handleCloseEditUsersInfoModal,
  onUpdateSuccess,
  onUpdateError,
}: EditUsersInfoModalProps) => {
  const t = useTranslations('Settings');
  const { user, updateCurrentUser } = useAuth();
  const router = useRouter();
  const [userAccountType, setUserAccountType] = useState<'PRIVATE' | 'COMPANY'>('COMPANY');

  // Is the registered user in company use
  const [showCompanyForm, setShowCompanyForm] = useState<boolean>(true);
  const isCompany = () => {
    setUserAccountType('COMPANY');
    setShowCompanyForm(false);
  };
  const isNotCompany = () => {
    setUserAccountType('PRIVATE');
    setShowCompanyForm(true);
  };

  // React-hook-form (validation and data collection)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditUserInfoFormData>();

  const onSubmit: SubmitHandler<EditUserInfoFormData> = async (data) => {
    try {
      const {
        firstName = undefined,
        lastName = undefined,
        streetAddress = undefined,
        postalCode = undefined,
        postOffice = undefined,
        telephone = undefined,
        profession = undefined,
        companyName = undefined,
        companyEmail = undefined,
        companyTelephone = undefined,
        companyContactPerson = undefined,
      } = data;

      const normalize = (value: string | undefined) =>
        value && value.trim() !== '' ? value : undefined;

      const updateUserData = {
        accountType: userAccountType,
        firstName: normalize(firstName),
        lastName: normalize(lastName),
        streetAddress: normalize(streetAddress),
        postalCode: normalize(postalCode),
        postOffice: normalize(postOffice),
        telephone: normalize(telephone),
        profession: normalize(profession),
        companyName: normalize(companyName),
        companyEmail: normalize(companyEmail),
        companyTelephone: normalize(companyTelephone),
        companyContactPerson: normalize(companyContactPerson),
      };

      await updateCurrentUser(updateUserData);
      handleCloseEditUsersInfoModal();
      onUpdateSuccess(t('infoUpdateSuccess'));
    } catch (error: unknown) {
      // Handle different error scenarios
      if (error instanceof Error) {
        const message = error.message;
        console.error('Update error:', message);

        // If session is expired, redirect to login page
        if (
          message === 'Authentication required' ||
          message === 'Invalid or expired authentication token'
        ) {
          router.push('/login?error=sessionExpired');
          return;
        }
        // TODO: Define required fields according to final validation schema
        //  else if (message === 'Name cannot be empty') {
        //  console.error(t('invalidDataError'));}

        // Generic error message for other error cases
        onUpdateError(t('unexpectedError'));
      } else {
        onUpdateError(t('unexpectedError'));
      }
    }
  };

  return (
    <Modal show={showEditUsersInfoModal} onHide={handleCloseEditUsersInfoModal} size='lg' centered>
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('editYourInfoTitle')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleCloseEditUsersInfoModal}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      {/* TODO: Define required fields according to final validation schema */}
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body className={styles.modalBg}>
          <Form.Group controlId='username'>
            <Form.Label className={styles.formLabel}>
              * {t('username')} - {t('notEditable')}
            </Form.Label>

            <Form.Control defaultValue={user?.username} disabled readOnly />

            {errors.userName && (
              <span className={styles.validationErrorText}>{t('usernameRequired')}</span>
            )}
          </Form.Group>
          <Form.Group controlId='email'>
            <Form.Label className={styles.formLabel}>
              * {t('email')} - {t('notEditable')}
            </Form.Label>
            <Form.Control defaultValue={user?.email} disabled readOnly />
            {errors.email?.type === 'required' && (
              <span className={styles.validationErrorText}>{t('emailRequired')}</span>
            )}
            {errors.email?.type === 'pattern' && (
              <span className={styles.validationErrorText}>{t('emailInvalid')}</span>
            )}
          </Form.Group>
          <Row>
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label className={styles.formLabel}>{t('firstName')}</Form.Label>
                <Form.Control
                  defaultValue={user?.firstName}
                  placeholder={t('firstName')}
                  {...register('firstName')}
                />
                {errors.firstName?.type === 'required' && (
                  <span className={styles.validationErrorText}>{t('firstnameRequired')}</span>
                )}
              </Form.Group>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label className={styles.formLabel}>{t('lastName')}</Form.Label>
                <Form.Control
                  defaultValue={user?.lastName}
                  placeholder={t('lastName')}
                  {...register('lastName')}
                />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group>
            <Form.Label className={styles.formLabel}>{t('streetAddress')}</Form.Label>
            <Form.Control
              defaultValue={user?.streetAddress}
              placeholder={t('streetAddress')}
              {...register('streetAddress')}
            />
          </Form.Group>
          <Row>
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label className={styles.formLabel}>{t('zipCode')}</Form.Label>
                <Form.Control
                  defaultValue={user?.postalCode}
                  placeholder={t('zipCode')}
                  {...register('postalCode')}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label className={styles.formLabel}>{t('municipality')}</Form.Label>
                <Form.Control
                  defaultValue={user?.postOffice}
                  placeholder={t('municipality')}
                  {...register('postOffice')}
                />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group>
            <Form.Label className={styles.formLabel}>{t('telephone')}</Form.Label>
            <Form.Control
              defaultValue={user?.telephone}
              placeholder='0401234567'
              {...register('telephone')}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label className={styles.formLabel}>{t('profession')}</Form.Label>
            <Form.Control
              defaultValue={user?.profession}
              placeholder={t('profession')}
              {...register('profession')}
            />
          </Form.Group>
          <br />
          <Form.Group role='radiogroup' aria-labelledby='account-purpose-label'>
            <Form.Label id='account-purpose-label' className={styles.formLabel}>
              {t('accountPurpose')}
            </Form.Label>

            <Form.Check
              id='company-radio-private'
              type='radio'
              name='company-radio'
              label={t('privateAccount')}
              checked={showCompanyForm}
              onChange={isNotCompany}
            />

            <Form.Check
              id='company-radio-company'
              type='radio'
              name='company-radio'
              label={t('companyAccount')}
              checked={!showCompanyForm}
              onChange={isCompany}
            />
          </Form.Group>

          <div hidden={showCompanyForm ? true : false}>
            <Form.Group>
              <Form.Label className={styles.formLabel}>{t('companyName')}</Form.Label>
              <Form.Control
                defaultValue={user?.companyName}
                placeholder={t('companyName')}
                {...register('companyName')}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className={styles.formLabel}>{t('companyEmail')}</Form.Label>
              <Form.Control
                defaultValue={user?.companyEmail}
                placeholder='esimerkki@esimerkki.fi'
                {...register('companyEmail')}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className={styles.formLabel}>{t('companyTelephone')}</Form.Label>
              <Form.Control
                defaultValue={user?.companyTelephone}
                placeholder='0401234567'
                {...register('companyTelephone')}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className={styles.formLabel}>{t('companyContactPerson')}</Form.Label>
              <Form.Control
                defaultValue={user?.companyContactPerson}
                placeholder={t('companyContactPerson')}
                {...register('companyContactPerson')}
              />
            </Form.Group>
          </div>
          <br />
        </Modal.Body>
        <Modal.Footer className={styles.modalBg}>
          <Button variant='secondary' onClick={handleCloseEditUsersInfoModal}>
            {t('cancel')}
          </Button>
          <Button variant='primary' type='submit'>
            {t('saveInfo')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditUsersInfoModal;
