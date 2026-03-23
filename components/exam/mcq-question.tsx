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
    easy: 'border-zinc-200 bg-zinc-100 text-zinc-700',
    medium: 'border-zinc-300 bg-zinc-200 text-zinc-800',
    hard: 'border-zinc-900 bg-zinc-900 text-white',
  }

  return (
    <Card className="select-none border-zinc-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="mb-2 text-lg text-zinc-950">{question.question_text}</CardTitle>
            <div className="flex gap-2">
              <Badge className={difficultyColors[question.difficulty]}>
                {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
              </Badge>
              <Badge className="border-zinc-900 bg-zinc-900 text-white">
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
              className={`flex cursor-pointer items-center space-x-4 rounded-lg border p-4 transition-colors ${
                selectedOptionId === option.id
                  ? 'border-zinc-900 bg-zinc-100'
                  : 'border-zinc-200 bg-white hover:border-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <RadioGroupItem value={option.id} id={`option-${option.id}`} className="mt-1 border-zinc-400 text-zinc-900" />
              <Label
                htmlFor={`option-${option.id}`}
                className="flex-1 cursor-pointer text-zinc-900"
              >
                <span className="mr-3 font-semibold text-zinc-500">{option.option_key}.</span>
                <span className="text-base">{option.option_text}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
          Your answer will be auto-saved every 5 seconds
        </div>
      </CardContent>
    </Card>
  )
}
