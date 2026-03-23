import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DEDUP_WINDOW_MS = 1500

type MonitoringEventInput = {
  type: string
  description?: string
  timestamp?: string
  count?: number | null
  severity?: string
}

type PersistedMonitoringEvent = MonitoringEventInput & {
  id: string
  timestamp: string
}

function normalizeEvents(body: Record<string, unknown>): MonitoringEventInput[] {
  if (Array.isArray(body.events)) {
    return body.events.filter((event): event is MonitoringEventInput => {
      return Boolean(event && typeof event === 'object' && 'type' in event && typeof event.type === 'string')
    })
  }

  if (typeof body.type === 'string') {
    return [{
      type: body.type,
      description: typeof body.description === 'string' ? body.description : undefined,
      timestamp: typeof body.timestamp === 'string' ? body.timestamp : undefined,
      count: typeof body.violations === 'number' ? body.violations : null,
      severity: typeof body.severity === 'string' ? body.severity : undefined,
    }]
  }

  return []
}

function isDuplicateEvent(
  previousEvent: PersistedMonitoringEvent | null,
  nextEvent: PersistedMonitoringEvent
) {
  if (!previousEvent) return false
  if (previousEvent.type !== nextEvent.type) return false
  if ((previousEvent.description || '') !== (nextEvent.description || '')) return false

  const previousTimestamp = Date.parse(previousEvent.timestamp)
  const nextTimestamp = Date.parse(nextEvent.timestamp)
  if (Number.isNaN(previousTimestamp) || Number.isNaN(nextTimestamp)) return false

  return Math.abs(nextTimestamp - previousTimestamp) <= DEDUP_WINDOW_MS
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { attemptId } = body

    const incomingEvents = normalizeEvents(body)

    if (!attemptId || incomingEvents.length === 0) {
      return NextResponse.json({ error: 'attemptId and at least one monitoring event are required' }, { status: 400 })
    }

    const { data: attempt, error: fetchError } = await supabase
      .from('guest_attempts')
      .select('violations')
      .eq('id', attemptId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 404 })
    }

    const existing = Array.isArray(attempt?.violations)
      ? [...attempt.violations] as PersistedMonitoringEvent[]
      : []

    let previousEvent = existing[existing.length - 1] || null
    let recordedCount = 0

    for (const [index, event] of incomingEvents.entries()) {
      const timestamp = event.timestamp && !Number.isNaN(Date.parse(event.timestamp))
        ? event.timestamp
        : new Date().toISOString()

      const normalizedEvent: PersistedMonitoringEvent = {
        id: `${event.type}-${Date.now()}-${index}`,
        type: event.type,
        description: event.description || `Monitoring event: ${event.type}`,
        timestamp,
        count: event.count ?? null,
        severity: event.severity,
      }

      if (isDuplicateEvent(previousEvent, normalizedEvent)) {
        continue
      }

      existing.push(normalizedEvent)
      previousEvent = normalizedEvent
      recordedCount += 1
    }

    if (recordedCount === 0) {
      return NextResponse.json({ success: true, recordedCount, totalViolations: existing.length })
    }

    const { error: updateError } = await supabase
      .from('guest_attempts')
      .update({ violations: existing })
      .eq('id', attemptId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, recordedCount, totalViolations: existing.length })
  } catch (error) {
    console.error('monitoring route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
