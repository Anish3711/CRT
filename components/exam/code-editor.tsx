'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Question, type CodingQuestion, type TestCase } from '@/lib/supabase'
import { Code2, Play, Copy, Check } from 'lucide-react'

interface CodeEditorProps {
  question: Question
  codingQuestion?: CodingQuestion
  testCases: TestCase[]
  code: string
  selectedLanguage: string
  onCodeChange: (code: string) => void
  onLanguageChange: (language: string) => void
  onSubmit: () => Promise<void>
  onAutoSave?: () => void
}

export function CodeEditor({
  question,
  codingQuestion,
  testCases,
  code,
  selectedLanguage,
  onCodeChange,
  onLanguageChange,
  onSubmit,
  onAutoSave,
}: CodeEditorProps) {
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState<{ output?: string; error?: string; exitCode?: number } | null>(null)

  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)

    autoSaveTimerRef.current = setTimeout(() => {
      onAutoSave?.()
    }, 5000)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [code, onAutoSave])

  // Show error state if coding question failed to load
  if (!codingQuestion) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-red-400 text-center py-8">
            <p className="font-semibold mb-2">Error loading coding question</p>
            <p className="text-sm text-slate-400">Unable to load question details. Please refresh the page.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleCopyTemplate = () => {
    if (codingQuestion?.starter_code) {
      onCodeChange(codingQuestion.starter_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const languageMap: Record<string, string> = {
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    javascript: 'JavaScript',
  }
  const allowedLanguages = codingQuestion.allowed_languages?.length
    ? codingQuestion.allowed_languages
    : [codingQuestion.language]

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRunCode = async () => {
    if (!code.trim()) return
    setIsRunning(true)
    setRunResult(null)
    try {
      const sampleInput = testCases.find(tc => tc.is_visible)?.input || testCases[0]?.input || ''
        const res = await fetch('/api/compile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language: selectedLanguage || codingQuestion?.language || 'python',
            input: sampleInput
          })
        })
      const data = await res.json()
      setRunResult(data)
    } catch (err) {
      setRunResult({ error: err instanceof Error ? err.message : 'Failed to connect to compiler' })
    } finally {
      setIsRunning(false)
    }
  }

  const difficultyColors: Record<string, string> = {
    easy: 'bg-green-900 text-green-200',
    medium: 'bg-yellow-900 text-yellow-200',
    hard: 'bg-red-900 text-red-200',
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-white text-lg mb-2 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-purple-400" />
                {question.question_text}
              </CardTitle>
              <div className="flex gap-2">
                <Badge className="bg-purple-900 text-purple-200">
                  {languageMap[codingQuestion?.language] || codingQuestion?.language || 'Code'}
                </Badge>
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

        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Your Code
            </label>
            {allowedLanguages.length > 1 && (
              <div className="mb-3 max-w-xs">
                <Select value={selectedLanguage} onValueChange={onLanguageChange}>
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedLanguages.map((language) => (
                      <SelectItem key={language} value={language}>
                        {languageMap[language] || language}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <textarea
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              placeholder={`Write your ${languageMap[selectedLanguage] || selectedLanguage || 'code'} here...`}
              className="w-full h-64 p-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <div className="mt-2 text-xs text-slate-400">
              Code will auto-save every 5 seconds
            </div>
          </div>

          {codingQuestion?.starter_code && (
            <div>
              <Button
                onClick={handleCopyTemplate}
                variant="outline"
                className="border-slate-600 text-slate-200 hover:bg-slate-700"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied Template
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Template Code
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={handleRunCode}
              disabled={isRunning || !code.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              {isRunning ? 'Running...' : 'Run Code'}
            </Button>
          </div>

          {runResult && (
            <div className="mt-4 p-4 rounded bg-slate-950 border border-slate-700">
              <h4 className="text-sm font-semibold text-slate-200 mb-2">Execution Result</h4>
              {runResult.error ? (
                <div className="text-red-400 font-mono text-sm whitespace-pre-wrap">{runResult.error}</div>
              ) : (
                <div className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                  {runResult.output || 'Code executed successfully with no output.'}
                </div>
              )}
              {runResult.exitCode !== undefined && (
                <div className="mt-2 text-xs text-slate-500">Exit Code: {runResult.exitCode}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {testCases.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Test Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {testCases
                .filter((tc) => tc.is_visible)
                .map((testCase, index) => (
                  <div key={testCase.id} className="p-3 bg-slate-900 rounded border border-slate-600">
                    <div className="text-sm font-semibold text-blue-300 mb-2">
                      Test Case {index + 1}
                    </div>
                    <div className="space-y-2 text-xs text-slate-300 font-mono">
                      <div>
                        <span className="text-slate-400">Input:</span>
                        <div className="mt-1 p-2 bg-slate-800 rounded whitespace-pre-wrap break-words">
                          {testCase.input || testCase.input_data}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Expected Output:</span>
                        <div className="mt-1 p-2 bg-slate-800 rounded whitespace-pre-wrap break-words">
                          {testCase.expected_output}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        <Play className="w-4 h-4 mr-2" />
        {isSubmitting ? 'Submitting...' : 'Submit Solution'}
      </Button>
    </div>
  )
}
