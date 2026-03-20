import { useEffect } from 'react'
import { useExamTimer } from '@/app/hooks/use-exam-hooks'
import { AlertCircle, Clock } from 'lucide-react'

interface ExamTimerProps {
  durationMinutes: number
  onTimeUp: () => void
  isActive: boolean
}

export function ExamTimer({ durationMinutes, onTimeUp, isActive }: ExamTimerProps) {
  const { minutes, seconds, start } = useExamTimer(durationMinutes, onTimeUp)

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
      isCritical ? 'bg-red-900/50 border-red-600' : isWarning ? 'bg-yellow-900/50 border-yellow-600' : 'bg-slate-700 border-slate-600'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className={`w-5 h-5 ${isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-blue-400'}`} />
        <span className={`font-semibold ${isCritical ? 'text-red-200' : isWarning ? 'text-yellow-200' : 'text-slate-200'}`}>
          Time Remaining
        </span>
      </div>

      <div className={`text-4xl font-mono font-bold mb-3 ${
        isCritical ? 'text-red-300' : isWarning ? 'text-yellow-300' : 'text-white'
      }`}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      {isCritical && (
        <div className="flex items-center gap-2 text-red-200 text-sm mb-3">
          <AlertCircle className="w-4 h-4" />
          <span>Less than 1 minute remaining</span>
        </div>
      )}
    </div>
  )
}
