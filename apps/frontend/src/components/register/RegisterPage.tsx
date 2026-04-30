'use client';

import InstructionsGrid from '@/components/instructions/InstructionsGrid';
import { useAuth } from '@/hooks/useAuth';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useRef, useState } from 'react';
import { Alert, Button, Col, Container, Form, Row } from 'react-bootstrap';
import { SubmitHandler, useForm } from 'react-hook-form';
import styles from './page.module.css';

interface RegisterFormData {
  accountType: 'PRIVATE' | 'COMPANY';
  username: string;
  email: string;
  password: string;
  passwordAgain: string;
  firstName?: string;
  lastName?: string;
  streetAddress?: string;
  postalCode?: string;
  postOffice?: string;
  telephone?: string;
  profession?: string;
  companyName?: string;
  companyEmail?: string;
  companyTelephone?: string;
  companyContactPerson?: string;
  acceptTerms: boolean;
}

const RegisterPage: React.FC = () => {
  const { locale } = useParams();
  const router = useRouter();
  const t = useTranslations('Register');

  // User wants to/ doesn't want to add user information now
  const [showUserForm, setShowUserForm] = useState<boolean>(true);
  const addUserInfo = () => {
    setShowUserForm(false);
  };
  const dontAddUserInfo = () => {
    setShowUserForm(true);
  };

  // Is the registered user in company use
  const [showCompanyForm, setShowCompanyForm] = useState<boolean>(true);
  const [accountType, setAccountType] = useState<'PRIVATE' | 'COMPANY'>('PRIVATE');
  const isCompany = () => {
    setShowCompanyForm(false);
    setAccountType('COMPANY');
  };
  const isNotCompany = () => {
    setShowCompanyForm(true);
    setAccountType('PRIVATE');
  };

  // React-hook-form (validation and data collection)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = useRef({});
  password.current = watch('password', '');

  // Connect to auth context and handle form submit
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { registerUser } = useAuth();
  const onSubmit: SubmitHandler<RegisterFormData> = async (data) => {
    setSubmitError(null);
    try {
      const {
        username,
        email,
        password,
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

      const userData = {
        username,
        email,
        password,
        role: 'USER' as const,
        accountType,
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

      await registerUser(userData);

      router.push(`/${locale}/login?success=registration`);
      router.refresh();
    } catch (error) {
      // Handle different error scenarios
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
    <Container>
      <Row>
        <Col xs={12} md={6} className={`${styles.columns} ${styles.columnLeft}`}>
          <h2 className={styles.headerText}>
            {t('registerHeader')}
            <FontAwesomeIcon icon={faCircleInfo} />
          </h2>

          <Form onSubmit={handleSubmit(onSubmit)}>
            {submitError && <Alert variant='danger'>{submitError}</Alert>}
            <Form.Group>
              <Form.Label className={styles.formLabel}>{t('usernameLabel')}</Form.Label>
              <Form.Control
                placeholder={t('usernamePlaceholder')}
                className={styles.formControl}
                {...register('username', { required: true })}
              />
              {errors.username && (
                <span className={styles.validationErrorText}>{t('usernameError')}</span>
              )}
            </Form.Group>
            <Form.Group>
              <Form.Label className={styles.formLabel}>{t('emailLabel')}</Form.Label>
              <Form.Control
                placeholder={t('emailPlaceholder')}
                className={styles.formControl}
                {...register('email', {
                  required: true,
                  pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                })}
              />
              {errors.email?.type === 'required' && (
                <span className={styles.validationErrorText}>{t('emailRequiredError')}</span>
              )}
              {errors.email?.type === 'pattern' && (
                <span className={styles.validationErrorText}>{t('emailPatternError')}</span>
              )}
            </Form.Group>
            <Form.Group>
              <Form.Label className={styles.formLabel}>{t('passwordLabel')}</Form.Label>
              <Form.Control
                type='password'
                placeholder={t('passwordPlaceholder')}
                className={styles.formControl}
                {...register('password', { required: true, minLength: 8 })}
              />
              {errors.password?.type === 'required' && (
                <span className={styles.validationErrorText}>{t('passwordRequiredError')}</span>
              )}
              {errors.password?.type === 'minLength' && (
                <span className={styles.validationErrorText}>{t('passwordMinLengthError')}</span>
              )}
            </Form.Group>
            <Form.Group>
              <Form.Label className={styles.formLabel}>{t('passwordAgainLabel')}</Form.Label>
              <Form.Control
                type='password'
                placeholder={t('passwordAgainPlaceholder')}
                className={styles.formControl}
                {...register('passwordAgain', {
                  required: true,
                  validate: (value) => value === password.current || t('passwordMatchError'),
                })}
              />
              {errors.passwordAgain?.type === 'required' && (
                <span className={styles.validationErrorText}>
                  {t('passwordAgainRequiredError')}
                </span>
              )}
              {errors.passwordAgain && (
                <span className={styles.validationErrorText}>
                  {`${errors.passwordAgain.message}`}
                </span>
              )}
            </Form.Group>
            <Form.Group role='radiogroup' aria-labelledby='add-user-info-label'>
              <Form.Label id='add-user-info-label' className={styles.formLabel}>
                {t('addUserInfoLabel')}
              </Form.Label>

              <Form.Check
                id='user-info-radio-yes'
                type='radio'
                name='user-info-radio'
                label={t('addUserInfoYes')}
                checked={!showUserForm}
                onChange={addUserInfo}
              />

              <Form.Check
                id='user-info-radio-no'
                type='radio'
                name='user-info-radio'
                label={t('addUserInfoNo')}
                checked={showUserForm}
                onChange={dontAddUserInfo}
              />
            </Form.Group>
            <div hidden={showUserForm ? true : false}>
              <Row>
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className={styles.formLabel}>{t('firstNameLabel')}</Form.Label>
                    <Form.Control
                      placeholder={t('firstNamePlaceholder')}
                      className={styles.formControl}
                      {...register('firstName')}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className={styles.formLabel}>{t('lastNameLabel')}</Form.Label>
                    <Form.Control
                      placeholder={t('lastNamePlaceholder')}
                      className={styles.formControl}
                      {...register('lastName')}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group>
                <Form.Label className={styles.formLabel}>{t('streetAddressLabel')}</Form.Label>
                <Form.Control
                  placeholder={t('streetAddressPlaceholder')}
                  className={styles.formControl}
                  {...register('streetAddress')}
                />
              </Form.Group>

              <Row>
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className={styles.formLabel}>{t('zipCodeLabel')}</Form.Label>
                    <Form.Control
                      placeholder={t('zipCodePlaceholder')}
                      className={styles.formControl}
                      {...register('postalCode')}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className={styles.formLabel}>{t('municipalityLabel')}</Form.Label>
                    <Form.Control
                      placeholder={t('municipalityPlaceholder')}
                      className={styles.formControl}
                      {...register('postOffice')}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group>
                <Form.Label className={styles.formLabel}>{t('telephoneLabel')}</Form.Label>
                <Form.Control
                  placeholder={t('telephonePlaceholder')}
                  className={styles.formControl}
                  {...register('telephone')}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label className={styles.formLabel}>{t('professionLabel')}</Form.Label>
                <Form.Control
                  placeholder={t('professionPlaceholder')}
                  className={styles.formControl}
                  {...register('profession')}
                />
              </Form.Group>
            </div>
            <br />
            <Form.Group role='radiogroup' aria-labelledby='account-purpose-label'>
              <Form.Label id='account-purpose-label' className='register-form-label'>
                {t('accountPurposeLabel')}
              </Form.Label>

              <Form.Check
                id='company-radio-private'
                type='radio'
                name='company-radio'
                label={t('privateAccountLabel')}
                checked={showCompanyForm}
                onChange={isNotCompany}
              />

              <Form.Check
                id='company-radio-company'
                type='radio'
                name='company-radio'
                label={t('companyAccountLabel')}
                checked={!showCompanyForm}
                onChange={isCompany}
              />
            </Form.Group>

            <div hidden={showCompanyForm ? true : false}>
              <Form.Group>
                <Form.Label className={styles.formLabel}>{t('companyNameLabel')}</Form.Label>
                <Form.Control
                  placeholder={t('companyNamePlaceholder')}
                  className={styles.formControl}
                  {...register('companyName')}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label className={styles.formLabel}>{t('companyEmailLabel')}</Form.Label>
                <Form.Control
                  placeholder={t('companyEmailPlaceholder')}
                  className={styles.formControl}
                  {...register('companyEmail')}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label className={styles.formLabel}>{t('companyTelephoneLabel')}</Form.Label>
                <Form.Control
                  placeholder={t('companyTelephonePlaceholder')}
                  className={styles.formControl}
                  {...register('companyTelephone')}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label className={styles.formLabel}>
                  {t('companyContactPersonLabel')}
                </Form.Label>
                <Form.Control
                  placeholder={t('companyContactPersonPlaceholder')}
                  className={styles.formControl}
                  {...register('companyContactPerson')}
                />
              </Form.Group>
            </div>
            <br />
            <Form.Group>
              <Form.Check
                id='accept-terms-switch'
                type='switch'
                label={
                  <>
                    {t('acceptTermsLabel')} <Link href='/register'>{t('acceptTermsLink')}</Link>
                  </>
                }
                {...register('acceptTerms', { required: true })}
              />

              {errors.acceptTerms && (
                <span className={styles.validationErrorText}>{t('acceptTermsError')}</span>
              )}
            </Form.Group>

            <Button className={styles.button} variant='primary' type='submit'>
              {t('createAccountButton')}
            </Button>
          </Form>
        </Col>
        <Col className={styles.columns} xs={12} md={6}>
          <h2 className={styles.headerText}>
            {t('existingUserHeader')}
            <FontAwesomeIcon icon={faCircleInfo} />
          </h2>
          <Link href={`/${locale}/login`}>
            <Button size='lg'>{t('loginButton2')}</Button>
          </Link>
        </Col>
      </Row>

      <InstructionsGrid />
    </Container>
  );
};

export default RegisterPage;
