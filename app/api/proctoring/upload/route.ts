import { promises as fs } from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

type ProctoringManifestEntry = {
  kind: string
  filename: string
  segmentIndex: number
  size: number
  uploadedAt: string
}

function getRepoRoot() {
  const cwd = process.cwd()
  return cwd.endsWith('student_portal') ? path.resolve(cwd, '..') : cwd
}

function getAttemptDirectory(attemptId: string) {
  return path.join(getRepoRoot(), '.data', 'proctoring', attemptId)
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '')
}

async function appendManifestEntry(attemptId: string, entry: ProctoringManifestEntry) {
  const attemptDirectory = getAttemptDirectory(attemptId)
  const manifestPath = path.join(attemptDirectory, 'manifest.json')

  let manifest: ProctoringManifestEntry[] = []

  try {
    const rawManifest = await fs.readFile(manifestPath, 'utf8')
    manifest = JSON.parse(rawManifest) as ProctoringManifestEntry[]
  } catch {
    manifest = []
  }

  manifest.push(entry)
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const attemptId = String(formData.get('attemptId') || '').trim()
    const kind = sanitizeSegment(String(formData.get('kind') || 'other'))
    const segmentIndex = Number.parseInt(String(formData.get('segmentIndex') || '0'), 10)
    const file = formData.get('file')

    if (!attemptId || !file || typeof file === 'string') {
      return NextResponse.json({ error: 'attemptId and recording file are required' }, { status: 400 })
    }

    const attemptDirectory = getAttemptDirectory(attemptId)
    await fs.mkdir(attemptDirectory, { recursive: true })

    const extension = file.type.includes('webm')
      ? 'webm'
      : file.type.includes('mp4')
        ? 'mp4'
        : 'bin'

    const filename = `${kind}-${String(Number.isFinite(segmentIndex) ? segmentIndex : 0).padStart(4, '0')}-${Date.now()}.${extension}`
    const filePath = path.join(attemptDirectory, filename)
    const buffer = Buffer.from(await file.arrayBuffer())

    await fs.writeFile(filePath, buffer)
    await appendManifestEntry(attemptId, {
      kind,
      filename,
      segmentIndex: Number.isFinite(segmentIndex) ? segmentIndex : 0,
      size: buffer.byteLength,
      uploadedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, filename })
  } catch (error) {
    console.error('proctoring upload error:', error)
    return NextResponse.json({ error: 'Failed to store proctoring segment' }, { status: 500 })
  }
}
