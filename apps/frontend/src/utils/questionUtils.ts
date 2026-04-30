import { Question } from '@/expansions/oralHistory/helperQuestions/QuestionsList';

export const reorder = <T extends Question>(
  list: T[],
  startIndex: number,
  endIndex: number,
): T[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);

  if (!removed) {
    return result;
  }

  result.splice(endIndex, 0, removed);
  result.forEach((object, i) => (object.sortIndex = i + 1));

  return result;
};
