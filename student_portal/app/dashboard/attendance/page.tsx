"use client"

import { Loader2, UserCheck, UserX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAttendance } from "@/hooks/use-data"

function formatTimestamp(value: string | null) {
  if (!value) return "--"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--"

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default function AttendancePage() {
  const { data, isLoading, error } = useAttendance()

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  const attendance = data || []
  const totalStudents = attendance.length
  const presentCount = attendance.filter((student) => student.status === "present").length
  const absentCount = totalStudents - presentCount

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          CSM roster attendance based on students who started an exam attempt
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Department</CardTitle>
            <Badge variant="outline">CSM</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{totalStudents}</div>
            <p className="mt-1 text-xs text-muted-foreground">Configured roster entries</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
            <UserCheck className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{presentCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Students who entered an exam</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
            <UserX className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{absentCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Students without an attempt yet</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">CSM Attendance Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Failed to load attendance.</p>
          ) : (
            <div className="max-h-[640px] overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Roll Number</TableHead>
                    <TableHead className="text-muted-foreground">Student</TableHead>
                    <TableHead className="text-muted-foreground">Department</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Last Seen</TableHead>
                    <TableHead className="text-muted-foreground">Attempt State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((student) => (
                    <TableRow key={student.rollNumber} className="border-border">
                      <TableCell className="font-medium text-card-foreground">{student.rollNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{student.studentName || "--"}</TableCell>
                      <TableCell className="text-muted-foreground">{student.department}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            student.status === "present"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-600"
                          }
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatTimestamp(student.lastSeenAt)}</TableCell>
                      <TableCell className="text-muted-foreground capitalize">{student.attemptStatus || "--"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
