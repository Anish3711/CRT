import { NextResponse } from 'next/server'
import { getProfileSettings, saveProfileSettings } from '@/lib/app-config-store'

export async function GET() {
  try {
    const data = await getProfileSettings()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to load profile settings:', error)
    return NextResponse.json(null, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const data = await saveProfileSettings(body)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to save profile settings:', error)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
