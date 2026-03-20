import { NextResponse } from 'next/server'
import { getSecuritySettings, saveSecuritySettings } from '@/lib/app-config-store'

export async function GET() {
  try {
    const data = await getSecuritySettings()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to load security settings:', error)
    return NextResponse.json(null, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const data = await saveSecuritySettings(body)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to save security settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
