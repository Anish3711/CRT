import { useEffect, useRef, useState, useCallback, type MutableRefObject } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ActivityLog } from '@/lib/supabase'

export type SuspiciousActivity = {
  id: string
  activity_type: ActivityLog['activity_type'] | string
  severity: ActivityLog['severity']
  description: string | null
  timestamp: string
}

type MonitoringEvent = {
  type: SuspiciousActivity['activity_type']
  severity: SuspiciousActivity['severity']
  description: string
  timestamp: string
}

type ProctoringKind = 'screen' | 'webcam'

type ProctoringIncident = {
  kind: ProctoringKind
  code: 'permission_denied' | 'stream_ended' | 'unsupported' | 'upload_failed'
  message: string
}

const CLIENT_ACTIVITY_DEDUP_WINDOW_MS = 1500
const PROCTORING_TIMESLICE_MS = 15000

function getPreferredRecorderMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return undefined
  }

  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType))
}

async function uploadProctoringChunk(
  attemptId: string,
  kind: ProctoringKind,
  segmentIndex: number,
  blob: Blob
) {
  if (blob.size === 0) return

  const formData = new FormData()
  formData.append('attemptId', attemptId)
  formData.append('kind', kind)
  formData.append('segmentIndex', String(segmentIndex))
  formData.append('file', blob, `${kind}-${segmentIndex}.webm`)

  const response = await fetch('/api/proctoring/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Failed to upload ${kind} recording segment`)
  }
}

// Hook for fullscreen enforcement
export function useFullscreenEnforcement(enabled: boolean = true) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    handleFullscreenChange()
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [enabled])

  const requestFullscreen = useCallback(async () => {
    if (!enabled) return false

    const target = containerRef.current ?? document.documentElement

    if (!target) return false

    try {
      if (document.fullscreenElement !== target) {
        await target.requestFullscreen()
      }
      setIsFullscreen(true)
      return true
    } catch (err) {
      console.error('Failed to request fullscreen:', err)
      setIsFullscreen(Boolean(document.fullscreenElement))
      return false
    }
  }, [enabled])

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      setIsFullscreen(false)
      return true
    }

    try {
      await document.exitFullscreen()
      setIsFullscreen(false)
      return true
    } catch (err) {
      console.error('Failed to exit fullscreen:', err)
      return false
    }
  }, [])

  return {
    containerRef,
    isFullscreen,
    requestFullscreen,
    exitFullscreen,
  }
}

