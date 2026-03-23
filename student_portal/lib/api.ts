import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

type ExamRow = {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  total_questions: number | null
  created_at: string
}

type McqOptionRow = {
  option_key: string | null
  option_text: string | null
  is_correct: boolean | null
}

type MCQQuestionRow = {
  id: string
  question_text: string
  exam_id: string
  created_at: string
  mcq_options?: McqOptionRow[] | null
}

type CodingTestCaseRow = {
  id: string
  input_data: string | null
  input: string | null
  expected_output: string | null
  is_hidden: boolean | null
  is_visible?: boolean | null
}

type CodingQuestionDetailRow = {
  id?: string
  question_id?: string
  title: string | null
  description: string | null
  input_format: string | null
  output_format: string | null
  constraints: string | null
  starter_code: string | null
  solution_code: string | null
  language: string | null
  time_limit: number | null
  memory_limit: number | null
  test_cases?: CodingTestCaseRow[] | null
}

type CodingQuestionRow = {
  id: string
  question_text: string
  exam_id: string
  created_at: string
  coding_questions?: CodingQuestionDetailRow[] | null
}

export type Exam = {
  id: string
  title: string
  description: string
  type: "mcq" | "coding" | "mixed"
  duration: number
  startTime: string
  endTime: string
  maxAttempts: number
  status: "draft" | "published" | "active" | "completed"
  questionCount: number
  security: SecuritySettings
  createdAt: string
}

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
}

export type MCQQuestion = {
  id: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: "A" | "B" | "C" | "D"
  examId: string
  createdAt: string
}

export type TestCase = {
  id: string
  input: string
  expectedOutput: string
  isHidden: boolean
}

export type CodingProblem = {
  id: string
  title: string
  description: string
  inputFormat: string
  outputFormat: string
  constraints: string
  sampleInput: string
  sampleOutput: string
  testCases: TestCase[]
  allowedLanguages: string[]
  timeLimit: number
  memoryLimit: number
  examId: string
  createdAt: string
}

export type StudentAttempt = {
  id: string
  studentName: string
  rollNumber: string
  examId: string
  examName: string
  currentQuestion: number
  totalQuestions: number
  suspiciousCount: number
  status: "active" | "completed" | "terminated"
  score: number
  correctAnswers: number
  wrongAnswers: number
  timeTaken: string
  submissionTime: string
  activityLogs: ActivityLog[]
  passingScore?: number
}

export type ActivityLog = {
  id: string
  type: "tab_switch" | "fullscreen_exit" | "copy_attempt" | "paste_attempt" | string
  timestamp: string
  description: string
}

export type CodingSubmission = {
  id: string
  studentName: string
  problemTitle: string
  language: string
  code: string
  testCasesPassed: number
  testCasesFailed: number
  executionTime: string
  memoryUsage: string
}

export const defaultSecurity: SecuritySettings = {
  forceFullscreen: true,
  cancelOnTabSwitch: true,
  disableCopyPaste: true,
  disableRightClick: true,
  disableDevTools: true,
  enableScreenRecording: false,
  enableWebcamMonitoring: false,
  randomizeQuestions: true,
  randomizeTestCases: false,
}

const defaultExamMetadata: {
  startTime: string
  endTime: string
  maxAttempts: number
  status: Exam['status']
  security: SecuritySettings
} = {
  startTime: '',
  endTime: '',
  maxAttempts: 1,
  status: 'draft' as const,
  security: defaultSecurity,
}

async function loadConfigStore() {
  return import('@/lib/app-config-store')
}

function normalizeAllowedLanguages(allowedLanguages?: string[] | null, fallback = 'python') {
  const normalized = (allowedLanguages || [])
    .map((language) => language?.trim().toLowerCase())
    .filter((language): language is string => Boolean(language))

  return normalized.length > 0 ? Array.from(new Set(normalized)) : [fallback]
}

