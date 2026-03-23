"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
  Shield,
  Monitor,
  Camera,
  Copy,
  MousePointer2Off,
  Wrench,
  Shuffle,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { type SecuritySettings, defaultSecurity } from "@/lib/api-client"

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null))

type SecurityField = {
  key:
    | "forceFullscreen"
    | "cancelOnTabSwitch"
    | "disableCopyPaste"
    | "disableRightClick"
    | "disableDevTools"
    | "enableScreenRecording"
    | "enableWebcamMonitoring"
    | "randomizeQuestions"
    | "randomizeTestCases"
  label: string
  description: string
  icon: React.ElementType
}

const securityFields: SecurityField[] = [
  {
    key: "forceFullscreen",
    label: "Force Fullscreen Mode",
    description: "Students must take the exam in fullscreen mode. Exiting fullscreen triggers a warning.",
    icon: Monitor,
  },
  {
    key: "cancelOnTabSwitch",
    label: "Terminate on Tab Switch",
    description: "Automatically terminate the exam session if the student switches tabs or windows.",
    icon: Monitor,
  },
  {
    key: "disableCopyPaste",
    label: "Disable Copy / Paste",
    description: "Prevent students from copying or pasting text during the exam.",
    icon: Copy,
  },
  {
    key: "disableRightClick",
    label: "Disable Right Click",
    description: "Prevent access to browser context menus during the exam.",
    icon: MousePointer2Off,
  },
  {
    key: "disableDevTools",
    label: "Disable Developer Tools",
    description: "Detect and block attempts to open browser developer tools.",
    icon: Wrench,
  },
  {
    key: "enableScreenRecording",
    label: "Enable Screen Recording",
    description: "Record the student's screen throughout the exam for review.",
    icon: Monitor,
  },
  {
    key: "enableWebcamMonitoring",
    label: "Enable Webcam Monitoring",
    description: "Use the student's webcam to monitor for suspicious behavior.",
    icon: Camera,
  },
  {
    key: "randomizeQuestions",
    label: "Randomize Question Order",
    description: "Shuffle the order of questions for each student to prevent sharing.",
    icon: Shuffle,
  },
  {
    key: "randomizeTestCases",
    label: "Randomize Test Cases",
    description: "Shuffle coding test case execution order to prevent hard-coded outputs.",
    icon: Shuffle,
  },
]

export default function SecurityPage() {
  const { data: serverSettings, isLoading } = useSWR<SecuritySettings | null>(
    "/api/settings/security",
    fetcher
  )

  const [settings, setSettings] = useState<SecuritySettings>(defaultSecurity)
  const [maxTabSwitches, setMaxTabSwitches] = useState("2")
  const [warningMessage, setWarningMessage] = useState(
    "Warning: Suspicious activity detected. Further violations will terminate your exam."
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (serverSettings) {
      setSettings(serverSettings)
      setMaxTabSwitches(String(serverSettings.maxTabSwitches))
      setWarningMessage(serverSettings.warningMessage)
    }
  }, [serverSettings])

  const handleToggle = (key: keyof SecuritySettings, checked: boolean) => {
    setSettings({ ...settings, [key]: checked })
    setDirty(true)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/settings/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, maxTabSwitches: Number(maxTabSwitches), warningMessage }),
      })
      setSaved(true)
      setDirty(false)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // settings still saved locally
    } finally {
      setSaving(false)
    }
  }

  const enabledCount = securityFields.filter((field) => settings[field.key]).length

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Security Settings</h1>
          <p className="text-sm text-muted-foreground">Configure default anti-cheating mechanisms for all exams</p>
        </div>
        <Button onClick={handleSave} disabled={saving || (!dirty && !saved)}>
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {saved ? "Saved" : "Save Settings"}
        </Button>
      </div>

      {!serverSettings && (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="size-5 text-warning" />
            <p className="text-sm text-foreground">
              Could not load settings from the student server. Showing defaults -- changes will be sent when the server is reachable.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Overview Card */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15">
            <Shield className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-card-foreground">Security Overview</CardTitle>
            <CardDescription>
              {enabledCount} of {securityFields.length} security features enabled
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(enabledCount / securityFields.length) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Toggles */}
      <div className="grid gap-4 md:grid-cols-2">
        {securityFields.map((field) => (
          <Card key={String(field.key)} className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <field.icon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-card-foreground">{field.label}</Label>
                    <Switch
                      checked={settings[field.key]}
                      onCheckedChange={(checked) => handleToggle(field.key, checked)}
                    />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{field.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Advanced Settings */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Advanced Settings</CardTitle>
          <CardDescription>Fine-tune security behavior thresholds</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm text-foreground">Max Tab Switches Before Termination</Label>
            <Input
              type="number"
              value={maxTabSwitches}
              onChange={(e) => {
                setMaxTabSwitches(e.target.value)
                setDirty(true)
                setSaved(false)
              }}
              min="1"
              max="10"
              className="w-40 bg-secondary text-foreground"
            />
            <p className="text-xs text-muted-foreground">Number of tab switches allowed before auto-termination (1-10)</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm text-foreground">Warning Message</Label>
            <Input
              value={warningMessage}
              onChange={(e) => {
                setWarningMessage(e.target.value)
                setDirty(true)
                setSaved(false)
              }}
              className="bg-secondary text-foreground"
            />
            <p className="text-xs text-muted-foreground">Message displayed to students when suspicious activity is detected</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