// Hook for detecting tab switches and suspicious activity
export function useActivityDetection(
  sessionId: string | null,
  enabled: boolean = true,
  initialActivities: SuspiciousActivity[] = [],
  controls?: {
    disableCopyPaste?: boolean
    disableRightClick?: boolean
    suspendRef?: MutableRefObject<boolean>
  }
) {
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>(initialActivities)
  const loggingBufferRef = useRef<MonitoringEvent[]>([])
  const lastActivityAtRef = useRef<Record<string, number>>({})

  useEffect(() => {
    if (!sessionId) {
      setSuspiciousActivities([])
      loggingBufferRef.current = []
      lastActivityAtRef.current = {}
      return
    }

    setSuspiciousActivities(initialActivities)
    loggingBufferRef.current = []
    lastActivityAtRef.current = {}

    for (const activity of initialActivities) {
      const parsedTimestamp = Date.parse(activity.timestamp)
      if (!Number.isNaN(parsedTimestamp)) {
        lastActivityAtRef.current[activity.activity_type] = parsedTimestamp
      }
    }
  }, [initialActivities, sessionId])

  const recordActivity = useCallback((event: MonitoringEvent) => {
    if (controls?.suspendRef?.current) {
      return false
    }

    const eventTimestamp = Date.parse(event.timestamp)
    const now = Number.isNaN(eventTimestamp) ? Date.now() : eventTimestamp
    const lastLoggedAt = lastActivityAtRef.current[event.type]

    if (typeof lastLoggedAt === 'number' && now - lastLoggedAt <= CLIENT_ACTIVITY_DEDUP_WINDOW_MS) {
      return false
    }

    lastActivityAtRef.current[event.type] = now
    loggingBufferRef.current.push(event)

    setSuspiciousActivities((prev) => [
      ...prev,
      {
        id: `${event.type}-${now}`,
        activity_type: event.type,
        severity: event.severity,
        description: event.description,
        timestamp: event.timestamp,
      },
    ])

    return true
  }, [controls?.suspendRef])

  useEffect(() => {
    if (!enabled || !sessionId) return

    const shouldBlockClipboard = controls?.disableCopyPaste !== false
    const shouldBlockContextMenu = controls?.disableRightClick !== false

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordActivity({
          type: 'tab_switch',
          severity: 'high',
          description: 'Tab switched away from exam',
          timestamp: new Date().toISOString(),
        })
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const lowerKey = e.key.toLowerCase()

      if ((e.ctrlKey || e.metaKey) && lowerKey === 'c') {
        if (shouldBlockClipboard) {
          e.preventDefault()
        }
        recordActivity({
          type: 'copy_attempt',
          severity: 'medium',
          description: 'Copy attempt detected',
          timestamp: new Date().toISOString(),
        })
      }

      if ((e.ctrlKey || e.metaKey) && lowerKey === 'v') {
        if (shouldBlockClipboard) {
          e.preventDefault()
        }
        recordActivity({
          type: 'paste_attempt',
          severity: 'medium',
          description: 'Paste attempt detected',
          timestamp: new Date().toISOString(),
        })
      }

      if ((e.ctrlKey || e.metaKey) && lowerKey === 'x') {
        if (shouldBlockClipboard) {
          e.preventDefault()
        }
        recordActivity({
          type: 'copy_attempt',
          severity: 'medium',
          description: 'Cut attempt detected',
          timestamp: new Date().toISOString(),
        })
      }

      const blockedShortcut =
        lowerKey === 'f12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(lowerKey)) ||
        ((e.ctrlKey || e.metaKey) && ['s', 'u', 'p'].includes(lowerKey))

      if (blockedShortcut) {
        e.preventDefault()
        recordActivity({
          type: 'other',
          severity: 'high',
          description: `Blocked restricted shortcut: ${e.key}`,
          timestamp: new Date().toISOString(),
        })
      }
    }

    const handleCopy = (e: ClipboardEvent) => {
      if (!shouldBlockClipboard) return
      e.preventDefault()
      recordActivity({
        type: 'copy_attempt',
        severity: 'medium',
        description: 'Clipboard copy blocked',
        timestamp: new Date().toISOString(),
      })
    }

    const handleCut = (e: ClipboardEvent) => {
      if (!shouldBlockClipboard) return
      e.preventDefault()
      recordActivity({
        type: 'copy_attempt',
        severity: 'medium',
        description: 'Clipboard cut blocked',
        timestamp: new Date().toISOString(),
      })
    }

    const handlePaste = (e: ClipboardEvent) => {
      if (!shouldBlockClipboard) return
      e.preventDefault()
      recordActivity({
        type: 'paste_attempt',
        severity: 'medium',
        description: 'Clipboard paste blocked',
        timestamp: new Date().toISOString(),
      })
    }

    const handleDrop = (e: DragEvent) => {
      if (!shouldBlockClipboard) return

      const target = e.target as HTMLElement | null
      const dataTransfer = e.dataTransfer
      const hasDraggedData = Boolean(dataTransfer && dataTransfer.types.length > 0)
      const isEditableTarget = Boolean(
        target?.closest('textarea, input, [contenteditable="true"]')
      )

      if (!hasDraggedData && !isEditableTarget) return

      e.preventDefault()
      recordActivity({
        type: 'paste_attempt',
        severity: 'medium',
        description: 'Drag and drop paste attempt blocked',
        timestamp: new Date().toISOString(),
      })
    }

    const handleBeforeInput = (e: InputEvent) => {
      if (!shouldBlockClipboard) return

      if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') {
        e.preventDefault()
        recordActivity({
          type: 'paste_attempt',
          severity: 'medium',
          description: e.inputType === 'insertFromDrop'
            ? 'Drop insertion blocked'
            : 'Paste insertion blocked',
          timestamp: new Date().toISOString(),
        })
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      if (!shouldBlockContextMenu) return
      e.preventDefault()
      recordActivity({
        type: 'copy_attempt',
        severity: 'medium',
        description: 'Right-click attempt blocked',
        timestamp: new Date().toISOString(),
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('copy', handleCopy, true)
    document.addEventListener('cut', handleCut, true)
    document.addEventListener('paste', handlePaste, true)
    document.addEventListener('drop', handleDrop, true)
    document.addEventListener('beforeinput', handleBeforeInput, true)
    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('copy', handleCopy, true)
      document.removeEventListener('cut', handleCut, true)
      document.removeEventListener('paste', handlePaste, true)
      document.removeEventListener('drop', handleDrop, true)
      document.removeEventListener('beforeinput', handleBeforeInput, true)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [
    controls?.disableCopyPaste,
    controls?.disableRightClick,
    enabled,
    recordActivity,
    sessionId,
  ])

  const flushLogs = useCallback(
    async (additionalLogs?: MonitoringEvent[]) => {
      if (!sessionId) return

      const allLogs = [...loggingBufferRef.current, ...(additionalLogs || [])]
      if (allLogs.length === 0) return

      try {
        const response = await fetch('/api/monitoring', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            attemptId: sessionId,
            events: allLogs.map((log) => ({
              type: log.type,
              description: log.description,
              severity: log.severity,
              timestamp: log.timestamp,
            })),
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to persist monitoring logs')
        }

        loggingBufferRef.current = []
      } catch (err) {
        console.error('Failed to flush activity logs:', err)
      }
    },
    [sessionId]
  )

  return {
    suspiciousActivities,
    recordActivity,
    flushLogs,
  }
}

type UseMediaProctoringOptions = {
  sessionId: string | null
  enabled?: boolean
  kind: ProctoringKind
  onIncident?: (incident: ProctoringIncident) => void
}

export function useMediaProctoring({
  sessionId,
  enabled = true,
  kind,
  onIncident,
}: UseMediaProctoringOptions) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'recording' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const segmentIndexRef = useRef(0)
  const isStoppingRef = useRef(false)

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    mediaRecorderRef.current = null
    isStoppingRef.current = false
    setPreviewStream(null)
  }, [])

  const reportIncident = useCallback((incident: ProctoringIncident) => {
    setError(incident.message)
    setStatus('error')
    onIncident?.(incident)
  }, [onIncident])

  const stopRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current

    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      cleanup()
      setStatus('idle')
      return
    }

    isStoppingRef.current = true

    await new Promise<void>((resolve) => {
      mediaRecorder.addEventListener('stop', () => {
        cleanup()
        setStatus('idle')
        resolve()
      }, { once: true })

      mediaRecorder.stop()
    })
  }, [cleanup])

  const startRecording = useCallback(async () => {
    if (!enabled || !sessionId) {
      return false
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof MediaRecorder === 'undefined') {
      reportIncident({
        kind,
        code: 'unsupported',
        message: `${kind === 'screen' ? 'Screen' : 'Webcam'} recording is not supported in this browser.`,
      })
      return false
    }

    if (status === 'recording') {
      return true
    }

    setStatus('requesting')
    setError(null)

    try {
      const stream = kind === 'screen'
        ? await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
          })
        : await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
            audio: false,
          })

      streamRef.current = stream
      setPreviewStream(kind === 'webcam' ? stream : null)

      const mimeType = getPreferredRecorderMimeType()
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      segmentIndexRef.current = 0
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = async (event) => {
        if (!sessionId || event.data.size === 0) return

        try {
          await uploadProctoringChunk(sessionId, kind, segmentIndexRef.current, event.data)
          segmentIndexRef.current += 1
        } catch (uploadError) {
          console.error(`Failed to upload ${kind} segment:`, uploadError)
          reportIncident({
            kind,
            code: 'upload_failed',
            message: `${kind === 'screen' ? 'Screen' : 'Webcam'} recording upload failed.`,
          })

          if (mediaRecorder.state !== 'inactive') {
            isStoppingRef.current = true
            mediaRecorder.stop()
          }
        }
      }

      const handleTrackEnded = () => {
        if (isStoppingRef.current) {
          return
        }

        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop()
        } else {
          cleanup()
          setStatus('idle')
        }

        reportIncident({
          kind,
          code: 'stream_ended',
          message: `${kind === 'screen' ? 'Screen sharing' : 'Webcam access'} was stopped during the exam.`,
        })
      }

      stream.getTracks().forEach((track) => {
        track.addEventListener('ended', handleTrackEnded, { once: true })
      })

      mediaRecorder.start(PROCTORING_TIMESLICE_MS)
      setStatus('recording')
      return true
    } catch (err) {
      console.error(`Failed to start ${kind} recording:`, err)
      reportIncident({
        kind,
        code: 'permission_denied',
        message: `Please allow ${kind === 'screen' ? 'screen sharing' : 'webcam access'} to continue the exam.`,
      })
      cleanup()
      return false
    }
  }, [cleanup, enabled, kind, reportIncident, sessionId, status])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    status,
    error,
    previewStream,
    isRecording: status === 'recording',
    startRecording,
    stopRecording,
  }
}