function validateCodingProblemInput(
  data: Pick<CodingProblem, 'title' | 'description' | 'timeLimit' | 'memoryLimit' | 'testCases'>
) {
  if (!data.title?.trim() && !data.description?.trim()) {
    throw new Error('Coding problem title is required.')
  }

  if (!Number.isFinite(data.timeLimit) || data.timeLimit <= 0) {
    throw new Error('Time limit must be a positive number.')
  }

  if (!Number.isFinite(data.memoryLimit) || data.memoryLimit <= 0) {
    throw new Error('Memory limit must be a positive number.')
  }

  if (!Array.isArray(data.testCases) || data.testCases.length === 0) {
    throw new Error('Add at least one test case before saving the coding problem.')
  }

  for (const [index, testCase] of data.testCases.entries()) {
    const hasInput = testCase.input.trim().length > 0
    const hasExpectedOutput = testCase.expectedOutput.trim().length > 0

    if (!hasInput && !hasExpectedOutput) {
      throw new Error(`Test case ${index + 1} cannot have both input and expected output empty.`)
    }
  }
}

function isMissingColumnError(error: unknown, columnName: string) {
  const message = error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : ''
  const normalized = message.toLowerCase()
  const needle = columnName.toLowerCase()

  return (
    normalized.includes(`could not find the '${needle}' column`) ||
    normalized.includes(`column test_cases.${needle} does not exist`) ||
    normalized.includes(`column coding_questions.${needle} does not exist`) ||
    normalized.includes(`column ${needle} does not exist`)
  )
}

function buildExtendedCodingPayload(
  questionId: string,
  data: Pick<CodingProblem, 'sampleInput' | 'sampleOutput' | 'title' | 'description' | 'inputFormat' | 'outputFormat' | 'constraints' | 'timeLimit' | 'memoryLimit'>,
  selectedLanguage: string,
) {
  return {
    question_id: questionId,
    language: selectedLanguage,
    starter_code: data.sampleInput || '',
    solution_code: data.sampleOutput || '',
    title: data.title || 'Untitled',
    description: data.description || '',
    input_format: data.inputFormat || '',
    output_format: data.outputFormat || '',
    constraints: data.constraints || '',
    time_limit: data.timeLimit || 2,
    memory_limit: data.memoryLimit || 256,
  }
}

function buildBasicCodingPayload(
  questionId: string,
  data: Pick<CodingProblem, 'sampleInput' | 'sampleOutput'>,
  selectedLanguage: string,
) {
  return {
    question_id: questionId,
    language: selectedLanguage,
    starter_code: data.sampleInput || '',
    solution_code: data.sampleOutput || '',
  }
}

async function insertCodingQuestionRecord(
  questionId: string,
  data: Pick<CodingProblem, 'sampleInput' | 'sampleOutput' | 'title' | 'description' | 'inputFormat' | 'outputFormat' | 'constraints' | 'timeLimit' | 'memoryLimit'>,
  selectedLanguage: string,
) {
  const extendedPayload = buildExtendedCodingPayload(questionId, data, selectedLanguage)
  const { data: extendedRow, error: extendedError } = await supabase
    .from('coding_questions')
    .insert(extendedPayload)
    .select()
    .single()

  if (!extendedError && extendedRow) {
    return extendedRow
  }

  const { data: basicRow, error: basicError } = await supabase
    .from('coding_questions')
    .insert(buildBasicCodingPayload(questionId, data, selectedLanguage))
    .select()
    .single()

  if (basicError) {
    throw basicError
  }

  return basicRow
}

async function updateCodingQuestionRecord(
  codingQuestionId: string,
  questionId: string,
  data: Partial<CodingProblem>,
  selectedLanguage: string,
) {
  const extendedPayload = buildExtendedCodingPayload(questionId, {
    sampleInput: data.sampleInput || '',
    sampleOutput: data.sampleOutput || '',
    title: data.title || 'Untitled',
    description: data.description || '',
    inputFormat: data.inputFormat || '',
    outputFormat: data.outputFormat || '',
    constraints: data.constraints || '',
    timeLimit: data.timeLimit || 2,
    memoryLimit: data.memoryLimit || 256,
  }, selectedLanguage)

  const { error: extendedError } = await supabase
    .from('coding_questions')
    .update(extendedPayload)
    .eq('id', codingQuestionId)

  if (!extendedError) {
    return
  }

  const { error: basicError } = await supabase
    .from('coding_questions')
    .update(buildBasicCodingPayload(questionId, {
      sampleInput: data.sampleInput || '',
      sampleOutput: data.sampleOutput || '',
    }, selectedLanguage))
    .eq('id', codingQuestionId)

  if (basicError) {
    throw basicError
  }
}

