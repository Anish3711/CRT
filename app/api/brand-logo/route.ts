import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

const BRAND_LOGO_CANDIDATES = [
  { name: 'st-peters-logo.png', type: 'image/png' },
  { name: 'st-peters-logo.jpg', type: 'image/jpeg' },
  { name: 'st-peters-logo.jpeg', type: 'image/jpeg' },
  { name: 'st-peters-logo.webp', type: 'image/webp' },
  { name: 'st-peters-logo.svg', type: 'image/svg+xml' },
]

function getBrandingDirectory() {
  return path.join(process.cwd(), '.data', 'branding')
}

export async function GET() {
  const brandingDirectory = getBrandingDirectory()

  for (const asset of BRAND_LOGO_CANDIDATES) {
    const filePath = path.join(brandingDirectory, asset.name)

    try {
      const fileBuffer = await fs.readFile(filePath)
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': asset.type,
          'Cache-Control': 'no-store',
        },
      })
    } catch {
      // Try the next candidate.
    }
  }

  return NextResponse.json({ error: 'Brand logo not found' }, { status: 404 })
}