// Hook for exam timer
export function useExamTimer(initialTimeRemainingSeconds: number, onTimeUp?: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(Math.max(0, initialTimeRemainingSeconds))
  const [isActive, setIsActive] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeUpTriggeredRef = useRef(false)

  useEffect(() => {
    if (!isActive) return
    if (timeRemaining <= 0) return

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (!timeUpTriggeredRef.current) {
            timeUpTriggeredRef.current = true
            onTimeUp?.()
          }
          setIsActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive, onTimeUp, timeRemaining])

  const start = useCallback(() => {
    if (timeRemaining <= 0) {
      if (!timeUpTriggeredRef.current) {
        timeUpTriggeredRef.current = true
        onTimeUp?.()
      }
      return
    }

    setIsActive(true)
  }, [onTimeUp, timeRemaining])
  const pause = useCallback(() => setIsActive(false), [])
  const resume = useCallback(() => {
    if (timeRemaining <= 0) return
    setIsActive(true)
  }, [timeRemaining])

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  return {
    timeRemaining,
    minutes,
    seconds,
    isActive,
    start,
    pause,
    resume,
  }
}

// Simple screen recording fallback
export function useSimpleScreenRecorder(sessionId: string | null) {
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    if (!sessionId || recording) return

    try {
      if (typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
        throw new Error('Screen recording is not supported in this browser')
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })

      const mediaRecorder = new MediaRecorder(stream)
      chunksRef.current = []
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      mediaRecorder.start()
      setRecording(true)
    } catch (err) {
      console.error('Failed to start screen recording:', err)
    }
  }, [sessionId, recording])

  const stopRecording = useCallback(
    async (sessionIdForUpload: string) => {
      if (!mediaRecorderRef.current || !recording) return

      return new Promise<Blob>((resolve) => {
        const mediaRecorder = mediaRecorderRef.current!

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' })
          chunksRef.current = []

          try {
            const supabase = createClient()
            const screenRecordingRow = {
              exam_session_id: sessionIdForUpload,
              duration_seconds: Math.floor(mediaRecorder.stream.getTracks()[0].readyState === 'live' ? 0 : 0),
              file_size_bytes: blob.size,
            }
            await supabase.from('screen_recordings').insert(screenRecordingRow as never)
          } catch (err) {
            console.error('Failed to save recording metadata:', err)
          }

          setRecording(false)
          resolve(blob)
        }

        mediaRecorder.stop()
        mediaRecorder.stream.getTracks().forEach((track) => track.stop())
      })
    },
    [recording]
  )

  return {
    recording,
    startRecording,
    stopRecording,
  }
}
