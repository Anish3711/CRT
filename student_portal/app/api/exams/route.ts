import { NextRequest, NextResponse } from "next/server"
import { examApi } from "@/lib/api"

// GET /api/exams
export async function GET() {
  try {
    const exams = await examApi.getAll()
    return NextResponse.json(exams)
  } catch (error) {
    console.error("GET /api/exams ERROR:", error)
    // Return empty array instead of error so dashboard doesn't break
    return NextResponse.json([])
  }
}

// POST /api/exams - create exam
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const newExam = await examApi.create({
      title: body.title,
      description: body.description,
      type: body.type,
      duration: body.duration,
      startTime: body.startTime,
      endTime: body.endTime,
      maxAttempts: body.maxAttempts,
      status: body.status,
      security: body.security
    })
    return NextResponse.json(newExam)
  } catch (error) {
    console.error("POST /api/exams ERROR:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create exam" }, { status: 500 })
  }
}
