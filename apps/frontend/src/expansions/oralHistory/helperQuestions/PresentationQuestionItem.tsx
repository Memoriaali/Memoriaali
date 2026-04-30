import { useTranslations } from 'next-intl';
import { Button, Card } from 'react-bootstrap';
import styles from './PresentationQuestionItem.module.css';
import { Question } from './QuestionsList';

interface WithQuestionNumbers {
  questionNo?: number;
  questionsInTotal?: number;
  showPrevious: () => void;
  showNext: () => void;
}

interface PresentationQuestionProps extends WithQuestionNumbers {
  question: Question;
}

const PresentationQuestionItem = ({
  question,
  questionNo,
  questionsInTotal,
  showPrevious,
  showNext,
}: PresentationQuestionProps) => {
  const t = useTranslations('HelperQuestions');

  return (
    <div className={styles.questionContainer}>
      <div className={styles.questionNo}>
        {questionNo} / {questionsInTotal}
      </div>

      <Card className={styles.questionCard}>
        <Card.Body>
          <div>{questionNo}.</div>
          <p>{question.text}</p>
        </Card.Body>
      </Card>

      <div className={styles.buttonsContainer}>
        <Button variant='secondary' hidden={questionNo === 1} onClick={showPrevious}>
          {t('previous')}
        </Button>
        <Button
          variant='primary'
          hidden={questionNo === questionsInTotal}
          className={styles.buttonRight}
          onClick={showNext}
        >
          {t('next')}
        </Button>
      </div>
    </div>
  );
};

export default PresentationQuestionItem;
