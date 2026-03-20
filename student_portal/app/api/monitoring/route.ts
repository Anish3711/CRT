import { NextRequest, NextResponse } from "next/server"
import { monitorApi } from "@/lib/api"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const examId = searchParams.get("examId") || undefined
    const activeSessions = await monitorApi.getActiveSessions(examId)
    return NextResponse.json(activeSessions)
  } catch (error) {
    console.error("Monitoring error:", error)
    // Return empty array instead of error so dashboard doesn't break
    return NextResponse.json([])
  }
}

// POST endpoint to terminate a session
export async function POST(req: NextRequest) {
  try {
    const { attemptId } = await req.json()
    await monitorApi.terminateSession(attemptId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Terminate session error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to terminate session" }, { status: 500 })
  }
}
