"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Plus,
  Pencil,
  Trash2,
  Send,
  Calendar,
  Clock,
  BookOpen,
  Code2,
  Loader2,
  FileQuestion,
  ChevronRight,
  Copy,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
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
import { useExams } from "@/hooks/use-data"
import { type SecuritySettings, type StudentCustomField, defaultSecurity } from "@/lib/api-client"

function createCustomField(): StudentCustomField {
  return {
    id: `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    options: [],
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: "bg-chart-2/15 text-chart-2 border-chart-2/30",
    published: "bg-primary/15 text-primary border-primary/30",
    draft: "bg-muted text-muted-foreground border-border",
    completed: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  }
  return (
    <Badge variant="outline" className={variants[status] || ""}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export default function ExamsPage() {
  const { data: exams, isLoading, mutate } = useExams()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [showSecurity, setShowSecurity] = useState(false)
  const [currentSecurity, setCurrentSecurity] =
    useState<SecuritySettings>(defaultSecurity)
  const [formCustomFields, setFormCustomFields] = useState<StudentCustomField[]>([])
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [formTitle, setFormTitle] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formType, setFormType] = useState<"mcq" | "coding" | "mixed">("mixed")
  const [formDuration, setFormDuration] = useState("120")
  const [formStart, setFormStart] = useState("")
  const [formEnd, setFormEnd] = useState("")
  const [formAttempts, setFormAttempts] = useState("1")

  const resetForm = () => {
    setFormTitle("")
    setFormDesc("")
    setFormType("mixed")
    setFormDuration("120")
    setFormStart("")
    setFormEnd("")
    setFormAttempts("1")
    setCurrentSecurity({ ...defaultSecurity })
    setFormCustomFields([])
    setShowSecurity(false)
  }

  const openEdit = (exam: {
    id: string
    title: string
    description: string
    type: "mcq" | "coding" | "mixed"
    duration: number
    startTime: string
    endTime: string
    maxAttempts: number
    security: SecuritySettings
    customFields: StudentCustomField[]
  }) => {
    setEditingExamId(exam.id)
    setFormTitle(exam.title)
    setFormDesc(exam.description)
    setFormType(exam.type)
    setFormDuration(String(exam.duration))
    setFormStart(exam.startTime)
    setFormEnd(exam.endTime)
    setFormAttempts(String(exam.maxAttempts))
    setCurrentSecurity({ ...exam.security })
    setFormCustomFields(exam.customFields || [])
    setIsCreateOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const body = {
      title: formTitle,
      description: formDesc,
      type: formType,
      duration: Number(formDuration),
      startTime: formStart,
      endTime: formEnd,
      maxAttempts: Number(formAttempts),
      security: currentSecurity,
      customFields: formCustomFields
        .map((field) => ({
          ...field,
          label: field.label.trim(),
          placeholder: field.placeholder?.trim() || "",
          options: field.type === "select"
            ? (field.options || []).map((option) => option.trim()).filter(Boolean)
            : [],
        }))
        .filter((field) => field.label.length > 0),
      status: "draft" as const,
    }

    try {
      if (editingExamId) {
        await fetch(`/api/exams/${editingExamId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        await fetch("/api/exams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
      await mutate()
    } catch (err) {
      console.error("Failed to save exam:", err)
    }

    setSaving(false)
    setIsCreateOpen(false)
    setEditingExamId(null)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/exams/${id}`, { method: "DELETE" })
      await mutate()
    } catch (err) {
      console.error("Failed to delete exam:", err)
    }
  }

  const handlePublish = async (id: string) => {
    try {
      await fetch(`/api/exams/${id}/publish`, { method: "POST" })
      await mutate()
    } catch (err) {
      console.error("Failed to publish exam:", err)
    }
  }

  const handleCopyLink = (examId: string) => {
    const configuredBaseUrl = process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL?.trim()
    const studentPortalUrl = configuredBaseUrl
      ? `${configuredBaseUrl.replace(/\/$/, "")}/exam-entry?examId=${examId}`
      : `${window.location.origin}/exam-entry?examId=${examId}`
      
    navigator.clipboard.writeText(studentPortalUrl)
    setCopiedId(examId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const examList = Array.isArray(exams) ? exams : []

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Exam Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create exams, then add questions to each exam{"'"}s question bank
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setEditingExamId(null)
            setIsCreateOpen(true)
          }}
        >
          <Plus className="mr-2 size-4" />
          Create Exam
        </Button>
      </div>

      {examList.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-secondary">
              <FileQuestion className="size-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground">No exams yet</p>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              Create your first exam, then you can add MCQ questions and coding
              problems to its question bank.
            </p>
            <Button
              className="mt-6"
              onClick={() => {
                resetForm()
                setEditingExamId(null)
                setIsCreateOpen(true)
              }}
            >
              <Plus className="mr-2 size-4" />
              Create First Exam
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {examList.map((exam) => (
            <Card key={exam.id} className="border-border bg-card">
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg text-card-foreground">
                      {exam.title}
                    </CardTitle>
                    <StatusBadge status={exam.status} />
                    <Badge
                      variant="outline"
                      className="border-border text-muted-foreground capitalize"
                    >
                      {exam.type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {exam.description}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(exam)}
                    aria-label="Edit exam"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  {exam.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-primary"
                      onClick={() => handlePublish(exam.id)}
                      aria-label="Publish exam"
                    >
                      <Send className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(exam.id)}
                    aria-label="Delete exam"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-primary"
                    onClick={() => handleCopyLink(exam.id)}
                    aria-label="Copy Exam Link"
                    title="Copy Student Link"
                  >
                    {copiedId === exam.id ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                {/* Exam meta row */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {exam.duration} min
                  </span>
                  {exam.startTime && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {new Date(exam.startTime).toLocaleDateString()}
                    </span>
                  )}
                  <span>
                    {exam.questionCount} question
                    {exam.questionCount !== 1 ? "s" : ""}
                  </span>
                  <span>Max {exam.maxAttempts} attempt{exam.maxAttempts !== 1 ? "s" : ""}</span>
                </div>

                <Separator className="bg-border" />

                {/* Question Bank Actions -- the main feature */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Question Bank
                  </p>
                  <div className="flex flex-1 flex-wrap gap-3">
                    {(exam.type === "mcq" || exam.type === "mixed") && (
                      <Button
                        variant="outline"
                        className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                        asChild
                      >
                        <Link href={`/dashboard/exams/${exam.id}/questions`}>
                          <BookOpen className="size-4" />
                          MCQ Questions
                          <ChevronRight className="size-3.5" />
                        </Link>
                      </Button>
                    )}
                    {(exam.type === "coding" || exam.type === "mixed") && (
                      <Button
                        variant="outline"
                        className="gap-2 border-chart-2/30 text-chart-2 hover:bg-chart-2/10 hover:text-chart-2"
                        asChild
                      >
                        <Link href={`/dashboard/exams/${exam.id}/coding`}>
                          <Code2 className="size-4" />
                          Coding Problems
                          <ChevronRight className="size-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Exam Dialog */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) {
            setEditingExamId(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>
              {editingExamId ? "Edit Exam" : "Create New Exam"}
            </DialogTitle>
            <DialogDescription>
              {editingExamId
                ? "Update the exam details below"
                : "Fill in the details to create a new exam. After creating, you can add questions to its question bank."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Exam Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Enter exam title"
                className="bg-secondary text-foreground"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Description</Label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Enter exam description"
                className="bg-secondary text-foreground"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label className="text-foreground">Exam Type</Label>
                <Select
                  value={formType}
                  onValueChange={(v: "mcq" | "coding" | "mixed") =>
                    setFormType(v)
                  }
                >
                  <SelectTrigger className="bg-secondary text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card text-card-foreground">
                    <SelectItem value="mcq">MCQ Only</SelectItem>
                    <SelectItem value="coding">Coding Only</SelectItem>
                    <SelectItem value="mixed">
                      Mixed (MCQ + Coding)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-foreground">Duration (minutes)</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="bg-secondary pl-10 text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label className="text-foreground">Start Time</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="datetime-local"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="bg-secondary pl-10 text-foreground"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-foreground">End Time</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="datetime-local"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="bg-secondary pl-10 text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Maximum Attempts</Label>
              <Input
                type="number"
                value={formAttempts}
                onChange={(e) => setFormAttempts(e.target.value)}
                min="1"
                className="bg-secondary text-foreground"
              />
            </div>

            <Card className="border-border bg-secondary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-card-foreground">
                  Student Form Fields (Per Exam)
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Add optional custom fields like Branch, Email, CGPA for this exam.
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {formCustomFields.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No custom fields added. Students will see only default details.
                  </p>
                )}

                {formCustomFields.map((field) => (
                  <div key={field.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground">Field Label</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => {
                            const label = e.target.value
                            setFormCustomFields((prev) =>
                              prev.map((item) => (item.id === field.id ? { ...item, label } : item))
                            )
                          }}
                          placeholder="e.g. Branch"
                          className="bg-secondary text-foreground"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground">Field Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value: StudentCustomField["type"]) => {
                            setFormCustomFields((prev) =>
                              prev.map((item) =>
                                item.id === field.id
                                  ? {
                                      ...item,
                                      type: value,
                                      options: value === "select" ? (item.options?.length ? item.options : [""]) : [],
                                    }
                                  : item
                              )
                            )
                          }}
                        >
                          <SelectTrigger className="bg-secondary text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-border bg-card text-card-foreground">
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="tel">Phone</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground">Placeholder (optional)</Label>
                        <Input
                          value={field.placeholder || ""}
                          onChange={(e) => {
                            const placeholder = e.target.value
                            setFormCustomFields((prev) =>
                              prev.map((item) => (item.id === field.id ? { ...item, placeholder } : item))
                            )
                          }}
                          placeholder="Shown in student form"
                          className="bg-secondary text-foreground"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-border bg-secondary px-3 py-2">
                        <Label className="text-sm text-foreground">Required Field</Label>
                        <Switch
                          checked={field.required}
                          onCheckedChange={(checked) => {
                            setFormCustomFields((prev) =>
                              prev.map((item) => (item.id === field.id ? { ...item, required: checked } : item))
                            )
                          }}
                        />
                      </div>
                    </div>

                    {field.type === "select" && (
                      <div className="mt-3 flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground">Dropdown Options (one per line)</Label>
                        <Textarea
                          value={(field.options || []).join("\n")}
                          onChange={(e) => {
                            const options = e.target.value
                              .split("\n")
                              .map((option) => option.trim())
                            setFormCustomFields((prev) =>
                              prev.map((item) => (item.id === field.id ? { ...item, options } : item))
                            )
                          }}
                          placeholder={"CSE\nCSM\nECE"}
                          className="min-h-[100px] bg-secondary text-foreground"
                        />
                      </div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setFormCustomFields((prev) => prev.filter((item) => item.id !== field.id))
                        }}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Remove Field
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFormCustomFields((prev) => [...prev, createCustomField()])
                  }}
                >
                  <Plus className="mr-2 size-4" />
                  Add Custom Field
                </Button>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Exam Security Settings
                </p>
                <p className="text-xs text-muted-foreground">
                  Configure anti-cheating mechanisms
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSecurity(!showSecurity)}
              >
                {showSecurity ? "Hide" : "Configure"}
              </Button>
            </div>

            {showSecurity && (
              <Card className="border-border bg-secondary">
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4">
                    {(
                      [
                        {
                          key: "forceFullscreen" as const,
                          label: "Force Fullscreen Mode",
                        },
                        {
                          key: "cancelOnTabSwitch" as const,
                          label: "Cancel Exam if Tab Switch Detected",
                        },
                        {
                          key: "disableCopyPaste" as const,
                          label: "Disable Copy Paste",
                        },
                        {
                          key: "disableRightClick" as const,
                          label: "Disable Right Click",
                        },
                        {
                          key: "disableDevTools" as const,
                          label: "Disable Dev Tools",
                        },
                        {
                          key: "enableScreenRecording" as const,
                          label: "Enable Screen Recording",
                        },
                        {
                          key: "enableWebcamMonitoring" as const,
                          label: "Enable Webcam Monitoring",
                        },
                        {
                          key: "randomizeQuestions" as const,
                          label: "Randomize Question Order",
                        },
                        {
                          key: "randomizeTestCases" as const,
                          label: "Randomize Coding Test Cases",
                        },
                      ] as const
                    ).map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="text-sm text-foreground">{label}</Label>
                        <Switch
                          checked={currentSecurity[key]}
                          onCheckedChange={(checked) =>
                            setCurrentSecurity({
                              ...currentSecurity,
                              [key]: checked,
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false)
                setEditingExamId(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formTitle || saving}>
              {saving
                ? "Saving..."
                : editingExamId
                  ? "Update Exam"
                  : "Create Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
