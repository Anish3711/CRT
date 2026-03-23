import { NextResponse } from 'next/server'
import { getExamMetadata, getSecuritySettings, saveSecuritySettings } from '@/lib/app-config-store'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const examId = url.searchParams.get('examId')
    const [globalSettings, examMetadata] = await Promise.all([
      getSecuritySettings(),
      examId ? getExamMetadata(examId) : Promise.resolve(null),
    ])

    if (!examMetadata) {
      return NextResponse.json(globalSettings)
    }

    return NextResponse.json({
      ...globalSettings,
      ...examMetadata.security,
      maxTabSwitches: globalSettings.maxTabSwitches,
      warningMessage: globalSettings.warningMessage,
    })
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
