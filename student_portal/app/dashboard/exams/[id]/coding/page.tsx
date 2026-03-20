"use client"

import { useState } from "react"
import { use } from "react"
import Link from "next/link"
import { Plus, Pencil, Trash2, Eye, EyeOff, Code2, ArrowLeft, Loader2, WifiOff, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useExamCoding, useExam } from "@/hooks/use-data"
import type { CodingProblem, TestCase } from "@/lib/api-client"

const ALL_LANGUAGES = ["python", "java", "cpp", "javascript"]

export default function ExamCodingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: examId } = use(params)
  const { data: exam } = useExam(examId)
  const { data: problems, isLoading, mutate } = useExamCoding(examId)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingP, setEditingP] = useState<CodingProblem | null>(null)
  const [viewProblem, setViewProblem] = useState<CodingProblem | null>(null)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [inputFmt, setInputFmt] = useState("")
  const [outputFmt, setOutputFmt] = useState("")
  const [constraints, setConstraints] = useState("")
  const [sampleIn, setSampleIn] = useState("")
  const [sampleOut, setSampleOut] = useState("")
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["python"])
  const [timeLimit, setTimeLimit] = useState("2")
  const [memLimit, setMemLimit] = useState("256")
  const [testCases, setTestCases] = useState<TestCase[]>([])

  // AI Generation state
  const [isAIOpen, setIsAIOpen] = useState(false)
  const [aiTopic, setAiTopic] = useState("")
  const [aiDifficulty, setAiDifficulty] = useState("medium")
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState("")
  const [formError, setFormError] = useState("")

  const resetForm = () => {
    setTitle(""); setDesc(""); setInputFmt(""); setOutputFmt("")
    setConstraints(""); setSampleIn(""); setSampleOut("")
    setSelectedLanguages(["python"]); setTimeLimit("2"); setMemLimit("256"); setTestCases([])
    setFormError("")
  }

  const openEdit = (p: CodingProblem) => {
    setEditingP(p); setTitle(p.title); setDesc(p.description)
    setInputFmt(p.inputFormat); setOutputFmt(p.outputFormat)
    setConstraints(p.constraints); setSampleIn(p.sampleInput); setSampleOut(p.sampleOutput)
    setSelectedLanguages(p.allowedLanguages.length > 0 ? p.allowedLanguages : ["python"]); setTimeLimit(String(p.timeLimit))
    setMemLimit(String(p.memoryLimit)); setTestCases([...p.testCases])
    setIsCreateOpen(true)
  }

  const toggleLanguage = (language: string) => {
    setSelectedLanguages((current) => {
      if (current.includes(language)) {
        return current.length === 1 ? current : current.filter((value) => value !== language)
      }
      return [...current, language]
    })
  }

  const addTestCase = (isHidden: boolean) => {
    setTestCases([...testCases, { id: `tc-${Date.now()}`, input: "", expectedOutput: "", isHidden }])
  }

  const updateTestCase = (id: string, field: "input" | "expectedOutput", value: string) => {
    setTestCases(testCases.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc)))
  }

  const removeTestCase = (id: string) => {
    setTestCases(testCases.filter((tc) => tc.id !== id))
  }

  const handleSave = async () => {
    setSaving(true)
    setFormError("")
    const body = {
      title, description: desc, inputFormat: inputFmt, outputFormat: outputFmt,
      constraints, sampleInput: sampleIn, sampleOutput: sampleOut,
      allowedLanguages: selectedLanguages, timeLimit: Number(timeLimit),
      memoryLimit: Number(memLimit), testCases,
    }
    try {
      const response = editingP
        ? await fetch(`/api/exams/${examId}/coding/${editingP.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          })
        : await fetch(`/api/exams/${examId}/coding`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          })

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || "Failed to save coding problem")
      }

      await mutate()
      setSaving(false)
      setIsCreateOpen(false)
      setEditingP(null)
      resetForm()
      return
    } catch (err) {
      console.error("Failed to save problem:", err)
      setFormError(err instanceof Error ? err.message : "Failed to save problem")
    }
    setSaving(false)
  }

  const handleDelete = async (pId: string) => {
    try {
      await fetch(`/api/exams/${examId}/coding/${pId}`, { method: "DELETE" })
      await mutate()
    } catch (err) {
      console.error("Failed to delete:", err)
    }
  }

  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) return
    setGenerating(true)
    setAiError("")
    try {
      const res = await fetch('/api/generate/coding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, difficulty: aiDifficulty }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')

      // Save generated problem
      const saveResponse = await fetch(`/api/exams/${examId}/coding`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.problem),
      })
      const saveResult = await saveResponse.json().catch(() => null)
      if (!saveResponse.ok) throw new Error(saveResult?.error || "Failed to save generated problem")
      
      await mutate()
      setIsAIOpen(false)
      setAiTopic("")
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate problem')
    } finally {
      setGenerating(false)
    }
  }

  const problemList = Array.isArray(problems) ? problems : []

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
          <Link href="/dashboard/exams"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Coding Problems</h1>
          <p className="text-sm text-muted-foreground">{exam?.title ?? `Exam ${examId}`} - Coding Challenges</p>
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
          <Button onClick={() => { resetForm(); setEditingP(null); setIsCreateOpen(true) }}>
            <Plus className="mr-2 size-4" />Create Problem
          </Button>
        </div>
      </div>

      {problemList.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <WifiOff className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No coding problems yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Add coding challenges to this exam</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {problemList.map((p) => (
            <Card key={p.id} className="border-border bg-card">
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Code2 className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-card-foreground">{p.title}</CardTitle>
                    <CardDescription className="mt-1">{p.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={() => setViewProblem(p)} aria-label="View"><Eye className="size-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(p)} aria-label="Edit"><Pencil className="size-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(p.id)} aria-label="Delete"><Trash2 className="size-3.5" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Languages:</span>
                    {p.allowedLanguages.map((lang: string) => (
                      <Badge key={lang} variant="outline" className="border-border text-xs text-muted-foreground">{lang}</Badge>
                    ))}
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-xs text-muted-foreground">
                    {p.testCases.filter((testCase: TestCase) => !testCase.isHidden).length} sample + {p.testCases.filter((testCase: TestCase) => testCase.isHidden).length} hidden
                  </span>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-xs text-muted-foreground">Time: {p.timeLimit}s | Memory: {p.memoryLimit}MB</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewProblem} onOpenChange={() => setViewProblem(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-card text-card-foreground">
          {viewProblem && (
            <>
              <DialogHeader>
                <DialogTitle>{viewProblem.title}</DialogTitle>
                <DialogDescription>{viewProblem.description}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-secondary p-3">
                    <p className="text-xs font-medium text-muted-foreground">Input Format</p>
                    <p className="mt-1 text-sm text-foreground">{viewProblem.inputFormat}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary p-3">
                    <p className="text-xs font-medium text-muted-foreground">Output Format</p>
                    <p className="mt-1 text-sm text-foreground">{viewProblem.outputFormat}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-secondary p-3">
                  <p className="text-xs font-medium text-muted-foreground">Constraints</p>
                  <p className="mt-1 font-mono text-sm text-foreground">{viewProblem.constraints}</p>
                </div>
                <Separator />
                <div>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Sample Test Cases</h3>
                  <Table>
                    <TableHeader><TableRow className="border-border hover:bg-transparent"><TableHead className="text-muted-foreground">Input</TableHead><TableHead className="text-muted-foreground">Expected</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {viewProblem.testCases.filter((tc: TestCase) => !tc.isHidden).map((tc: TestCase) => (
                        <TableRow key={tc.id} className="border-border"><TableCell className="font-mono text-sm text-card-foreground">{tc.input}</TableCell><TableCell className="font-mono text-sm text-card-foreground">{tc.expectedOutput}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground"><EyeOff className="size-4 text-chart-5" />Hidden Test Cases</h3>
                  <Table>
                    <TableHeader><TableRow className="border-border hover:bg-transparent"><TableHead className="text-muted-foreground">Input</TableHead><TableHead className="text-muted-foreground">Expected</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {viewProblem.testCases.filter((tc: TestCase) => tc.isHidden).map((tc: TestCase) => (
                        <TableRow key={tc.id} className="border-border"><TableCell className="font-mono text-sm text-chart-5">{tc.input}</TableCell><TableCell className="font-mono text-sm text-chart-5">{tc.expectedOutput}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { setEditingP(null); resetForm() } }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>{editingP ? "Edit Coding Problem" : "Create Coding Problem"}</DialogTitle>
            <DialogDescription>{editingP ? "Update the problem" : "Define a new coding challenge with test cases"}</DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="rounded-md border border-destructive/20 bg-destructive/15 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Problem Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Two Sum" className="bg-secondary text-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the problem..." className="bg-secondary text-foreground" rows={3} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2"><Label className="text-foreground">Input Format</Label><Textarea value={inputFmt} onChange={(e) => setInputFmt(e.target.value)} className="bg-secondary text-foreground" rows={2} /></div>
              <div className="flex flex-col gap-2"><Label className="text-foreground">Output Format</Label><Textarea value={outputFmt} onChange={(e) => setOutputFmt(e.target.value)} className="bg-secondary text-foreground" rows={2} /></div>
            </div>
            <div className="flex flex-col gap-2"><Label className="text-foreground">Constraints</Label><Input value={constraints} onChange={(e) => setConstraints(e.target.value)} className="bg-secondary text-foreground" /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2"><Label className="text-foreground">Sample Input</Label><Input value={sampleIn} onChange={(e) => setSampleIn(e.target.value)} className="bg-secondary font-mono text-foreground" /></div>
              <div className="flex flex-col gap-2"><Label className="text-foreground">Sample Output</Label><Input value={sampleOut} onChange={(e) => setSampleOut(e.target.value)} className="bg-secondary font-mono text-foreground" /></div>
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Allowed Languages</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_LANGUAGES.map((value) => {
                  const isSelected = selectedLanguages.includes(value)
                  return (
                    <Button
                      key={value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      className="capitalize"
                      onClick={() => toggleLanguage(value)}
                    >
                      {value === "cpp" ? "C++" : value}
                    </Button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Select one or more languages. Students can switch between them during the exam.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2"><Label className="text-foreground">Time Limit (s)</Label><Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} className="bg-secondary text-foreground" /></div>
              <div className="flex flex-col gap-2"><Label className="text-foreground">Memory Limit (MB)</Label><Input type="number" value={memLimit} onChange={(e) => setMemLimit(e.target.value)} className="bg-secondary text-foreground" /></div>
            </div>
            <Separator />
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Sample Test Cases</h3>
                <Button variant="outline" size="sm" onClick={() => addTestCase(false)}><Plus className="mr-1 size-3" /> Add</Button>
              </div>
              {testCases.filter((tc) => !tc.isHidden).map((tc) => (
                <div key={tc.id} className="mb-2 flex items-center gap-2">
                  <Input placeholder="Input" value={tc.input} onChange={(e) => updateTestCase(tc.id, "input", e.target.value)} className="bg-secondary font-mono text-foreground" />
                  <Input placeholder="Expected" value={tc.expectedOutput} onChange={(e) => updateTestCase(tc.id, "expectedOutput", e.target.value)} className="bg-secondary font-mono text-foreground" />
                  <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeTestCase(tc.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground"><EyeOff className="size-4 text-chart-5" /> Hidden Test Cases</h3>
                <Button variant="outline" size="sm" onClick={() => addTestCase(true)}><Plus className="mr-1 size-3" /> Add</Button>
              </div>
              {testCases.filter((tc) => tc.isHidden).map((tc) => (
                <div key={tc.id} className="mb-2 flex items-center gap-2">
                  <Input placeholder="Input" value={tc.input} onChange={(e) => updateTestCase(tc.id, "input", e.target.value)} className="bg-secondary font-mono text-foreground" />
                  <Input placeholder="Expected" value={tc.expectedOutput} onChange={(e) => updateTestCase(tc.id, "expectedOutput", e.target.value)} className="bg-secondary font-mono text-foreground" />
                  <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeTestCase(tc.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingP(null); resetForm() }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title || saving || selectedLanguages.length === 0}>{saving ? "Saving..." : editingP ? "Update" : "Create Problem"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isAIOpen} onOpenChange={setIsAIOpen}>
        <DialogContent className="border-border bg-card sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="size-5 text-primary" />
              Generate Coding Problem
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
             {aiError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive border border-destructive/20">
                  {aiError}
                </div>
              )}
            <div className="space-y-2">
              <Label className="text-foreground">Topic / Scenario</Label>
              <Input
                placeholder="e.g. Graph Traversal or Dynamic Programming"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="bg-secondary text-foreground"
              />
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
                "Generate Problem"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
