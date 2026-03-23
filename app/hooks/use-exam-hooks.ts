import { useEffect, useRef, useState, useCallback } from 'react'
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

const CLIENT_ACTIVITY_DEDUP_WINDOW_MS = 1500

// Hook for fullscreen enforcement
export function useFullscreenEnforcement(enabled: boolean = true) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [enabled])

  const requestFullscreen = useCallback(async () => {
    if (containerRef.current) {
      try {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } catch (err) {
        console.error('Failed to request fullscreen:', err)
      }
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
        setIsFullscreen(false)
      } catch (err) {
        console.error('Failed to exit fullscreen:', err)
      }
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
  initialActivities: SuspiciousActivity[] = []
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
    const eventTimestamp = Date.parse(event.timestamp)
    const now = Number.isNaN(eventTimestamp) ? Date.now() : eventTimestamp
    const lastLoggedAt = lastActivityAtRef.current[event.type]

    if (typeof lastLoggedAt === 'number' && now - lastLoggedAt <= CLIENT_ACTIVITY_DEDUP_WINDOW_MS) {
      return
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
  }, [])

  useEffect(() => {
    if (!enabled || !sessionId) return

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
      // Detect copy/paste attempts
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        recordActivity({
          type: 'copy_attempt',
          severity: 'medium',
          description: 'Copy attempt detected',
          timestamp: new Date().toISOString(),
        })
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        recordActivity({
          type: 'paste_attempt',
          severity: 'medium',
          description: 'Paste attempt detected',
          timestamp: new Date().toISOString(),
        })
      }

      // Block common cheat shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
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
    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [enabled, recordActivity, sessionId])

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
    flushLogs,
  }
}

// Hook for screen recording
export function useScreenRecorder(sessionId: string | null, enabled: boolean = true) {
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    if (!enabled || !sessionId || recording) return

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm',
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        setRecordedBlob(blob)
        chunksRef.current = []
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }, [enabled, sessionId, recording])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }, [recording])

  return {
    recording,
    recordedBlob,
    startRecording,
    stopRecording,
  }
}

// Hook for exam timer
export function useExamTimer(durationMinutes: number, onTimeUp?: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60)
  const [isActive, setIsActive] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setTimeRemaining(durationMinutes * 60)
  }, [durationMinutes])

  useEffect(() => {
    if (!isActive) return

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsActive(false)
          onTimeUp?.()
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
  }, [isActive, onTimeUp])

  const start = useCallback(() => setIsActive(true), [])
  const pause = useCallback(() => setIsActive(false), [])
  const resume = useCallback(() => setIsActive(true), [])

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

          // Upload to Supabase storage or just store metadata
          try {
            // Store in database
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
