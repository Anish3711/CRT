"use client"

import { FileText, Activity, Users, TrendingUp, Loader2, WifiOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDashboardStats } from "@/hooks/use-data"

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  description: string
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-card-foreground">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: "bg-chart-2/15 text-chart-2 border-chart-2/30",
    published: "bg-primary/15 text-primary border-primary/30",
    draft: "bg-muted text-muted-foreground border-border",
    completed: "bg-chart-3/15 text-chart-3 border-chart-3/30",
    terminated: "bg-destructive/15 text-destructive border-destructive/30",
  }

  return (
    <Badge variant="outline" className={variants[status] || ""}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <WifiOff className="mb-3 size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Data will appear once the student server is connected
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  const totalExams = stats?.totalExams ?? 0
  const activeExams = stats?.activeExams ?? 0
  const totalStudents = stats?.totalStudents ?? 0
  const avgScore = stats?.averageScore ?? 0
  const recentExams = stats?.recentExams ?? []
  const recentAttempts = stats?.recentAttempts ?? []

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your CRT testing platform
          {error && " (connecting to student server...)"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Exams"
          value={totalExams}
          icon={FileText}
          description={`${activeExams} currently active`}
        />
        <StatCard
          title="Active Exams"
          value={activeExams}
          icon={Activity}
          description="Exams in progress now"
        />
        <StatCard
          title="Total Students"
          value={totalStudents}
          icon={Users}
          description="Attempted exams"
        />
        <StatCard
          title="Average Score"
          value={`${avgScore}%`}
          icon={TrendingUp}
          description="Across completed exams"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Recent Exams</CardTitle>
          </CardHeader>
          <CardContent>
            {recentExams.length === 0 ? (
              <EmptyState message="No exams found" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Title</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-muted-foreground">Questions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentExams.map((exam: typeof recentExams[number]) => (
                    <TableRow key={exam.id} className="border-border">
                      <TableCell className="font-medium text-card-foreground">{exam.title}</TableCell>
                      <TableCell className="text-muted-foreground capitalize">{exam.type}</TableCell>
                      <TableCell>
                        <StatusBadge status={exam.status} />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{exam.questionCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Recent Student Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttempts.length === 0 ? (
              <EmptyState message="No student attempts yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Student</TableHead>
                    <TableHead className="text-muted-foreground">Exam</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-muted-foreground">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAttempts.slice(0, 5).map((attempt: typeof recentAttempts[number]) => (
                    <TableRow key={attempt.id} className="border-border">
                      <TableCell>
                        <div>
                          <p className="font-medium text-card-foreground">{attempt.studentName}</p>
                          <p className="text-xs text-muted-foreground">{attempt.rollNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-32 truncate text-muted-foreground">{attempt.examName}</TableCell>
                      <TableCell>
                        <StatusBadge status={attempt.status} />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {attempt.status === "active" ? "---" : `${attempt.score}%`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
