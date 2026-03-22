import { NextRequest, NextResponse } from "next/server"
import { codingApi } from "@/lib/api"

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object") {
    const message = "message" in error ? error.message : undefined
    if (typeof message === "string" && message.trim()) return message
    try {
      return JSON.stringify(error)
    } catch {
      return "Unknown error"
    }
  }
  return "Unknown error"
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const codingProblems = await codingApi.getByExam(id)
    return NextResponse.json(codingProblems)
  } catch (error) {
    console.error("Coding GET route error:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const newCodingProblem = await codingApi.create(id, body)
    return NextResponse.json(newCodingProblem)
  } catch (error) {
    console.error("Coding POST route error:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
