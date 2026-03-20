import { NextRequest, NextResponse } from "next/server"
import { codingApi } from "@/lib/api"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pId: string }> }
) {
  try {
    const { id, pId } = await params
    const body = await req.json()
    const updated = await codingApi.update(id, pId, body)
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update coding problem" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pId: string }> }
) {
  try {
    const { id, pId } = await params
    await codingApi.delete(id, pId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete coding problem" }, { status: 500 })
  }
}
