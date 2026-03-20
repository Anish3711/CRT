"use client"

import { useState } from "react"
import { use } from "react"
import Link from "next/link"
import { Plus, Pencil, Trash2, CheckCircle2, ArrowLeft, Loader2, WifiOff, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useExamQuestions, useExam } from "@/hooks/use-data"
import type { MCQQuestion } from "@/lib/api-client"

export default function ExamQuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: examId } = use(params)
  const { data: exam } = useExam(examId)
  const { data: questions, isLoading, mutate } = useExamQuestions(examId)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingQ, setEditingQ] = useState<MCQQuestion | null>(null)
  const [saving, setSaving] = useState(false)

  const [qText, setQText] = useState("")
  const [optA, setOptA] = useState("")
  const [optB, setOptB] = useState("")
  const [optC, setOptC] = useState("")
  const [optD, setOptD] = useState("")
  const [correct, setCorrect] = useState<"A" | "B" | "C" | "D">("A")

  // AI Generation state
  const [isAIOpen, setIsAIOpen] = useState(false)
  const [aiTopic, setAiTopic] = useState("")
  const [aiCount, setAiCount] = useState("5")
  const [aiDifficulty, setAiDifficulty] = useState("medium")
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState("")

  const resetForm = () => {
    setQText("")
    setOptA("")
    setOptB("")
    setOptC("")
    setOptD("")
    setCorrect("A")
  }

  const openEdit = (q: MCQQuestion) => {
    setEditingQ(q)
    setQText(q.questionText)
    setOptA(q.optionA)
    setOptB(q.optionB)
    setOptC(q.optionC)
    setOptD(q.optionD)
    setCorrect(q.correctAnswer)
    setIsCreateOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const body = {
      questionText: qText,
      optionA: optA,
      optionB: optB,
      optionC: optC,
      optionD: optD,
      correctAnswer: correct,
    }

    try {
      if (editingQ) {
        await fetch(`/api/exams/${examId}/questions/${editingQ.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        await fetch(`/api/exams/${examId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
      await mutate()
    } catch (err) {
      console.error("Failed to save question:", err)
    }

    setSaving(false)
    setIsCreateOpen(false)
    setEditingQ(null)
    resetForm()
  }

  const handleDelete = async (qId: string) => {
    try {
      await fetch(`/api/exams/${examId}/questions/${qId}`, { method: "DELETE" })
      await mutate()
    } catch (err) {
      console.error("Failed to delete question:", err)
    }
  }

  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) return
    setGenerating(true)
    setAiError("")
    try {
      const res = await fetch('/api/generate/mcq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, count: parseInt(aiCount), difficulty: aiDifficulty }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')

      // Save each generated question
      for (const q of data.questions) {
        await fetch(`/api/exams/${examId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(q),
        })
      }
      await mutate()
      setIsAIOpen(false)
      setAiTopic("")
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate questions')
    } finally {
      setGenerating(false)
    }
  }

  const questionList = Array.isArray(questions) ? questions : []

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/exams">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Question Bank
          </h1>
          <p className="text-sm text-muted-foreground">
            {exam?.title ?? `Exam ${examId}`} - MCQ Questions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAIOpen(true)}
            className="border-primary text-primary hover:bg-primary/10"
          >
            <Sparkles className="mr-2 size-4" />
            Generate with AI
          </Button>
          <Button
            onClick={() => {
              resetForm()
              setEditingQ(null)
              setIsCreateOpen(true)
            }}
          >
            <Plus className="mr-2 size-4" />
            Add MCQ
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">
            MCQ Questions ({questionList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {questionList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <WifiOff className="mb-3 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No questions yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add MCQ questions to this exam&apos;s question bank
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Question</TableHead>
                  <TableHead className="text-muted-foreground">Correct</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questionList.map((q) => (
                  <TableRow key={q.id} className="border-border">
                    <TableCell className="max-w-md">
                      <p className="font-medium text-card-foreground">{q.questionText}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {(["A", "B", "C", "D"] as const).map((opt) => (
                          <span
                            key={opt}
                            className={`text-xs px-2 py-0.5 rounded ${
                              q.correctAnswer === opt
                                ? "bg-chart-2/15 text-chart-2"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {opt}: {q[`option${opt}` as keyof MCQQuestion] as string}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-chart-2/15 text-chart-2 border-chart-2/30" variant="outline">
                        <CheckCircle2 className="mr-1 size-3" />
                        {q.correctAnswer}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(q)} aria-label="Edit question">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(q.id)} aria-label="Delete question">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { setEditingQ(null); resetForm() } }}>
        <DialogContent className="max-w-lg border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>{editingQ ? "Edit Question" : "Add MCQ Question"}</DialogTitle>
            <DialogDescription>
              {editingQ ? "Update the question below" : "Create a new multiple choice question for this exam"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Question Text</Label>
              <Textarea value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Enter your question" className="bg-secondary text-foreground" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {([
                { label: "Option A", value: optA, setter: setOptA },
                { label: "Option B", value: optB, setter: setOptB },
                { label: "Option C", value: optC, setter: setOptC },
                { label: "Option D", value: optD, setter: setOptD },
              ] as const).map(({ label, value, setter }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <Label className="text-xs text-foreground">{label}</Label>
                  <Input value={value} onChange={(e) => setter(e.target.value)} placeholder={label} className="bg-secondary text-foreground" />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Correct Answer</Label>
              <Select value={correct} onValueChange={(v: "A" | "B" | "C" | "D") => setCorrect(v)}>
                <SelectTrigger className="bg-secondary text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="border-border bg-card text-card-foreground">
                  <SelectItem value="A">Option A</SelectItem>
                  <SelectItem value="B">Option B</SelectItem>
                  <SelectItem value="C">Option C</SelectItem>
                  <SelectItem value="D">Option D</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingQ(null); resetForm() }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!qText || !optA || !optB || !optC || !optD || saving}>
              {saving ? "Saving..." : editingQ ? "Update" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    <Dialog open={isAIOpen} onOpenChange={setIsAIOpen}>
        <DialogContent className="border-border bg-card sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="size-5 text-primary" />
              Generate with AI
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
             {aiError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive border border-destructive/20">
                  {aiError}
                </div>
              )}
            <div className="space-y-2">
              <Label className="text-foreground">Topic</Label>
              <Input
                placeholder="e.g. Arrays in Python or React Hooks"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="bg-secondary text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Count</Label>
                <Select value={aiCount} onValueChange={setAiCount}>
                  <SelectTrigger className="bg-secondary text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card text-card-foreground">
                    <SelectItem value="1">1 Question</SelectItem>
                    <SelectItem value="3">3 Questions</SelectItem>
                    <SelectItem value="5">5 Questions</SelectItem>
                    <SelectItem value="10">10 Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Difficulty</Label>
                <Select value={aiDifficulty} onValueChange={setAiDifficulty}>
                  <SelectTrigger className="bg-secondary text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card text-card-foreground">
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIOpen(false)} disabled={generating}>
              Cancel
            </Button>
            <Button onClick={handleAIGenerate} disabled={generating || !aiTopic.trim()}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Questions"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
