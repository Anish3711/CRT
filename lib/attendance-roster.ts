export type AttendanceRosterEntry = {
  department: 'CSM'
  rollNumber: string
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function buildSuffixSequence() {
  const tokens: string[] = []

  for (let index = 1; index <= 99; index += 1) {
    tokens.push(String(index).padStart(2, '0'))
  }

  for (const letter of ALPHABET) {
    for (let digit = 0; digit <= 9; digit += 1) {
      tokens.push(`${letter}${digit}`)
    }
  }

  return tokens
}

const SUFFIX_SEQUENCE = buildSuffixSequence()
const SUFFIX_INDEX = new Map(SUFFIX_SEQUENCE.map((token, index) => [token, index]))

function expandRollRange(prefix: string, startSuffix: string, endSuffix: string) {
  const startIndex = SUFFIX_INDEX.get(startSuffix)
  const endIndex = SUFFIX_INDEX.get(endSuffix)

  if (startIndex === undefined || endIndex === undefined || endIndex < startIndex) {
    throw new Error(`Invalid attendance range: ${prefix}${startSuffix} - ${prefix}${endSuffix}`)
  }

  return SUFFIX_SEQUENCE
    .slice(startIndex, endIndex + 1)
    .map((suffix) => `${prefix}${suffix}`)
}

export function normalizeRollNumber(value: string) {
  return value.trim().toUpperCase()
}

export const CSM_ROLL_NUMBERS = [
  ...expandRollRange('23BK1A66', '01', '99'),
  ...expandRollRange('23BK1A66', 'A0', 'Y2'),
  ...expandRollRange('24BK5A66', '01', '39'),
]

const CSM_ROLL_NUMBER_SET = new Set(CSM_ROLL_NUMBERS)

export const CSM_ATTENDANCE_ROSTER: AttendanceRosterEntry[] = CSM_ROLL_NUMBERS.map((rollNumber) => ({
  department: 'CSM',
  rollNumber,
}))

export function isAllowedCsmRollNumber(value: string) {
  return CSM_ROLL_NUMBER_SET.has(normalizeRollNumber(value))
}
