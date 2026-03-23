export const MCQ_POINTS = 1
export const CODING_POINTS = 20

export function getQuestionPoints(questionType: 'mcq' | 'coding' | string) {
  return questionType === 'coding' ? CODING_POINTS : MCQ_POINTS
}

export function calculateMaximumScore(
  questions: Array<{ question_type: 'mcq' | 'coding' | string }>
) {
  return questions.reduce((total, question) => total + getQuestionPoints(question.question_type), 0)
}
