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
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 flex flex-col h-full">
      <div className="mb-4">
        <h3 className="font-semibold text-white mb-2">Questions</h3>
        <div className="text-sm text-slate-300 space-y-1">
          <div>
            Total: <span className="text-blue-400 font-semibold">{questions.length}</span>
          </div>
          <div>
            Answered: <span className="text-green-400 font-semibold">{answeredQuestions.size}</span>
          </div>
          <div>
            Remaining: <span className="text-yellow-400 font-semibold">{unansweredCount}</span>
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
                  ? 'bg-blue-600/30 border border-blue-500 text-blue-200'
                  : isAnswered
                    ? 'bg-green-900/30 text-green-200 hover:bg-green-900/50'
                    : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
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
                <Badge className="bg-purple-900 text-purple-200 text-xs">Code</Badge>
              )}
            </Button>
          )
        })}
      </div>

      <div className="space-y-2 border-t border-slate-700 pt-4">
        {unansweredCount > 0 && (
          <div className="flex items-center gap-2 text-yellow-200 text-sm bg-yellow-900/20 p-2 rounded">
            <AlertCircle className="w-4 h-4" />
            <span>{unansweredCount} question{unansweredCount !== 1 ? 's' : ''} unanswered</span>
          </div>
        )}
        <Button
          onClick={onSubmitExam}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Submit Exam
        </Button>
      </div>
    </div>
  )
}
