const COOKIE_NAME = 'spec_crt_admin'
const COOKIE_TTL_SECONDS = 60 * 60 * 24

function getSecret() {
  return process.env.ADMIN_AUTH_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'local-admin-secret'
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

async function sign(payload: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return toHex(signature)
}

export function getAdminCookieName() {
  return COOKIE_NAME
}

export function getAllowedAdmins() {
  const configured = process.env.ADMIN_ALLOWED_EMAILS
  if (configured) {
    return configured
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  }

  return ['admin1@gmail.com', 'anishreddy375@gmail.com']
}

export async function createAdminSession(email: string) {
  const issuedAt = Date.now().toString()
  const normalizedEmail = email.trim().toLowerCase()
  const payload = `${normalizedEmail}.${issuedAt}`
  const signature = await sign(payload)

  return {
    name: COOKIE_NAME,
    value: `${payload}.${signature}`,
    maxAge: COOKIE_TTL_SECONDS,
  }
}

export async function verifyAdminSession(cookieValue?: string | null) {
  if (!cookieValue) return null

  const lastSeparator = cookieValue.lastIndexOf('.')
  const secondLastSeparator = cookieValue.lastIndexOf('.', lastSeparator - 1)

  if (lastSeparator <= 0 || secondLastSeparator <= 0) return null

  const email = cookieValue.slice(0, secondLastSeparator)
  const issuedAt = cookieValue.slice(secondLastSeparator + 1, lastSeparator)
  const signature = cookieValue.slice(lastSeparator + 1)
  if (!email || !issuedAt || !signature) return null

  const payload = `${email}.${issuedAt}`
  const expected = await sign(payload)
  if (signature !== expected) return null

  const ageMs = Date.now() - Number(issuedAt)
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > COOKIE_TTL_SECONDS * 1000) {
    return null
  }

  if (!getAllowedAdmins().includes(email.toLowerCase())) {
    return null
  }

  return { email }
}
