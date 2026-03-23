import { useEffect } from 'react'
import { useExamTimer } from '@/app/hooks/use-exam-hooks'
import { AlertCircle, Clock } from 'lucide-react'

interface ExamTimerProps {
  initialTimeRemainingSeconds: number
  onTimeUp: () => void
  isActive: boolean
}

export function ExamTimer({ initialTimeRemainingSeconds, onTimeUp, isActive }: ExamTimerProps) {
  const { minutes, seconds, start } = useExamTimer(initialTimeRemainingSeconds, onTimeUp)

  // Auto-start timer when isActive becomes true
  useEffect(() => {
    if (isActive) {
      start()
    }
  }, [isActive, start])

  const isWarning = minutes < 5
  const isCritical = minutes < 1

  return (
    <div className={`p-4 rounded-lg border-2 ${
      isCritical ? 'border-zinc-950 bg-zinc-950' : isWarning ? 'border-zinc-300 bg-zinc-100' : 'border-zinc-200 bg-white'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className={`w-5 h-5 ${isCritical ? 'text-white' : 'text-zinc-700'}`} />
        <span className={`font-semibold ${isCritical ? 'text-white' : 'text-zinc-700'}`}>
          Time Remaining
        </span>
      </div>

      <div className={`text-4xl font-mono font-bold mb-3 ${
        isCritical ? 'text-white' : 'text-zinc-950'
      }`}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      {isCritical && (
        <div className="mb-3 flex items-center gap-2 text-sm text-zinc-200">
          <AlertCircle className="w-4 h-4" />
          <span>Less than 1 minute remaining</span>
        </div>
      )}
    </div>
  )
}
