export function parseApiDate(value: string | null | undefined) {
  const raw = value?.trim()
  if (!raw) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T00:00:00Z`)
    return Number.isNaN(date.getTime()) ? null : date
  }

  let normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  normalized = normalized.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
  normalized = normalized.replace(/([+-]\d{2})$/, '$1:00')

  const hasTimeZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)
  const date = new Date(hasTimeZone ? normalized : `${normalized}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatApiDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback = 'Waktu tidak tersedia',
) {
  const date = parseApiDate(value)
  if (!date) return fallback
  return new Intl.DateTimeFormat('id-ID', options).format(date)
}
