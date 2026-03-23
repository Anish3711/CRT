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
        compact ? 'h-[40px] w-[40px] shrink-0' : 'w-[76px] sm:w-[84px] lg:w-[92px]',
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
        <div className="inline-flex max-w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
          <BrandImage alt="St. Peter's Engineering College logo" compact />
          <div className="min-w-0 text-left leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-zinc-500">SPEC CRT</p>
            <p className="truncate text-xs text-zinc-900">St. Peter&apos;s Engineering College</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-center gap-4 text-center', className)}>
      <BrandImage alt="St. Peter's Engineering College logo" />
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.52em] text-zinc-500 sm:text-xs">SPEC CRT</p>
        <p className="text-sm font-medium text-zinc-900 sm:text-base">St. Peter&apos;s Engineering College</p>
        {subtitle ? (
          <p className="max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}