async function insertTestCases(codingQuestionId: string, testCases: TestCase[]) {
  if (testCases.length === 0) return

  const payloadVariants = [
    testCases.map((tc) => ({
      coding_question_id: codingQuestionId,
      input_data: tc.input,
      expected_output: tc.expectedOutput,
      is_hidden: tc.isHidden,
    })),
    testCases.map((tc) => ({
      coding_question_id: codingQuestionId,
      input_data: tc.input,
      expected_output: tc.expectedOutput,
      is_visible: !tc.isHidden,
    })),
    testCases.map((tc) => ({
      coding_question_id: codingQuestionId,
      input: tc.input,
      expected_output: tc.expectedOutput,
      is_hidden: tc.isHidden,
    })),
    testCases.map((tc) => ({
      coding_question_id: codingQuestionId,
      input: tc.input,
      expected_output: tc.expectedOutput,
      is_visible: !tc.isHidden,
    })),
  ]

  let lastError: unknown = null

  for (const payload of payloadVariants) {
    const { error } = await supabase.from('test_cases').insert(payload)
    if (!error) return

    lastError = error

    const isSchemaMismatch =
      isMissingColumnError(error, 'input_data') ||
      isMissingColumnError(error, 'is_hidden') ||
      isMissingColumnError(error, 'input') ||
      isMissingColumnError(error, 'is_visible')

    if (!isSchemaMismatch) {
      throw error
    }
  }

  throw lastError
}

function mapExamFromDB(dbExam: ExamRow, metadata = defaultExamMetadata): Exam {
  return {
    id: dbExam.id,
    title: dbExam.title,
    description: dbExam.description || '',
    type: "mixed",
    duration: dbExam.duration_minutes,
    startTime: metadata.startTime,
    endTime: metadata.endTime,
    maxAttempts: metadata.maxAttempts,
    status: metadata.status,
    questionCount: dbExam.total_questions || 0,
    security: metadata.security,
    createdAt: dbExam.created_at,
  }
}

function mapAttemptStatus(status: string): StudentAttempt["status"] {
  if (status === 'submitted') return 'completed'
  if (status === 'terminated') return 'terminated'
  return 'active'
}

