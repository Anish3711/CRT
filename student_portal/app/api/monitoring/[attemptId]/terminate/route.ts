import { NextRequest, NextResponse } from "next/server"
import { monitorApi } from "@/lib/api"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params
    await monitorApi.terminateSession(attemptId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to terminate session" }, { status: 500 })
  }
}
