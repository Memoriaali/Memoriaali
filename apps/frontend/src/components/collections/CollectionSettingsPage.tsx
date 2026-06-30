'use client';

import sideNavStyles from '@/components/sideNav/SideNavPageContent.module.css';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import {
  Button,
  Card,
  CardBody,
  Container,
  Form,
  FormGroup,
  InputGroup,
  Table,
} from 'react-bootstrap';
import styles from '../collections/CollectionSettingsPage.module.css';
import ContainerSideNav from '../sideNav/Container-SideNav';
import ContentHeader from '../sideNav/ContentHeader';

const CollectionSettingsPage: React.FC = () => {
  const t = useTranslations('Collections');

  return (
    <ContainerSideNav>
      <Container className={sideNavStyles.sidenavPageContent}>
        <ContentHeader headerText={t('collectionTools')} />

        <Card className={styles.card}>
          <CardBody>
            <h4>{t('createNewCollection')}</h4>

            <Form>
              <FormGroup>
                <Form.Label className={styles.formLabel}>{t('enterCollectionName')}</Form.Label>
                <Form.Control
                  placeholder={t('enterCollectionName')}
                  className={styles.formControl}
                />
              </FormGroup>

              <FormGroup>
                <Form.Label className={styles.formLabel}>{t('describeCollection')}</Form.Label>
                <Form.Control
                  as='textarea'
                  placeholder={t('describeCollectionPlaceholder')}
                  className={styles.formControl}
                />
              </FormGroup>

              <Button>{t('createNewCollection')}</Button>
            </Form>
          </CardBody>
        </Card>

        <Card className={styles.card}>
          <CardBody>
            <h4>{t('manageCollections')}</h4>

            <Form.Label htmlFor='chooseCollection' className={styles.inputLabel}>
              {t('selectCollection')}
            </Form.Label>

            <Form.Select
              id='chooseCollection'
              aria-label={t('selectCollection')}
              className={styles.inputMargin}
            >
              <option>{t('selectCollectionPlaceholder')}</option>
              <option value='Kokoelma 1'>Kokoelma 1</option>
            </Form.Select>

            <Button className={styles.btnButton}>{t('deleteSelectedCollection')}</Button>

            <br />

            <Form.Label htmlFor='rename' className={styles.inputLabel}>
              {t('renameCollection')}
            </Form.Label>

            <InputGroup className={styles.inputMargin}>
              <Form.Control
                placeholder={t('renameCollection')}
                aria-label={t('renameCollection')}
                id='rename'
              />
              <Button variant='primary'>{t('rename')}</Button>
            </InputGroup>

            <h4>{t('manageCollectionFiles')}</h4>

            <Table striped bordered hover responsive variant='light'>
              <thead>
                <tr>
                  <th>{t('file')}</th>
                  <th>{t('keywords')}</th>
                  <th>{t('removeFromCollection')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.settingsTd}>391102-E2V-pk.pdf</td>
                  <td className={styles.settingsTd}>
                    asiasana1, asiasana2, asiasana3, asiasana4, asiasana5, asiasana6, asiasana7,
                    asiasana8, asiasana9, asiasana10
                  </td>
                  <td className={`${styles.settingsTd} ${styles.settingsTdCenter}`}>
                    <FontAwesomeIcon icon={faTrash} />
                  </td>
                </tr>
                <tr>
                  <td className={styles.settingsTd}>391102-E2V-pk.pdf</td>
                  <td className={styles.settingsTd}>
                    asiasana1, asiasana2, asiasana3, asiasana4, asiasana5, asiasana6, asiasana7,
                    asiasana8, asiasana9, asiasana10
                  </td>
                  <td className={`${styles.settingsTd} ${styles.settingsTdCenter}`}>
                    <FontAwesomeIcon icon={faTrash} />
                  </td>
                </tr>
                <tr>
                  <td className={styles.settingsTd}>391102-E2V-pk.pdf</td>
                  <td className={styles.settingsTd}>
                    asiasana1, asiasana2, asiasana3, asiasana4, asiasana5, asiasana6, asiasana7,
                    asiasana8, asiasana9, asiasana10
                  </td>
                  <td className={`${styles.settingsTd} ${styles.settingsTdCenter}`}>
                    <FontAwesomeIcon icon={faTrash} />
                  </td>
                </tr>
              </tbody>
            </Table>

            <h4>{t('addFilesToCollection')}</h4>

            <Button className={styles.btnButton}>{t('addSelectedFiles')}</Button>

            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>{t('select')}</th>
                  <th>{t('file')}</th>
                  <th>{t('keywords')}</th>
                  <th>{t('addToCollection')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`${styles.settingsTd} ${styles.settingsTdCenter}`}>
                    <Form.Check // prettier-ignore
                      type='checkbox'
                    />
                  </td>
                  <td className={styles.settingsTd}>391102-E2V-pk.pdf</td>
                  <td className={styles.settingsTd}>
                    asiasana1, asiasana2, asiasana3, asiasana4, asiasana5, asiasana6, asiasana7,
                    asiasana8, asiasana9, asiasana10
                  </td>
                  <td className={`${styles.settingsTd} ${styles.settingsTdCenter}`}>
                    <Button>{t('addToCollection')}</Button>
                  </td>
                </tr>
                <tr>
                  <td className={`${styles.settingsTd} ${styles.settingsTdCenter}`}>
                    <Form.Check // prettier-ignore
                      type='checkbox'
                    />
                  </td>
                  <td className={styles.settingsTd}>391102-E2V-pk.pdf</td>
                  <td className={styles.settingsTd}>
                    asiasana1, asiasana2, asiasana3, asiasana4, asiasana5, asiasana6, asiasana7,
                    asiasana8, asiasana9, asiasana10
                  </td>
                  <td className={`${styles.settingsTd} ${styles.settingsTdCenter}`}>
                    <Button>{t('addToCollection')}</Button>
                  </td>
                </tr>
                <tr>
                  <td className={`${styles.settingsTd} ${styles.settingsTdCenter}`}>
                    <Form.Check // prettier-ignore
                      type='checkbox'
                    />
                  </td>
                  <td className={styles.settingsTd}>391102-E2V-pk.pdf</td>
                  <td className={styles.settingsTd}>
                    asiasana1, asiasana2, asiasana3, asiasana4, asiasana5, asiasana6, asiasana7,
                    asiasana8, asiasana9, asiasana10
                  </td>
                  <td className={`${styles.settingsTd} ${styles.settingsTdCenter}`}>
                    <Button>{t('addToCollection')}</Button>
                  </td>
                </tr>
              </tbody>
            </Table>
          </CardBody>
        </Card>
      </Container>
    </ContainerSideNav>
  );
};

export default CollectionSettingsPage;
