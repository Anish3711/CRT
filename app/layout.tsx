import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ExamProvider } from './contexts/exam-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'SecureCRT - Secure Exam Portal',
  description: 'Secure coding and multiple-choice exam portal with proctoring',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ExamProvider>
          {children}
          <Analytics />
        </ExamProvider>
      </body>
    </html>
  )
}
