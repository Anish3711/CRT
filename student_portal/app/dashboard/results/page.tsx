"use client"

import { useState } from "react"
import {
  Trophy, Download, Search, BarChart3, CheckCircle2, XCircle, Loader2, WifiOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { useResults, useCodingSubmissions, useExams } from "@/hooks/use-data"
import type { CodingSubmission } from "@/lib/api-client"

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: "bg-chart-2/15 text-chart-2 border-chart-2/30",
    completed: "bg-chart-3/15 text-chart-3 border-chart-3/30",
    terminated: "bg-destructive/15 text-destructive border-destructive/30",
  }
  return <Badge variant="outline" className={variants[status] || ""}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-chart-2" : score >= 50 ? "bg-chart-3" : "bg-destructive"
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-medium text-card-foreground">{score}%</span>
    </div>
  )
}

export default function ResultsPage() {
  const [filterExam, setFilterExam] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingSubmission, setViewingSubmission] = useState<CodingSubmission | null>(null)

  const examFilter = filterExam !== "all" ? filterExam : undefined
  const { data: results, isLoading } = useResults(examFilter)
  const { data: codingSubs } = useCodingSubmissions(examFilter)
  const { data: exams } = useExams()

  const resultList = Array.isArray(results) ? results : []
  const codingList = Array.isArray(codingSubs) ? codingSubs : []
  const examList = Array.isArray(exams) ? exams : []

  const completedAttempts = resultList.filter((a) => a.status === "completed" || a.status === "terminated")

  const filtered = completedAttempts.filter((a) => {
    if (searchQuery && !a.studentName.toLowerCase().includes(searchQuery.toLowerCase()) && !a.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const completedOnly = completedAttempts.filter((a) => a.status === "completed")
  const avgScore = completedOnly.length > 0 ? Math.round(completedOnly.reduce((acc, a) => acc + a.score, 0) / completedOnly.length) : 0
  const highestScore = Math.max(...completedAttempts.map((a) => a.score), 0)
  const passCount = completedOnly.filter((a) => a.score >= (a.passingScore ?? 60)).length

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  const handleExportCSV = () => {
    if (filtered.length === 0) return

    const headers = ['Student Name', 'Roll Number', 'Exam Name', 'Score', 'Correct Answers', 'Wrong Answers', 'Time Taken', 'Status']
    
    const rows = filtered.map(a => [
      `"${a.studentName}"`,
      `"${a.rollNumber}"`,
      `"${a.examName}"`,
      a.score,
      a.correctAnswers,
      a.wrongAnswers,
      `"${a.timeTaken}"`,
      `"${a.status}"`
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `exam_results_${new Date().getTime()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Results</h1>
          <p className="text-sm text-muted-foreground">View student scores, submissions, and performance</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0}>
          <Download className="mr-2 size-4" />Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            <BarChart3 className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{avgScore}%</div>
            <p className="mt-1 text-xs text-muted-foreground">Average percentage across completed exams</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Highest Score</CardTitle>
            <Trophy className="size-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{highestScore}%</div>
            <p className="mt-1 text-xs text-muted-foreground">Highest percentage score</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pass Rate</CardTitle>
            <CheckCircle2 className="size-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{completedOnly.length > 0 ? Math.round((passCount / completedOnly.length) * 100) : 0}%</div>
            <p className="mt-1 text-xs text-muted-foreground">{passCount} of {completedOnly.length} students met the exam threshold</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-xs text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by name or roll number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-secondary pl-10 text-foreground" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground">Exam</label>
              <Select value={filterExam} onValueChange={setFilterExam}>
                <SelectTrigger className="w-[200px] bg-secondary text-foreground"><SelectValue placeholder="All Exams" /></SelectTrigger>
                <SelectContent className="border-border bg-card text-card-foreground">
                  <SelectItem value="all">All Exams</SelectItem>
                  {examList.map((e) => (<SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-card-foreground">MCQ / Exam Results ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <WifiOff className="mb-3 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="mt-1 text-xs text-muted-foreground">Results will appear when students complete exams</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Student</TableHead>
                  <TableHead className="text-muted-foreground">Exam</TableHead>
                  <TableHead className="text-muted-foreground">Score</TableHead>
                  <TableHead className="text-muted-foreground">Correct</TableHead>
                  <TableHead className="text-muted-foreground">Wrong</TableHead>
                  <TableHead className="text-muted-foreground">Time</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((attempt) => (
                  <TableRow key={attempt.id} className="border-border">
                    <TableCell>
                      <div>
                        <p className="font-medium text-card-foreground">{attempt.studentName}</p>
                        <p className="text-xs text-muted-foreground">{attempt.rollNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">{attempt.examName}</TableCell>
                    <TableCell><ScoreBar score={attempt.score} /></TableCell>
                    <TableCell><span className="flex items-center gap-1 text-sm text-chart-2"><CheckCircle2 className="size-3.5" />{attempt.correctAnswers}</span></TableCell>
                    <TableCell><span className="flex items-center gap-1 text-sm text-destructive"><XCircle className="size-3.5" />{attempt.wrongAnswers}</span></TableCell>
                    <TableCell className="text-muted-foreground">{attempt.timeTaken}</TableCell>
                    <TableCell><StatusBadge status={attempt.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-card-foreground">Coding Submissions ({codingList.length})</CardTitle></CardHeader>
        <CardContent>
          {codingList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <WifiOff className="mb-3 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No coding submissions yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Student</TableHead>
                  <TableHead className="text-muted-foreground">Problem</TableHead>
                  <TableHead className="text-muted-foreground">Language</TableHead>
                  <TableHead className="text-muted-foreground">Tests Passed</TableHead>
                  <TableHead className="text-muted-foreground">Exec Time</TableHead>
                  <TableHead className="text-muted-foreground">Memory</TableHead>
                  <TableHead className="text-right text-muted-foreground">Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codingList.map((sub) => (
                  <TableRow key={sub.id} className="border-border">
                    <TableCell className="font-medium text-card-foreground">{sub.studentName}</TableCell>
                    <TableCell className="text-muted-foreground">{sub.problemTitle}</TableCell>
                    <TableCell><Badge variant="outline" className="border-border text-muted-foreground">{sub.language}</Badge></TableCell>
                    <TableCell><span className={sub.testCasesFailed === 0 ? "text-chart-2" : "text-chart-5"}>{sub.testCasesPassed}/{sub.testCasesPassed + sub.testCasesFailed}</span></TableCell>
                    <TableCell className="text-muted-foreground">{sub.executionTime}</TableCell>
                    <TableCell className="text-muted-foreground">{sub.memoryUsage}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => setViewingSubmission(sub)}>View Code</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewingSubmission} onOpenChange={() => setViewingSubmission(null)}>
        <DialogContent className="max-w-2xl border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>{viewingSubmission?.problemTitle} - {viewingSubmission?.studentName}</DialogTitle>
            <DialogDescription>Language: {viewingSubmission?.language} | Tests: {viewingSubmission?.testCasesPassed}/{(viewingSubmission?.testCasesPassed ?? 0) + (viewingSubmission?.testCasesFailed ?? 0)}</DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border border-border bg-secondary">
            <pre className="overflow-x-auto p-4 text-sm text-foreground"><code>{viewingSubmission?.code}</code></pre>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Execution: {viewingSubmission?.executionTime}</span>
            <span>Memory: {viewingSubmission?.memoryUsage}</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
