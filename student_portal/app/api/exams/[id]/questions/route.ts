import { NextRequest, NextResponse } from "next/server"
import { questionApi } from "@/lib/api"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const questions = await questionApi.getByExam(id)
    return NextResponse.json(questions)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load questions" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const newQuestion = await questionApi.create(id, body)
    return NextResponse.json(newQuestion)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create question" }, { status: 500 })
  }
}
