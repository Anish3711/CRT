import { NextRequest, NextResponse } from "next/server"
import { resultsApi } from "@/lib/api"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const examId = searchParams.get("examId") || undefined
    const submissions = await resultsApi.getCodingSubmissions(examId)
    return NextResponse.json(submissions)
  } catch (error) {
    console.error("Coding results error:", error)
    // Return empty array instead of error so dashboard doesn't break
    return NextResponse.json([])
  }
}
