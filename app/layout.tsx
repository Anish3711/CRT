import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ExamProvider } from './contexts/exam-context'
import './globals.css'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata: Metadata = {
  title: 'SPEC CRT - Secure Exam Portal',
  description: 'Secure exam portal for SPEC CRT at St. Peter\'s Engineering College',
  icons: {
    icon: '/spec-crt-favicon.svg',
    shortcut: '/spec-crt-favicon.svg',
    apple: '/spec-crt-favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ExamProvider>
          {children}
          <Analytics />
        </ExamProvider>
      </body>
    </html>
  )
}
