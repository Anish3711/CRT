import { NextRequest, NextResponse } from "next/server"

const STUDENT_SERVER = "https://vm-vnopscoz1wgbsxdf86mguc.vusercontent.net"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get("path") || ""

  try {
    const res = await fetch(`${STUDENT_SERVER}/api${path}`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Student server unreachable", path },
      { status: 502 }
    )
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get("path") || ""
  const body = await req.json()

  try {
    const res = await fetch(`${STUDENT_SERVER}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Student server unreachable", path },
      { status: 502 }
    )
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get("path") || ""
  const body = await req.json()

  try {
    const res = await fetch(`${STUDENT_SERVER}/api${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Student server unreachable", path },
      { status: 502 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get("path") || ""

  try {
    const res = await fetch(`${STUDENT_SERVER}/api${path}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Student server unreachable", path },
      { status: 502 }
    )
  }
}
