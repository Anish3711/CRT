"use client"

import { useState } from "react"
import {
  MonitorDot, AlertTriangle, Eye, UserX, Search, RefreshCw, Loader2, WifiOff,
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
import { useMonitoring, useExams } from "@/hooks/use-data"
import type { StudentAttempt } from "@/lib/api-client"

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: "bg-chart-2/15 text-chart-2 border-chart-2/30",
    completed: "bg-chart-3/15 text-chart-3 border-chart-3/30",
    terminated: "bg-destructive/15 text-destructive border-destructive/30",
  }
  return (
    <Badge variant="outline" className={variants[status] || ""}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

function SuspiciousBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-sm text-muted-foreground">None</span>
  const color = count >= 3
    ? "bg-destructive/15 text-destructive border-destructive/30"
    : "bg-chart-5/15 text-chart-5 border-chart-5/30"
  return <Badge variant="outline" className={color}>{count} flag{count > 1 ? "s" : ""}</Badge>
}

export default function MonitoringPage() {
  const [filterExam, setFilterExam] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingLogs, setViewingLogs] = useState<StudentAttempt | null>(null)

  const examFilter = filterExam !== "all" ? filterExam : undefined
  const { data: attempts, isLoading, mutate } = useMonitoring(examFilter)
  const { data: exams } = useExams()

  const attemptList = Array.isArray(attempts) ? attempts : []
  const examList = Array.isArray(exams) ? exams : []

  const filtered = attemptList.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false
    if (searchQuery && !a.studentName.toLowerCase().includes(searchQuery.toLowerCase()) && !a.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const activeCount = attemptList.filter((a) => a.status === "active").length
  const suspiciousCount = attemptList.filter((a) => a.suspiciousCount > 0).length
  const terminatedCount = attemptList.filter((a) => a.status === "terminated").length

  const handleTerminate = async (id: string) => {
    try {
      await fetch(`/api/monitoring/${id}/terminate`, { method: "POST" })
      await mutate()
    } catch (err) {
      console.error("Failed to terminate:", err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Live Monitoring</h1>
          <p className="text-sm text-muted-foreground">Monitor active exam sessions in real-time (auto-refresh every 5s)</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="mr-2 size-4" />Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Sessions</CardTitle>
            <MonitorDot className="size-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{activeCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Students currently taking exams</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suspicious Activity</CardTitle>
            <AlertTriangle className="size-4 text-chart-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{suspiciousCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Students flagged for suspicious behavior</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Terminated</CardTitle>
            <UserX className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{terminatedCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Sessions forcefully ended</p>
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
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px] bg-secondary text-foreground"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent className="border-border bg-card text-card-foreground">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Student Sessions ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <WifiOff className="mb-3 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No active sessions</p>
              <p className="mt-1 text-xs text-muted-foreground">Sessions will appear when students start taking exams</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Student</TableHead>
                  <TableHead className="text-muted-foreground">Exam</TableHead>
                  <TableHead className="text-muted-foreground">Progress</TableHead>
                  <TableHead className="text-muted-foreground">Time</TableHead>
                  <TableHead className="text-muted-foreground">Flags</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
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
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-card-foreground">{attempt.currentQuestion}/{attempt.totalQuestions}</span>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${attempt.totalQuestions > 0 ? (attempt.currentQuestion / attempt.totalQuestions) * 100 : 0}%` }}
                            />
                          </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{attempt.timeTaken}</TableCell>
                    <TableCell><SuspiciousBadge count={attempt.suspiciousCount} /></TableCell>
                    <TableCell><StatusBadge status={attempt.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={() => setViewingLogs(attempt)} aria-label="View logs"><Eye className="size-3.5" /></Button>
                        {attempt.status === "active" && (
                          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => handleTerminate(attempt.id)} aria-label="Terminate"><UserX className="size-3.5" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewingLogs} onOpenChange={() => setViewingLogs(null)}>
        <DialogContent className="max-w-lg border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Activity Logs</DialogTitle>
            <DialogDescription>{viewingLogs?.studentName} ({viewingLogs?.rollNumber})</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {viewingLogs?.activityLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No suspicious activity recorded.</p>
            ) : (
              viewingLogs?.activityLogs.map((log: StudentAttempt["activityLogs"][number]) => (
                <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border bg-secondary p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{log.type.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())}</p>
                    <p className="text-xs text-muted-foreground">{log.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
