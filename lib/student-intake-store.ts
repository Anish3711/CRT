import { promises as fs } from 'fs'
import path from 'path'

export type StoredIntakeResponse = {
  attemptId: string
  examId: string
  studentName: string
  rollNo: string
  createdAt: string
  responses: Record<string, string>
}

function getRepoRoot() {
  const cwd = process.cwd()
  return cwd.endsWith('student_portal') ? path.resolve(cwd, '..') : cwd
}

function getStorePath() {
  return path.join(getRepoRoot(), '.data', 'student-intake-responses.json')
}

async function readStore() {
  try {
    const raw = await fs.readFile(getStorePath(), 'utf8')
    return JSON.parse(raw) as Record<string, StoredIntakeResponse>
  } catch {
    return {}
  }
}

export async function saveStudentIntakeResponse(entry: StoredIntakeResponse) {
  const store = await readStore()
  store[entry.attemptId] = entry

  const storePath = getStorePath()
  await fs.mkdir(path.dirname(storePath), { recursive: true })
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), 'utf8')
}

