import { NextRequest, NextResponse } from "next/server"
import { questionApi } from "@/lib/api"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qId: string }> }
) {
  try {
    const { id, qId } = await params
    const body = await req.json()
    const updated = await questionApi.update(id, qId, body)
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update question" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; qId: string }> }
) {
  try {
    const { id, qId } = await params
    await questionApi.delete(id, qId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete question" }, { status: 500 })
  }
}
