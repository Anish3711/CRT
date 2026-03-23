'use client'

import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { type Question, type MCQOption } from '@/lib/supabase'

interface MCQQuestionProps {
  question: Question
  options: MCQOption[]
  selectedOptionId?: string
  onOptionSelect: (optionId: string) => void
  onAutoSave?: () => void
}

export function MCQQuestion({
  question,
  options,
  selectedOptionId,
  onOptionSelect,
  onAutoSave,
}: MCQQuestionProps) {
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)

    autoSaveTimerRef.current = setTimeout(() => {
      onAutoSave?.()
    }, 5000) // Auto-save every 5 seconds

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [selectedOptionId, onAutoSave])

  const difficultyColors: Record<string, string> = {
    easy: 'bg-green-900 text-green-200',
    medium: 'bg-yellow-900 text-yellow-200',
    hard: 'bg-red-900 text-red-200',
  }

  return (
    <Card className="select-none bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-white text-lg mb-2">{question.question_text}</CardTitle>
            <div className="flex gap-2">
              <Badge className={difficultyColors[question.difficulty]}>
                {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
              </Badge>
              <Badge className="bg-blue-900 text-blue-200">
                {question.points} point{question.points !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <RadioGroup value={selectedOptionId || ''} onValueChange={onOptionSelect} className="space-y-3">
          {options.map((option) => (
            <div 
              key={option.id}
              className="flex items-center space-x-4 p-4 rounded-lg border-2 border-slate-600 hover:border-blue-500 hover:bg-slate-700/70 transition-all cursor-pointer"
            >
              <RadioGroupItem value={option.id} id={`option-${option.id}`} className="border-slate-400 mt-1" />
              <Label
                htmlFor={`option-${option.id}`}
                className="flex-1 text-slate-200 cursor-pointer"
              >
                <span className="font-semibold text-blue-400 mr-3">{option.option_key}.</span>
                <span className="text-base">{option.option_text}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="mt-6 p-3 bg-slate-700/50 rounded text-slate-400 text-sm">
          Your answer will be auto-saved every 5 seconds
        </div>
      </CardContent>
    </Card>
  )
}
