import { NextRequest, NextResponse } from "next/server"
import { resultsApi } from "@/lib/api"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const examId = searchParams.get("examId") || undefined
    const results = await resultsApi.getByExam(examId)
    return NextResponse.json(results)
  } catch (error) {
    console.error("Results error:", error)
    // Return empty array instead of error so dashboard doesn't break
    return NextResponse.json([])
  }
}
