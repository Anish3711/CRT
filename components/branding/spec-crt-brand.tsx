'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

type SpecCrtBrandProps = {
  className?: string
  compact?: boolean
  subtitle?: string
}

function BrandImage({
  className,
  alt,
  compact = false,
}: {
  className?: string
  alt: string
  compact?: boolean
}) {
  const [src, setSrc] = useState('/api/brand-logo')

  return (
    <Image
      src={src}
      alt={alt}
      width={260}
      height={260}
      unoptimized
      onError={() => {
        if (src !== '/spec-crt-logo.svg') {
          setSrc('/spec-crt-logo.svg')
        }
      }}
      className={cn(
        'h-auto object-contain',
        compact ? 'h-[52px] w-[52px] shrink-0' : 'w-[94px] sm:w-[104px] lg:w-[112px]',
        className
      )}
    />
  )
}

export function SpecCrtBrand({
  className,
  compact = false,
  subtitle,
}: SpecCrtBrandProps) {
  if (compact) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className="inline-flex max-w-full items-center gap-3 rounded-xl border border-white/10 bg-slate-950/30 px-3 py-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.24)] backdrop-blur">
          <BrandImage
            alt="St. Peter's Engineering College logo"
            compact
            className="rounded-md"
          />
          <div className="min-w-0 text-left leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#f2b270]">
              SPEC CRT
            </p>
            <p className="truncate text-xs text-slate-200">
              St. Peter&apos;s Engineering College
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-center gap-4 text-center', className)}>
      <BrandImage
        alt="St. Peter's Engineering College logo"
        className="drop-shadow-[0_18px_36px_rgba(15,23,42,0.22)]"
      />
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.52em] text-[#f2b270] sm:text-sm">
          SPEC CRT
        </p>
        {subtitle ? (
          <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  )
}
