import { promises as fs } from 'fs'
import path from 'path'

export type SecuritySettings = {
  forceFullscreen: boolean
  cancelOnTabSwitch: boolean
  disableCopyPaste: boolean
  disableRightClick: boolean
  disableDevTools: boolean
  enableScreenRecording: boolean
  enableWebcamMonitoring: boolean
  randomizeQuestions: boolean
  randomizeTestCases: boolean
  maxTabSwitches: number
  warningMessage: string
}

export type ProfileSettings = {
  name: string
  email: string
  department: string
  college: string
  notifications: {
    examStart: boolean
    examEnd: boolean
    suspicious: boolean
    submission: boolean
  }
  examDefaults: {
    timezone: string
    autoPublish: boolean
    resultVisibility: string
  }
}

export type ExamMetadata = {
  startTime: string
  endTime: string
  maxAttempts: number
  status: 'draft' | 'published' | 'active' | 'completed'
  security: Omit<SecuritySettings, 'maxTabSwitches' | 'warningMessage'>
}

export type CodingQuestionMetadata = {
  allowedLanguages: string[]
}

type AppConfig = {
  profile: ProfileSettings
  security: SecuritySettings
  examMetadata: Record<string, ExamMetadata>
  codingQuestionMetadata: Record<string, CodingQuestionMetadata>
}

export const defaultSecuritySettings: SecuritySettings = {
  forceFullscreen: true,
  cancelOnTabSwitch: true,
  disableCopyPaste: true,
  disableRightClick: true,
  disableDevTools: true,
  enableScreenRecording: true,
  enableWebcamMonitoring: true,
  randomizeQuestions: true,
  randomizeTestCases: false,
  maxTabSwitches: 2,
  warningMessage: 'Warning: Suspicious activity detected. Further violations will terminate your exam.',
}

export const defaultExamMetadata: ExamMetadata = {
  startTime: '',
  endTime: '',
  maxAttempts: 1,
  status: 'draft',
  security: {
    forceFullscreen: defaultSecuritySettings.forceFullscreen,
    cancelOnTabSwitch: defaultSecuritySettings.cancelOnTabSwitch,
    disableCopyPaste: defaultSecuritySettings.disableCopyPaste,
    disableRightClick: defaultSecuritySettings.disableRightClick,
    disableDevTools: defaultSecuritySettings.disableDevTools,
    enableScreenRecording: defaultSecuritySettings.enableScreenRecording,
    enableWebcamMonitoring: defaultSecuritySettings.enableWebcamMonitoring,
    randomizeQuestions: defaultSecuritySettings.randomizeQuestions,
    randomizeTestCases: defaultSecuritySettings.randomizeTestCases,
  },
}

export const defaultProfileSettings: ProfileSettings = {
  name: '',
  email: '',
  department: '',
  college: '',
  notifications: {
    examStart: true,
    examEnd: true,
    suspicious: true,
    submission: false,
  },
  examDefaults: {
    timezone: 'Asia/Kolkata',
    autoPublish: false,
    resultVisibility: 'after_exam',
  },
}

function getRepoRoot() {
  return path.resolve(process.cwd(), '..')
}

function getConfigPath() {
  return path.join(getRepoRoot(), '.data', 'app-config.json')
}

async function readConfig(): Promise<AppConfig> {
  const configPath = getConfigPath()

  try {
    const raw = await fs.readFile(configPath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<AppConfig>

    return {
      profile: {
        ...defaultProfileSettings,
        ...parsed.profile,
        notifications: {
          ...defaultProfileSettings.notifications,
          ...parsed.profile?.notifications,
        },
        examDefaults: {
          ...defaultProfileSettings.examDefaults,
          ...parsed.profile?.examDefaults,
        },
      },
      security: {
        ...defaultSecuritySettings,
        ...parsed.security,
      },
      examMetadata: parsed.examMetadata || {},
      codingQuestionMetadata: parsed.codingQuestionMetadata || {},
    }
  } catch {
    return {
      profile: defaultProfileSettings,
      security: defaultSecuritySettings,
      examMetadata: {},
      codingQuestionMetadata: {},
    }
  }
}

async function writeConfig(config: AppConfig) {
  const configPath = getConfigPath()
  await fs.mkdir(path.dirname(configPath), { recursive: true })
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8')
}

export async function getSecuritySettings() {
  const config = await readConfig()
  return config.security
}

export async function saveSecuritySettings(settings: Partial<SecuritySettings>) {
  const config = await readConfig()
  config.security = {
    ...config.security,
    ...settings,
  }
  await writeConfig(config)
  return config.security
}

export async function getProfileSettings() {
  const config = await readConfig()
  return config.profile
}

export async function saveProfileSettings(profile: Partial<ProfileSettings>) {
  const config = await readConfig()
  config.profile = {
    ...config.profile,
    ...profile,
    notifications: {
      ...config.profile.notifications,
      ...profile.notifications,
    },
    examDefaults: {
      ...config.profile.examDefaults,
      ...profile.examDefaults,
    },
  }
  await writeConfig(config)
  return config.profile
}

export async function getExamMetadata(examId: string) {
  const config = await readConfig()
  return {
    ...defaultExamMetadata,
    ...config.examMetadata[examId],
    security: {
      ...defaultExamMetadata.security,
      ...config.examMetadata[examId]?.security,
    },
  }
}

export async function getAllExamMetadata() {
  const config = await readConfig()
  return config.examMetadata
}

export async function saveExamMetadata(examId: string, metadata: Partial<ExamMetadata>) {
  const config = await readConfig()
  const existing = config.examMetadata[examId] || defaultExamMetadata

  config.examMetadata[examId] = {
    ...existing,
    ...metadata,
    security: {
      ...existing.security,
      ...metadata.security,
    },
  }

  await writeConfig(config)
  return config.examMetadata[examId]
}

export async function deleteExamMetadata(examId: string) {
  const config = await readConfig()
  delete config.examMetadata[examId]
  await writeConfig(config)
}

export async function getCodingQuestionMetadata(questionId: string) {
  const config = await readConfig()
  return config.codingQuestionMetadata[questionId] || { allowedLanguages: ['python'] }
}

export async function getAllCodingQuestionMetadata() {
  const config = await readConfig()
  return config.codingQuestionMetadata
}

export async function saveCodingQuestionMetadata(questionId: string, metadata: Partial<CodingQuestionMetadata>) {
  const config = await readConfig()
  const existing = config.codingQuestionMetadata[questionId] || { allowedLanguages: ['python'] }

  config.codingQuestionMetadata[questionId] = {
    ...existing,
    ...metadata,
    allowedLanguages: metadata.allowedLanguages && metadata.allowedLanguages.length > 0
      ? metadata.allowedLanguages
      : existing.allowedLanguages,
  }

  await writeConfig(config)
  return config.codingQuestionMetadata[questionId]
}

export async function deleteCodingQuestionMetadata(questionId: string) {
  const config = await readConfig()
  delete config.codingQuestionMetadata[questionId]
  await writeConfig(config)
}
