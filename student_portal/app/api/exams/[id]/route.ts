import { NextRequest, NextResponse } from "next/server"
import { examApi } from "@/lib/api"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const exam = await examApi.getById(id)
    return NextResponse.json(exam)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load exam" }, { status: 404 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const updatedExam = await examApi.update(id, body)
    return NextResponse.json(updatedExam)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update exam" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await examApi.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete exam" }, { status: 500 })
  }
}
