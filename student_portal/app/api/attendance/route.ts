import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { CSM_ROLL_NUMBERS, type AttendanceRecord, normalizeRollNumber } from "@/lib/attendance-roster"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type AttemptRow = {
  name: string | null
  roll_no: string | null
  start_time: string | null
  status: string | null
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("guest_attempts")
      .select("name, roll_no, start_time, status")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const latestAttemptByRoll = new Map<string, AttemptRow>()

    for (const attempt of (data || []) as AttemptRow[]) {
      const rollNumber = attempt.roll_no ? normalizeRollNumber(attempt.roll_no) : ""
      if (!rollNumber) continue

      const existing = latestAttemptByRoll.get(rollNumber)
      const existingTime = existing?.start_time ? Date.parse(existing.start_time) : 0
      const nextTime = attempt.start_time ? Date.parse(attempt.start_time) : 0

      if (!existing || nextTime >= existingTime) {
        latestAttemptByRoll.set(rollNumber, attempt)
      }
    }

    const roster: AttendanceRecord[] = CSM_ROLL_NUMBERS.map((rollNumber) => {
      const attempt = latestAttemptByRoll.get(rollNumber)

      return {
        department: "CSM",
        rollNumber,
        studentName: attempt?.name || null,
        status: attempt ? "present" : "absent",
        lastSeenAt: attempt?.start_time || null,
        attemptStatus: attempt?.status || null,
      }
    })

    return NextResponse.json(roster)
  } catch (error) {
    console.error("attendance route error:", error)
    return NextResponse.json({ error: "Failed to load attendance roster" }, { status: 500 })
  }
}
