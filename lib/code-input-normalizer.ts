export function normalizeStdin(code: string, language: string, input: string) {
  if (!input.trim()) return input

  const normalizedLanguage = language.toLowerCase()
  if (normalizedLanguage !== 'python') return input

  const inputCallCount = (code.match(/\binput\s*\(/g) || []).length
  if (inputCallCount <= 1) return input

  if (input.includes('\n') || input.includes('\r')) return input

  const parts = input
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length <= 1) return input

  return parts.join('\n')
}
