import { NextRequest, NextResponse } from "next/server"
import { codingApi } from "@/lib/api"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const codingProblems = await codingApi.getByExam(id)
    return NextResponse.json(codingProblems)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load coding problems" }, { status: 500 })
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create coding problem" }, { status: 500 })
  }
}
