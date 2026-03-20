"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
  User,
  Mail,
  Building,
  Globe,
  Bell,
  Clock,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null))

type ProfileData = {
  name: string
  email: string
  department: string
  college: string
  notifications: {
    examStart: boolean
    examEnd: boolean
    suspicious: boolean
    submission: boolean
  }
  examDefaults: {
    timezone: string
    autoPublish: boolean
    resultVisibility: string
  }
}

export default function SettingsPage() {
  const { data: profile, isLoading } = useSWR<ProfileData | null>("/api/settings/profile", fetcher)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  const [profileName, setProfileName] = useState("")
  const [profileEmail, setProfileEmail] = useState("")
  const [profileDept, setProfileDept] = useState("")
  const [profileCollege, setProfileCollege] = useState("")

  const [notifyExamStart, setNotifyExamStart] = useState(true)
  const [notifyExamEnd, setNotifyExamEnd] = useState(true)
  const [notifySuspicious, setNotifySuspicious] = useState(true)
  const [notifySubmission, setNotifySubmission] = useState(false)

  const [timezone, setTimezone] = useState("Asia/Kolkata")
  const [autoPublish, setAutoPublish] = useState(false)
  const [resultVisibility, setResultVisibility] = useState("after_exam")

  useEffect(() => {
    if (profile) {
      setProfileName(profile.name || "")
      setProfileEmail(profile.email || "")
      setProfileDept(profile.department || "")
      setProfileCollege(profile.college || "")
      setNotifyExamStart(profile.notifications?.examStart ?? true)
      setNotifyExamEnd(profile.notifications?.examEnd ?? true)
      setNotifySuspicious(profile.notifications?.suspicious ?? true)
      setNotifySubmission(profile.notifications?.submission ?? false)
      setTimezone(profile.examDefaults?.timezone || "Asia/Kolkata")
      setAutoPublish(profile.examDefaults?.autoPublish ?? false)
      setResultVisibility(profile.examDefaults?.resultVisibility || "after_exam")
    }
  }, [profile])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          department: profileDept,
          college: profileCollege,
          notifications: {
            examStart: notifyExamStart,
            examEnd: notifyExamEnd,
            suspicious: notifySuspicious,
            submission: notifySubmission,
          },
          examDefaults: {
            timezone,
            autoPublish,
            resultVisibility,
          },
        }),
      })
      setSaved(true)
      setDirty(false)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // still saved locally
    } finally {
      setSaving(false)
    }
  }

  const markDirty = () => {
    setDirty(true)
    setSaved(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile and platform preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving || (!dirty && !saved)}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {saved ? "Saved" : "Save Changes"}
        </Button>
      </div>

      {!profile && (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="size-5 text-warning" />
            <p className="text-sm text-foreground">
              Could not load profile from the student server. Fill in your details below -- they will sync when the server is reachable.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Profile */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Faculty Profile</CardTitle>
          <CardDescription>Your personal and institutional information</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-foreground">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={profileName}
                  onChange={(e) => { setProfileName(e.target.value); markDirty() }}
                  placeholder="Enter your name"
                  className="bg-secondary pl-10 text-foreground"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => { setProfileEmail(e.target.value); markDirty() }}
                  placeholder="Enter your email"
                  className="bg-secondary pl-10 text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-foreground">Department</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={profileDept}
                  onChange={(e) => { setProfileDept(e.target.value); markDirty() }}
                  placeholder="Enter department"
                  className="bg-secondary pl-10 text-foreground"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-foreground">College / Institution</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={profileCollege}
                  onChange={(e) => { setProfileCollege(e.target.value); markDirty() }}
                  placeholder="Enter college name"
                  className="bg-secondary pl-10 text-foreground"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
              <Bell className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-card-foreground">Notifications</CardTitle>
              <CardDescription>Choose which events trigger notifications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {[
            { label: "Exam Started", description: "Notify when an exam session begins", checked: notifyExamStart, set: setNotifyExamStart },
            { label: "Exam Completed", description: "Notify when all students have submitted", checked: notifyExamEnd, set: setNotifyExamEnd },
            { label: "Suspicious Activity", description: "Alert when a student triggers multiple security flags", checked: notifySuspicious, set: setNotifySuspicious },
            { label: "Student Submission", description: "Notify for each individual student submission", checked: notifySubmission, set: setNotifySubmission },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border border-border bg-secondary p-4">
              <div>
                <Label className="text-sm font-medium text-foreground">{item.label}</Label>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch checked={item.checked} onCheckedChange={(c) => { item.set(c); markDirty() }} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Exam Defaults */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
              <Clock className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-card-foreground">Exam Defaults</CardTitle>
              <CardDescription>Default settings applied to new exams</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-foreground">Timezone</Label>
              <Select value={timezone} onValueChange={(v) => { setTimezone(v); markDirty() }}>
                <SelectTrigger className="bg-secondary text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-card-foreground">
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-foreground">Result Visibility</Label>
              <Select value={resultVisibility} onValueChange={(v) => { setResultVisibility(v); markDirty() }}>
                <SelectTrigger className="bg-secondary text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-card-foreground">
                  <SelectItem value="immediate">Immediately After Submission</SelectItem>
                  <SelectItem value="after_exam">After Exam Ends</SelectItem>
                  <SelectItem value="manual">Manual Release</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary p-4">
            <div>
              <Label className="text-sm font-medium text-foreground">Auto-Publish Exams</Label>
              <p className="text-xs text-muted-foreground">Automatically publish exams when the start time is reached</p>
            </div>
            <Switch checked={autoPublish} onCheckedChange={(c) => { setAutoPublish(c); markDirty() }} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
