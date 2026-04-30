import { Document as DocumentType } from '@/lib/api/generated/types.gen';
import { Col, Row } from 'react-bootstrap';
import FilesCard from '../files/FilesCard';

export interface CardData {
  id: string;
  doc: DocumentType;
}

interface UsersFilesGridProps {
  checkedCards: Record<string, boolean>;
  onCheckboxChange: (id: string, checked: boolean) => void;
  cardData: CardData[];
  pathName: string;
  handleShowMessage: (message: string) => void;
}

const UsersFilesGrid = ({
  checkedCards,
  onCheckboxChange,
  cardData,
  pathName,
  handleShowMessage,
}: UsersFilesGridProps) => {
  return (
    <Row>
      {cardData.map((card: CardData) => (
        <Col xs={6} sm={6} md={4} lg={3} key={card.id} className='mb-3'>
          <FilesCard
            id={card.id}
            doc={card.doc}
            isChecked={checkedCards[card.id] ?? false}
            onCheckboxChange={onCheckboxChange}
            pathName={pathName}
            handleShowMessage={handleShowMessage}
          />
        </Col>
      ))}
    </Row>
  );
};

export default UsersFilesGrid;
