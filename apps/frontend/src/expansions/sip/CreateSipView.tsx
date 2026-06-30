'use client';

import { Document as DocumentType } from '@/lib/api/generated/types.gen';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, Card, CardBody, Form, Table } from 'react-bootstrap';

import styles from './CreateSipView.module.css';

interface CreateSipViewProps {
  publicDocuments: DocumentType[];
  handleShow: () => void;
  selectedDocuments: string[];
  setSelectedDocuments: React.Dispatch<React.SetStateAction<string[]>>;
}

const CreateSipView: React.FC<CreateSipViewProps> = ({
  publicDocuments,
  handleShow,
  selectedDocuments,
  setSelectedDocuments,
}) => {
  const t = useTranslations('SipPackageCreation');
  const [open, setOpen] = useState(false);

  return (
    <Card className={styles.card}>
      <CardBody>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <h4>{t('createSipPackage')}</h4>

          <Button onClick={() => setOpen((prev) => !prev)} className={styles.accordionButton}>
            {open ? '▲' : '▼'}
          </Button>
        </div>

        {open && (
          <>
            <Button className={styles.btnButton} onClick={handleShow}>
              {t('createSipPackage')}
            </Button>

            <Table striped bordered hover responsive variant='light'>
              <thead>
                <tr>
                  <th>{t('select')}</th>
                  <th>{t('file')}</th>
                  <th>{t('keywords')}</th>
                </tr>
              </thead>

              <tbody>
                {publicDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td className={styles.settingsTdCenter}>
                      <Form.Check
                        type='checkbox'
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;

                          setSelectedDocuments((prev) =>
                            checked ? [...prev, doc.id] : prev.filter((id) => id !== doc.id),
                          );
                        }}
                      />
                    </td>

                    <td className='mb-3'>{doc.metadata.header}</td>

                    <td>{doc.metadata.subjectIndexing?.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </CardBody>
    </Card>
  );
};

export default CreateSipView;
