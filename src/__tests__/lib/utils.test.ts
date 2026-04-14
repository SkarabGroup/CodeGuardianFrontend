import {
  cn,
  formatDate,
  formatDateShort,
  formatDuration,
  getScoreVar,
  getScoreColor,
  getSeverityVar,
  getSeverityBadgeClass,
  truncate,
  extractRepoName,
} from '@/lib/utils'

// ─── cn ──────────────────────────────────────────────────────
describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('ignores falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c')
  })

  it('deduplicates conflicting tailwind classes (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles arrays', () => {
    expect(cn(['a', 'b'])).toBe('a b')
  })

  it('handles objects', () => {
    expect(cn({ a: true, b: false, c: true })).toBe('a c')
  })

  it('returns empty string with no args', () => {
    expect(cn()).toBe('')
  })
})

// ─── formatDate ───────────────────────────────────────────────
describe('formatDate', () => {
  const ISO = '2025-06-15T10:30:00Z'

  it('returns a non-empty string', () => {
    const result = formatDate(ISO)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes the year', () => {
    expect(formatDate(ISO)).toContain('2025')
  })

  it('accepts a Date object', () => {
    const result = formatDate(new Date(ISO))
    expect(typeof result).toBe('string')
    expect(result).toContain('2025')
  })
})

// ─── formatDateShort ──────────────────────────────────────────
describe('formatDateShort', () => {
  const ISO = '2025-06-15T10:30:00Z'

  it('returns a non-empty string', () => {
    const result = formatDateShort(ISO)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes the year', () => {
    expect(formatDateShort(ISO)).toContain('2025')
  })

  it('accepts a Date object', () => {
    const result = formatDateShort(new Date(ISO))
    expect(typeof result).toBe('string')
    expect(result).toContain('2025')
  })
})

// ─── formatDuration ───────────────────────────────────────────
describe('formatDuration', () => {
  it('formats 0 seconds', () => {
    expect(formatDuration(0)).toBe('0s')
  })

  it('formats whole seconds under a minute', () => {
    expect(formatDuration(45)).toBe('45s')
  })

  it('rounds fractional seconds', () => {
    expect(formatDuration(45.7)).toBe('46s')
  })

  it('formats exactly 60 seconds as 1m 0s', () => {
    expect(formatDuration(60)).toBe('1m 0s')
  })

  it('formats 90 seconds as 1m 30s', () => {
    expect(formatDuration(90)).toBe('1m 30s')
  })

  it('formats 125 seconds as 2m 5s', () => {
    expect(formatDuration(125)).toBe('2m 5s')
  })

  it('formats 3600 seconds as 60m 0s', () => {
    expect(formatDuration(3600)).toBe('60m 0s')
  })

  it('rounds seconds part within a minute', () => {
    expect(formatDuration(61.8)).toBe('1m 2s')
  })
})

// ─── getScoreVar ──────────────────────────────────────────────
describe('getScoreVar', () => {
  it('returns success for score 80', () => {
    expect(getScoreVar(80)).toBe('var(--success)')
  })

  it('returns success for score 100', () => {
    expect(getScoreVar(100)).toBe('var(--success)')
  })

  it('returns warning for score 60', () => {
    expect(getScoreVar(60)).toBe('var(--warning)')
  })

  it('returns warning for score 79', () => {
    expect(getScoreVar(79)).toBe('var(--warning)')
  })

  it('returns danger for score 59', () => {
    expect(getScoreVar(59)).toBe('var(--danger)')
  })

  it('returns danger for score 0', () => {
    expect(getScoreVar(0)).toBe('var(--danger)')
  })
})

// ─── getScoreColor ────────────────────────────────────────────
describe('getScoreColor', () => {
  it('returns score-high for score 80', () => {
    expect(getScoreColor(80)).toBe('score-high')
  })

  it('returns score-high for score 100', () => {
    expect(getScoreColor(100)).toBe('score-high')
  })

  it('returns score-mid for score 60', () => {
    expect(getScoreColor(60)).toBe('score-mid')
  })

  it('returns score-mid for score 79', () => {
    expect(getScoreColor(79)).toBe('score-mid')
  })

  it('returns score-low for score 59', () => {
    expect(getScoreColor(59)).toBe('score-low')
  })

  it('returns score-low for score 0', () => {
    expect(getScoreColor(0)).toBe('score-low')
  })
})

// ─── getSeverityVar ───────────────────────────────────────────
describe('getSeverityVar', () => {
  it('returns danger for critical', () => {
    expect(getSeverityVar('critical')).toBe('var(--danger)')
  })

  it('returns warning for warning', () => {
    expect(getSeverityVar('warning')).toBe('var(--warning)')
  })

  it('returns info for info', () => {
    expect(getSeverityVar('info')).toBe('var(--info)')
  })
})

// ─── getSeverityBadgeClass ────────────────────────────────────
describe('getSeverityBadgeClass', () => {
  it('contains danger for critical', () => {
    expect(getSeverityBadgeClass('critical')).toContain('danger')
  })

  it('contains warning for warning', () => {
    expect(getSeverityBadgeClass('warning')).toContain('warning')
  })

  it('contains info for info', () => {
    expect(getSeverityBadgeClass('info')).toContain('info')
  })

  it('returns a non-empty string for each severity', () => {
    expect(getSeverityBadgeClass('critical').length).toBeGreaterThan(0)
    expect(getSeverityBadgeClass('warning').length).toBeGreaterThan(0)
    expect(getSeverityBadgeClass('info').length).toBeGreaterThan(0)
  })
})

// ─── truncate ─────────────────────────────────────────────────
describe('truncate', () => {
  it('returns string unchanged when shorter than maxLen', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('returns string unchanged when exactly maxLen', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('truncates and appends ellipsis when longer than maxLen', () => {
    expect(truncate('hello world', 5)).toBe('hello…')
  })

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('')
  })

  it('handles maxLen of 0', () => {
    expect(truncate('hello', 0)).toBe('…')
  })
})

// ─── extractRepoName ──────────────────────────────────────────
describe('extractRepoName', () => {
  it('extracts last path segment from a GitHub URL', () => {
    expect(extractRepoName('https://github.com/org/my-repo')).toBe('my-repo')
  })

  it('strips .git suffix', () => {
    expect(extractRepoName('https://github.com/org/my-repo.git')).toBe('my-repo')
  })

  it('handles a bare name with no slashes', () => {
    expect(extractRepoName('simple-name')).toBe('simple-name')
  })

  it('handles nested paths', () => {
    expect(extractRepoName('https://github.com/a/b/c')).toBe('c')
  })

  it('returns the full string when no slash segments', () => {
    expect(extractRepoName('no-slashes-here')).toBe('no-slashes-here')
  })

  it('returns the url unchanged on internal error', () => {
    // Force the catch branch: override String.prototype.replace temporarily
    const original = String.prototype.replace
    String.prototype.replace = () => { throw new Error('forced') }
    try {
      const result = extractRepoName('https://github.com/org/repo')
      expect(result).toBe('https://github.com/org/repo')
    } finally {
      String.prototype.replace = original
    }
  })
})
