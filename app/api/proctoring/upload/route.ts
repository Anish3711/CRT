import { promises as fs } from 'fs'
import os from 'os'
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

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '')
}

let cachedProctoringBaseDirectory: string | null = null

async function resolveWritableProctoringBaseDirectory() {
  if (cachedProctoringBaseDirectory) {
    return cachedProctoringBaseDirectory
  }

  const envDirectory = process.env.PROCTORING_STORAGE_DIR?.trim()
  const candidates = [
    envDirectory || '',
    path.join(getRepoRoot(), '.data', 'proctoring'),
    path.join(os.tmpdir(), 'spec-crt-proctoring'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      await fs.mkdir(candidate, { recursive: true })
      const probeFile = path.join(candidate, '.probe-write')
      await fs.writeFile(probeFile, 'ok', 'utf8')
      await fs.unlink(probeFile).catch(() => {})
      cachedProctoringBaseDirectory = candidate
      return candidate
    } catch (error) {
      console.warn(`proctoring storage candidate unavailable: ${candidate}`, error)
    }
  }

  throw new Error('No writable directory available for proctoring uploads')
}

async function getAttemptDirectory(attemptId: string) {
  const baseDirectory = await resolveWritableProctoringBaseDirectory()
  return path.join(baseDirectory, attemptId)
}

async function appendManifestEntry(attemptDirectory: string, entry: ProctoringManifestEntry) {
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
    const attemptId = sanitizeSegment(String(formData.get('attemptId') || '').trim())
    const kind = sanitizeSegment(String(formData.get('kind') || 'other'))
    const segmentIndex = Number.parseInt(String(formData.get('segmentIndex') || '0'), 10)
    const file = formData.get('file')

    if (!attemptId || !file || typeof file === 'string') {
      return NextResponse.json({ error: 'attemptId and recording file are required' }, { status: 400 })
    }

    const attemptDirectory = await getAttemptDirectory(attemptId)
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
    await appendManifestEntry(attemptDirectory, {
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
