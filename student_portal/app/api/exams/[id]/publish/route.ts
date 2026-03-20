import { NextRequest, NextResponse } from "next/server"
import { examApi } from "@/lib/api"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const publishedExam = await examApi.publish(id)
    return NextResponse.json(publishedExam)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to publish exam" }, { status: 500 })
  }
}