function formatDuration(start: string, end?: string | null) {
  const startMs = Date.parse(start)
  const endMs = end ? Date.parse(end) : Date.now()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return '0m'
  }

  const totalMinutes = Math.max(0, Math.round((endMs - startMs) / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

function countAnsweredQuestions(answers: unknown) {
  if (!answers || typeof answers !== 'object') return 0
  return Object.values(answers as Record<string, unknown>).filter((value) => {
    if (typeof value === 'string') return value.trim().length > 0
    return value !== null && value !== undefined
  }).length
}

export const examApi = {
  getAll: async (): Promise<Exam[]> => {
    const [{ data, error }, { getAllExamMetadata }] = await Promise.all([
      supabase.from('exams').select('*').order('created_at', { ascending: false }),
      loadConfigStore(),
    ])

    if (error) throw error
    const metadata = await getAllExamMetadata()
    return (data || []).map((exam) => mapExamFromDB(exam, metadata[exam.id] || defaultExamMetadata))
  },

  getById: async (id: string): Promise<Exam> => {
    const [{ data, error }, { getExamMetadata }] = await Promise.all([
      supabase.from('exams').select('*').eq('id', id).single(),
      loadConfigStore(),
    ])

    if (error) throw error
    const metadata = await getExamMetadata(id)
    return mapExamFromDB(data, metadata)
  },

  create: async (data: Omit<Exam, "id" | "createdAt" | "questionCount">): Promise<Exam> => {
    const { data: result, error } = await supabase
      .from('exams')
      .insert({
        title: data.title,
        description: data.description,
        duration_minutes: data.duration,
        total_questions: 0,
        passing_score: 60,
      })
      .select()
      .single()

    if (error) throw error

    const { saveExamMetadata } = await loadConfigStore()
    const metadata = await saveExamMetadata(result.id, {
      startTime: data.startTime,
      endTime: data.endTime,
      maxAttempts: data.maxAttempts,
      status: data.status,
      security: data.security,
    })

    return mapExamFromDB(result, metadata)
  },

  update: async (id: string, data: Partial<Exam>): Promise<Exam> => {
    const updates: Record<string, unknown> = {}
    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.duration !== undefined) updates.duration_minutes = data.duration

    const { data: result, error } = await supabase
      .from('exams')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const { saveExamMetadata } = await loadConfigStore()
    const metadata = await saveExamMetadata(id, {
      startTime: data.startTime,
      endTime: data.endTime,
      maxAttempts: data.maxAttempts,
      status: data.status,
      security: data.security,
    })

    return mapExamFromDB(result, metadata)
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const { error } = await supabase.from('exams').delete().eq('id', id)
    if (error) throw error
    const { deleteExamMetadata } = await loadConfigStore()
    await deleteExamMetadata(id)
    return { success: true }
  },

  publish: async (id: string): Promise<Exam> => {
    const { saveExamMetadata } = await loadConfigStore()
    await saveExamMetadata(id, { status: 'published' })
    return examApi.getById(id)
  },
}

export const questionApi = {
  getByExam: async (examId: string): Promise<MCQQuestion[]> => {
    const { data, error } = await supabase
      .from('questions')
      .select('*, mcq_options(*)')
      .eq('exam_id', examId)
      .eq('question_type', 'mcq')
      .order('order_index', { ascending: true })

    if (error) throw error

    return ((data || []) as MCQQuestionRow[]).map((q) => {
      const opts = (q.mcq_options || []).sort((a, b) =>
        (a.option_key || '').localeCompare(b.option_key || '')
      )
      const correctOpt = opts.find((option) => option.is_correct)

      return {
        id: q.id,
        questionText: q.question_text,
        optionA: opts.find((option) => option.option_key === 'A')?.option_text || '',
        optionB: opts.find((option) => option.option_key === 'B')?.option_text || '',
        optionC: opts.find((option) => option.option_key === 'C')?.option_text || '',
        optionD: opts.find((option) => option.option_key === 'D')?.option_text || '',
        correctAnswer: (correctOpt?.option_key || 'A') as "A" | "B" | "C" | "D",
        examId: q.exam_id,
        createdAt: q.created_at,
      }
    })
  },

  create: async (examId: string, data: Omit<MCQQuestion, "id" | "createdAt" | "examId">): Promise<MCQQuestion> => {
    const { data: qList } = await supabase.from('questions').select('order_index').eq('exam_id', examId)
    const orderIndex = qList ? qList.length + 1 : 1

    const { data: qData, error: qError } = await supabase
      .from('questions')
      .insert({
        exam_id: examId,
        question_type: 'mcq',
        question_text: data.questionText,
        points: 1,
        difficulty: 'medium',
        order_index: orderIndex,
      })
      .select()
      .single()

    if (qError) throw qError

    const { error: optsError } = await supabase.from('mcq_options').insert([
      { question_id: qData.id, option_text: data.optionA, is_correct: data.correctAnswer === 'A', option_key: 'A' },
      { question_id: qData.id, option_text: data.optionB, is_correct: data.correctAnswer === 'B', option_key: 'B' },
      { question_id: qData.id, option_text: data.optionC, is_correct: data.correctAnswer === 'C', option_key: 'C' },
      { question_id: qData.id, option_text: data.optionD, is_correct: data.correctAnswer === 'D', option_key: 'D' },
    ])

    if (optsError) throw optsError

    const { data: examData } = await supabase.from('exams').select('total_questions').eq('id', examId).single()
    await supabase.from('exams').update({ total_questions: (examData?.total_questions || 0) + 1 }).eq('id', examId)

    return { id: qData.id, ...data, examId, createdAt: qData.created_at }
  },

  update: async (examId: string, qId: string, data: Partial<MCQQuestion>): Promise<MCQQuestion> => {
    const { error: questionError } = await supabase
      .from('questions')
      .update({
        question_text: data.questionText,
      })
      .eq('id', qId)
      .eq('exam_id', examId)

    if (questionError) throw questionError

    const optionUpdates = [
      { key: 'A', text: data.optionA, isCorrect: data.correctAnswer === 'A' },
      { key: 'B', text: data.optionB, isCorrect: data.correctAnswer === 'B' },
      { key: 'C', text: data.optionC, isCorrect: data.correctAnswer === 'C' },
      { key: 'D', text: data.optionD, isCorrect: data.correctAnswer === 'D' },
    ]

    for (const option of optionUpdates) {
      const { error } = await supabase
        .from('mcq_options')
        .update({
          option_text: option.text,
          is_correct: option.isCorrect,
        })
        .eq('question_id', qId)
        .eq('option_key', option.key)

      if (error) throw error
    }

    const [updated] = await questionApi.getByExam(examId).then((questions) => questions.filter((question) => question.id === qId))
    if (!updated) throw new Error('Question update did not return a row')
    return updated
  },

  delete: async (examId: string, qId: string): Promise<{ success: boolean }> => {
    const { error } = await supabase.from('questions').delete().eq('id', qId)
    if (error) throw error

    const { data: examData } = await supabase.from('exams').select('total_questions').eq('id', examId).single()
    if (examData && examData.total_questions > 0) {
      await supabase.from('exams').update({ total_questions: examData.total_questions - 1 }).eq('id', examId)
    }

    return { success: true }
  },
}

export const codingApi = {
  getByExam: async (examId: string): Promise<CodingProblem[]> => {
    const { getAllCodingQuestionMetadata } = await loadConfigStore()
    const { data: questions, error: questionError } = await supabase
      .from('questions')
      .select('id, question_text, exam_id, created_at')
      .eq('exam_id', examId)
      .eq('question_type', 'coding')
      .order('order_index', { ascending: true })

    if (questionError) throw questionError

    const codingQuestionIds = (questions || []).map((question) => question.id)
    const { data: codingDetails, error: codingError } = codingQuestionIds.length === 0
      ? { data: [] as Array<CodingQuestionDetailRow & { id: string; question_id: string }>, error: null }
      : await supabase
          .from('coding_questions')
          .select('*')
          .in('question_id', codingQuestionIds)

    if (codingError) throw codingError

    const codingByQuestionId = new Map<string, CodingQuestionDetailRow & { id: string; question_id: string }>()
    for (const codingDetail of codingDetails || []) {
      codingByQuestionId.set(codingDetail.question_id, codingDetail)
    }

    const codingRecordIds = (codingDetails || []).map((item) => item.id)
    let testCaseRows: Array<CodingTestCaseRow & { coding_question_id: string }> = []
    let testCaseError: { message?: string } | null = null

    if (codingRecordIds.length > 0) {
      const selectVariants = [
        'id, coding_question_id, input_data, expected_output, is_hidden',
        'id, coding_question_id, input_data, expected_output, is_visible',
        'id, coding_question_id, input, expected_output, is_hidden',
        'id, coding_question_id, input, expected_output, is_visible',
      ]

      for (const selectClause of selectVariants) {
        const result = await supabase
          .from('test_cases')
          .select(selectClause)
          .in('coding_question_id', codingRecordIds)

        if (!result.error) {
          testCaseRows = ((result.data || []) as unknown as Array<Record<string, unknown>>).map((row) => ({
            id: String(row.id ?? ''),
            coding_question_id: String(row.coding_question_id ?? ''),
            input_data: 'input_data' in row ? String(row.input_data ?? '') : null,
            input: 'input' in row ? String(row.input ?? '') : null,
            expected_output: String(row.expected_output ?? ''),
            is_hidden: 'is_hidden' in row
              ? Boolean(row.is_hidden)
              : ('is_visible' in row ? row.is_visible === false : null),
            is_visible: 'is_visible' in row ? Boolean(row.is_visible) : undefined,
          }))
          testCaseError = null
          break
        }

        const isSchemaMismatch =
          isMissingColumnError(result.error, 'input_data') ||
          isMissingColumnError(result.error, 'is_hidden') ||
          isMissingColumnError(result.error, 'input') ||
          isMissingColumnError(result.error, 'is_visible')

        if (!isSchemaMismatch) {
          testCaseError = result.error
          break
        }

        testCaseError = result.error
      }
    }

    if (testCaseError) throw testCaseError
    const codingMetadata = await getAllCodingQuestionMetadata()

    const testCasesByCodingId = new Map<string, Array<CodingTestCaseRow & { coding_question_id: string }>>()
    for (const testCase of testCaseRows || []) {
      const current = testCasesByCodingId.get(testCase.coding_question_id) || []
      current.push(testCase)
      testCasesByCodingId.set(testCase.coding_question_id, current)
    }

    return ((questions || []) as Array<Pick<CodingQuestionRow, 'id' | 'question_text' | 'exam_id' | 'created_at'>>).map((q) => {
      const cq = codingByQuestionId.get(q.id)
      const cases = cq ? (testCasesByCodingId.get(cq.id) || []) : []
      const allowedLanguages = normalizeAllowedLanguages(
        codingMetadata[q.id]?.allowedLanguages,
        cq?.language || 'python'
      )

      return {
        id: q.id,
        title: cq?.title || q.question_text || 'Untitled',
        description: cq?.description || '',
        inputFormat: cq?.input_format || '',
        outputFormat: cq?.output_format || '',
        constraints: cq?.constraints || '',
        sampleInput: cq?.starter_code || '',
        sampleOutput: cq?.solution_code || '',
        testCases: cases.map((tc: CodingTestCaseRow) => ({
          id: tc.id,
          input: tc.input_data || tc.input || '',
          expectedOutput: tc.expected_output || '',
          isHidden: tc.is_hidden || tc.is_visible === false,
        })),
        allowedLanguages,
        timeLimit: cq?.time_limit || 2,
        memoryLimit: cq?.memory_limit || 256,
        examId: q.exam_id,
        createdAt: q.created_at,
      }
    })
  },

  create: async (examId: string, data: Omit<CodingProblem, "id" | "createdAt" | "examId">): Promise<CodingProblem> => {
    validateCodingProblemInput(data)
    const { data: qList } = await supabase.from('questions').select('order_index').eq('exam_id', examId)
    const orderIndex = qList ? qList.length + 1 : 1
    const allowedLanguages = normalizeAllowedLanguages(data.allowedLanguages)
    const selectedLanguage = allowedLanguages[0]

    const { data: qData, error: qError } = await supabase
      .from('questions')
      .insert({
        exam_id: examId,
        question_type: 'coding',
        question_text: data.title || data.description || 'Untitled',
        points: 10,
        difficulty: 'medium',
        order_index: orderIndex,
      })
      .select()
      .single()

    if (qError) throw qError

    let cqData
    try {
      cqData = await insertCodingQuestionRecord(qData.id, data, selectedLanguage)
    } catch (error) {
      await supabase.from('questions').delete().eq('id', qData.id)
      throw error
    }

    try {
      await insertTestCases(cqData.id, data.testCases || [])
    } catch (error) {
      await supabase.from('questions').delete().eq('id', qData.id)
      throw error
    }

    const { data: examData } = await supabase.from('exams').select('total_questions').eq('id', examId).single()
    await supabase.from('exams').update({ total_questions: (examData?.total_questions || 0) + 1 }).eq('id', examId)

    const { saveCodingQuestionMetadata } = await loadConfigStore()
    await saveCodingQuestionMetadata(qData.id, { allowedLanguages })

    return { id: qData.id, ...data, allowedLanguages, examId, createdAt: qData.created_at }
  },

  update: async (examId: string, pId: string, data: Partial<CodingProblem>): Promise<CodingProblem> => {
    if (data.title || data.description || data.timeLimit || data.memoryLimit || data.testCases) {
      validateCodingProblemInput({
        title: data.title || '',
        description: data.description || '',
        timeLimit: data.timeLimit || 2,
        memoryLimit: data.memoryLimit || 256,
        testCases: data.testCases || [],
      })
    }

    const allowedLanguages = normalizeAllowedLanguages(data.allowedLanguages)
    const selectedLanguage = allowedLanguages[0]

    const { data: existingQuestion, error: questionLookupError } = await supabase
      .from('questions')
      .select('id, exam_id')
      .eq('id', pId)
      .eq('exam_id', examId)
      .single()

    if (questionLookupError) throw questionLookupError

    const { error: questionError } = await supabase
      .from('questions')
      .update({
        question_text: data.title || data.description || 'Untitled',
      })
      .eq('id', existingQuestion.id)

    if (questionError) throw questionError

    const { data: codingRow, error: codingLookupError } = await supabase
      .from('coding_questions')
      .select('id')
      .eq('question_id', pId)
      .maybeSingle()

    if (codingLookupError) throw codingLookupError

    let codingQuestionId = codingRow?.id
    if (!codingQuestionId) {
      const insertedRow = await insertCodingQuestionRecord(pId, {
        sampleInput: data.sampleInput || '',
        sampleOutput: data.sampleOutput || '',
        title: data.title || 'Untitled',
        description: data.description || '',
        inputFormat: data.inputFormat || '',
        outputFormat: data.outputFormat || '',
        constraints: data.constraints || '',
        timeLimit: data.timeLimit || 2,
        memoryLimit: data.memoryLimit || 256,
      }, selectedLanguage)
      codingQuestionId = insertedRow.id
    } else {
      await updateCodingQuestionRecord(codingQuestionId, pId, data, selectedLanguage)
    }

    if (data.testCases) {
      const { error: deleteError } = await supabase.from('test_cases').delete().eq('coding_question_id', codingQuestionId)
      if (deleteError) throw deleteError

      if (data.testCases.length > 0) {
        await insertTestCases(codingQuestionId, data.testCases)
      }
    }

    const { saveCodingQuestionMetadata } = await loadConfigStore()
    await saveCodingQuestionMetadata(pId, { allowedLanguages })

    const [updated] = await codingApi.getByExam(examId).then((problems) => problems.filter((problem) => problem.id === pId))
    if (!updated) throw new Error('Coding problem update did not return a row')
    return updated
  },

  delete: async (examId: string, pId: string): Promise<{ success: boolean }> => {
    const { error } = await supabase.from('questions').delete().eq('id', pId)
    if (error) throw error

    const { data: examData } = await supabase.from('exams').select('total_questions').eq('id', examId).single()
    if (examData && examData.total_questions > 0) {
      await supabase.from('exams').update({ total_questions: examData.total_questions - 1 }).eq('id', examId)
    }

    const { deleteCodingQuestionMetadata } = await loadConfigStore()
    await deleteCodingQuestionMetadata(pId)

    return { success: true }
  },
}

export const monitorApi = {
  getActiveSessions: async (examId?: string): Promise<StudentAttempt[]> => {
    let query = supabase
      .from('guest_attempts')
      .select('*, exams(title, total_questions, passing_score)')

    if (examId) query = query.eq('exam_id', examId)

    const { data, error } = await query.order('start_time', { ascending: false })
    if (error) throw error

    return (data || []).map((attempt) => {
      const answeredCount = countAnsweredQuestions(attempt.answers)
      const totalQuestions = attempt.total_questions || attempt.exams?.total_questions || 0

      return {
        id: attempt.id,
        studentName: attempt.name || 'Unknown',
        rollNumber: attempt.roll_no || 'Unknown',
        examId: attempt.exam_id,
        examName: attempt.exams?.title || 'Unknown Exam',
        currentQuestion: Math.min(answeredCount, totalQuestions),
        totalQuestions,
        suspiciousCount: Array.isArray(attempt.violations) ? attempt.violations.length : 0,
        status: mapAttemptStatus(attempt.status),
        score: attempt.score || 0,
        correctAnswers: attempt.correct_answers || 0,
        wrongAnswers: attempt.wrong_answers || 0,
        timeTaken: formatDuration(attempt.start_time, attempt.submitted_at),
        submissionTime: attempt.submitted_at || attempt.start_time,
        activityLogs: Array.isArray(attempt.violations) ? attempt.violations : [],
        passingScore: attempt.exams?.passing_score || 60,
      }
    })
  },

  terminateSession: async (attemptId: string): Promise<{ success: boolean }> => {
    const { data: currentAttempt, error: lookupError } = await supabase
      .from('guest_attempts')
      .select('violations')
      .eq('id', attemptId)
      .single()

    if (lookupError) throw lookupError

    const violations = Array.isArray(currentAttempt?.violations) ? [...currentAttempt.violations] : []
    violations.push({
      id: `terminate-${Date.now()}`,
      type: 'terminated',
      description: 'Session terminated by an administrator.',
      timestamp: new Date().toISOString(),
    })

    const { error } = await supabase
      .from('guest_attempts')
      .update({
        status: 'terminated',
        submitted_at: new Date().toISOString(),
        violations,
      })
      .eq('id', attemptId)

    if (error) throw error
    return { success: true }
  },
}

export const resultsApi = {
  getByExam: async (examId?: string): Promise<StudentAttempt[]> => {
    return monitorApi.getActiveSessions(examId)
  },

  getCodingSubmissions: async (examId?: string): Promise<CodingSubmission[]> => {
    let attemptsQuery = supabase
      .from('guest_attempts')
      .select('id, name, exam_id, answers, status')
      .not('answers', 'is', null)

    if (examId) {
      attemptsQuery = attemptsQuery.eq('exam_id', examId)
    }

    const { data: attempts, error: attemptsError } = await attemptsQuery
    if (attemptsError) throw attemptsError

    const relevantAttempts = (attempts || []).filter((attempt) => attempt.status === 'submitted' || attempt.status === 'terminated')
    if (relevantAttempts.length === 0) return []

    const examIds = Array.from(new Set(relevantAttempts.map((attempt) => attempt.exam_id)))
    const { data: codingQuestions, error: questionsError } = await supabase
      .from('questions')
      .select('id, exam_id, coding_questions(language, title)')
      .in('exam_id', examIds)
      .eq('question_type', 'coding')

    if (questionsError) throw questionsError

    const codingQuestionMap = new Map<string, { title: string; language: string; totalTests: number }>()
    for (const question of codingQuestions || []) {
      const coding = question.coding_questions?.[0]
      if (!coding) continue
      codingQuestionMap.set(question.id, {
        title: coding.title || 'Untitled Problem',
        language: coding.language || 'python',
        totalTests: 0,
      })
    }

    const submissions: CodingSubmission[] = []
    for (const attempt of relevantAttempts) {
      const answers = attempt.answers && typeof attempt.answers === 'object' ? attempt.answers as Record<string, string> : {}
      for (const [questionId, code] of Object.entries(answers)) {
        const question = codingQuestionMap.get(questionId)
        if (!question || typeof code !== 'string' || !code.trim()) continue

        submissions.push({
          id: `${attempt.id}-${questionId}`,
          studentName: attempt.name || 'Unknown',
          problemTitle: question.title,
          language: question.language,
          code,
          testCasesPassed: 0,
          testCasesFailed: 0,
          executionTime: 'N/A',
          memoryUsage: 'N/A',
        })
      }
    }

    return submissions
  },
}

export type DashboardStats = {
  totalExams: number
  activeExams: number
  totalStudents: number
  averageScore: number
  recentExams: Exam[]
  recentAttempts: StudentAttempt[]
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { count: examCount } = await supabase.from('exams').select('*', { count: 'exact', head: true })
    const { count: sessionCount } = await supabase.from('guest_attempts').select('*', { count: 'exact', head: true })
    const exams = await examApi.getAll()
    const activeExams = exams.filter((exam) => exam.status === 'active' || exam.status === 'published').length

    const attempts = await monitorApi.getActiveSessions()
    const completedAttempts = attempts.filter((attempt) => attempt.status === 'completed')
    const avgScore = completedAttempts.length > 0
      ? Math.round(completedAttempts.reduce((acc, curr) => acc + curr.score, 0) / completedAttempts.length)
      : 0

    return {
      totalExams: examCount || 0,
      activeExams,
      totalStudents: sessionCount || 0,
      averageScore: avgScore,
      recentExams: exams.slice(0, 5),
      recentAttempts: attempts.slice(0, 5),
    }
  },
}
