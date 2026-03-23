import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { type Question } from '@/lib/supabase'
import { Check, Circle, AlertCircle } from 'lucide-react'

interface QuestionNavigatorProps {
  questions: Question[]
  currentQuestionIndex: number
  answeredQuestions: Set<string>
  onSelectQuestion: (index: number) => void
  onSubmitExam: () => void
}

export function QuestionNavigator({
  questions,
  currentQuestionIndex,
  answeredQuestions,
  onSelectQuestion,
  onSubmitExam,
}: QuestionNavigatorProps) {
  const unansweredCount = questions.length - answeredQuestions.size

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="mb-2 font-semibold text-zinc-950">Questions</h3>
        <div className="space-y-1 text-sm text-zinc-500">
          <div>
            Total: <span className="font-semibold text-zinc-950">{questions.length}</span>
          </div>
          <div>
            Answered: <span className="font-semibold text-zinc-950">{answeredQuestions.size}</span>
          </div>
          <div>
            Remaining: <span className="font-semibold text-zinc-950">{unansweredCount}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-2">
        {questions.map((question, index) => {
          const isAnswered = answeredQuestions.has(question.id)
          const isCurrent = index === currentQuestionIndex

          return (
            <Button
              key={question.id}
              onClick={() => onSelectQuestion(index)}
              variant="ghost"
              className={`w-full justify-start gap-2 h-auto py-2 px-3 ${
                isCurrent
                  ? 'border border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800'
                  : isAnswered
                    ? 'border border-zinc-200 bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                    : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {isAnswered ? (
                <Check className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="flex-1 text-left text-sm">
                Q {index + 1}
              </span>
              {question.question_type === 'coding' && (
                <Badge className="border-zinc-200 bg-zinc-100 text-xs text-zinc-700">Code</Badge>
              )}
            </Button>
          )
        })}
      </div>

      <div className="space-y-2 border-t border-zinc-200 pt-4">
        {unansweredCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100 p-2 text-sm text-zinc-700">
            <AlertCircle className="w-4 h-4" />
            <span>{unansweredCount} question{unansweredCount !== 1 ? 's' : ''} unanswered</span>
          </div>
        )}
        <Button
          onClick={onSubmitExam}
          className="w-full bg-zinc-950 text-white hover:bg-zinc-800"
        >
          Submit Exam
        </Button>
      </div>
    </div>
  )
}
