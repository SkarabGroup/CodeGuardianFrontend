import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}m ${secs}s`
}

/** CSS variable name for the score colour */
export function getScoreVar(score: number): string {
  if (score >= 80) return 'var(--success)'
  if (score >= 60) return 'var(--warning)'
  return 'var(--danger)'
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'score-high'
  if (score >= 60) return 'score-mid'
  return 'score-low'
}

export function getSeverityVar(severity: 'critical' | 'warning' | 'info'): string {
  switch (severity) {
    case 'critical': return 'var(--danger)'
    case 'warning':  return 'var(--warning)'
    case 'info':     return 'var(--info)'
  }
}

export function getSeverityBadgeClass(severity: 'critical' | 'warning' | 'info'): string {
  switch (severity) {
    case 'critical': return 'bg-[var(--danger-dim)] text-[var(--danger)] border-[var(--danger-dim)] border'
    case 'warning':  return 'bg-[var(--warning-dim)] text-[var(--warning)] border-[var(--warning-dim)] border'
    case 'info':     return 'bg-[var(--info-dim)] text-[var(--info)] border-[var(--info-dim)] border'
  }
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '…'
}

export function extractRepoName(url: string): string {
  try {
    const parts = url.replace(/\.git$/, '').split('/')
    return parts.at(-1) ?? url
  } catch {
    return url
  }
}
