import { computed, reactive } from 'vue'
import type { AdminActivityStatus, AdminMemberStatus, AdminOverview, AdminPeriod, AdminState, MemberDirectory, MemberDirectorySecurity, MemberDirectoryStatus, MessageCompletionOverview, MonitoringSort } from '@/types/admin'

const state = reactive<AdminState>({
  user: null,
  overview: null,
  loading: true,
  refreshing: false,
  error: '',
  access: 'unknown',
  period: 'all',
  memberQuery: '',
  memberStatus: 'all',
  activityStatus: 'all',
  activeSection: 'ringkasan',
  menuOpen: false,
  messageAccess: null,
  accessLoading: false,
  accessUpdating: false,
  accessError: '',
  messageProgress: null,
  progressLoading: false,
  progressError: '',
  monitoringSort: 'progress-desc',
  memberDirectory: null,
  directoryLoading: false,
  directoryError: '',
  directoryQuery: '',
  directoryStatus: 'all',
  directorySecurity: 'all',
  memberActionId: null,
})

let requestVersion = 0

const statistics = computed(() => state.overview?.statistics ?? null)
const filteredMembers = computed(() => {
  const query = state.memberQuery.trim().toLowerCase()
  return (state.overview?.members ?? []).filter((member) => {
    const matchesQuery = !query || [member.name, member.username, member.role].some((value) => value.toLowerCase().includes(query))
    const matchesStatus = state.memberStatus === 'all'
      || (state.memberStatus === 'secured' && !member.mustChangePassword)
      || (state.memberStatus === 'initial' && member.mustChangePassword)
    return matchesQuery && matchesStatus
  })
})
const filteredActivity = computed(() => (state.overview?.recentActivity ?? []).filter((activity) => (
  state.activityStatus === 'all' || activity.status === state.activityStatus
)))
const chartDays = computed(() => {
  const data = new Map((state.overview?.dailyMessages ?? []).map((item) => [item.day, item.total]))
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const key = date.toISOString().slice(0, 10)
    return {
      day: key,
      label: new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(date),
      total: data.get(key) ?? 0,
    }
  })
})
const chartMaximum = computed(() => Math.max(...chartDays.value.map((item) => item.total), 1))
const rankedProgressMembers = computed(() => {
  const members = [...(state.messageProgress?.members ?? [])]
  if (state.monitoringSort === 'name') return members.sort((left, right) => left.name.localeCompare(right.name))
  if (state.monitoringSort === 'progress-asc') return members.sort((left, right) => left.progress - right.progress || left.name.localeCompare(right.name))
  return members.sort((left, right) => right.progress - left.progress || left.name.localeCompare(right.name))
})
const managedMembers = computed(() => {
  const query = state.directoryQuery.trim().toLowerCase()
  return (state.memberDirectory?.members ?? []).filter((member) => {
    const queryMatch = !query || [member.name, member.username, member.role].some((value) => value.toLowerCase().includes(query))
    const statusMatch = state.directoryStatus === 'all' || (state.directoryStatus === 'active' && member.isActive) || (state.directoryStatus === 'inactive' && !member.isActive)
    const securityMatch = state.directorySecurity === 'all' || (state.directorySecurity === 'initial' && member.mustChangePassword) || (state.directorySecurity === 'secured' && !member.mustChangePassword)
    return queryMatch && statusMatch && securityMatch
  })
})

async function loadOverview(silent = false) {
  const version = ++requestVersion
  if (silent) state.refreshing = true
  else state.loading = true
  state.error = ''

  try {
    const response = await fetch(`/api/admin/overview?period=${state.period}`, { credentials: 'same-origin' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Ringkasan pengelola belum dapat dimuat.')
    if (version !== requestVersion) return
    state.overview = payload as AdminOverview
  } catch (cause) {
    if (version !== requestVersion) return
    state.error = cause instanceof Error ? cause.message : 'Ringkasan pengelola belum dapat dimuat.'
  } finally {
    if (version === requestVersion) {
      state.loading = false
      state.refreshing = false
    }
  }
}

async function initialize() {
  state.loading = true
  state.error = ''
  try {
    const response = await fetch('/api/auth/session', { credentials: 'same-origin' })
    const payload = await response.json()
    if (!response.ok) {
      state.access = 'signed-out'
      throw new Error(payload.message || 'Sesi admin sudah berakhir.')
    }
    state.user = payload.user
    if (payload.user.accountType !== 'admin') {
      state.access = 'member'
      throw new Error('Akun anggota tidak memiliki akses ke ruang pengelola.')
    }
    state.access = 'admin'
    await loadOverview()
  } catch (cause) {
    state.error = cause instanceof Error ? cause.message : 'Ruang pengelola belum dapat dibuka.'
    state.loading = false
  }
}

async function loadMessageAccess() {
  state.accessLoading = true
  state.accessError = ''
  try {
    const response = await fetch('/api/admin/message-access', { credentials: 'same-origin' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Status akses pesan belum dapat dimuat.')
    state.messageAccess = payload.access
  } catch (cause) {
    state.accessError = cause instanceof Error ? cause.message : 'Status akses pesan belum dapat dimuat.'
  } finally {
    state.accessLoading = false
  }
}

async function initializeMessageAccess() {
  state.loading = true
  state.error = ''
  try {
    const response = await fetch('/api/auth/session', { credentials: 'same-origin' })
    const payload = await response.json()
    if (!response.ok) {
      state.access = 'signed-out'
      throw new Error(payload.message || 'Sesi admin sudah berakhir.')
    }
    state.user = payload.user
    if (payload.user.accountType !== 'admin') {
      state.access = 'member'
      throw new Error('Akun anggota tidak memiliki akses ke pengaturan global.')
    }
    state.access = 'admin'
    await loadMessageAccess()
    if (state.accessError) throw new Error(state.accessError)
  } catch (cause) {
    state.error = cause instanceof Error ? cause.message : 'Pengaturan akses belum dapat dibuka.'
  } finally {
    state.loading = false
  }
}

async function updateMessageAccess(unlocked: boolean) {
  state.accessUpdating = true
  state.accessError = ''
  try {
    const response = await fetch('/api/admin/message-access', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unlocked,
        confirmation: unlocked ? 'BUKA SEMUA SURAT' : 'KUNCI SEMUA SURAT',
      }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Status akses belum dapat diperbarui.')
    state.messageAccess = payload.access
    return payload
  } catch (cause) {
    state.accessError = cause instanceof Error ? cause.message : 'Status akses belum dapat diperbarui.'
    throw cause
  } finally {
    state.accessUpdating = false
  }
}

async function loadMessageProgress() {
  state.progressLoading = true
  state.progressError = ''
  try {
    const response = await fetch(`/api/admin/message-progress?period=${state.period}`, { credentials: 'same-origin' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Progres pesan belum dapat dimuat.')
    state.messageProgress = payload as MessageCompletionOverview
  } catch (cause) {
    state.progressError = cause instanceof Error ? cause.message : 'Progres pesan belum dapat dimuat.'
  } finally {
    state.progressLoading = false
  }
}

async function initializeMessageProgress() {
  state.loading = true
  state.error = ''
  try {
    const response = await fetch('/api/auth/session', { credentials: 'same-origin' })
    const payload = await response.json()
    if (!response.ok) {
      state.access = 'signed-out'
      throw new Error(payload.message || 'Sesi admin sudah berakhir.')
    }
    state.user = payload.user
    if (payload.user.accountType !== 'admin') {
      state.access = 'member'
      throw new Error('Akun anggota tidak memiliki akses ke monitoring pesan.')
    }
    state.access = 'admin'
    await loadMessageProgress()
    if (state.progressError) throw new Error(state.progressError)
  } catch (cause) {
    state.error = cause instanceof Error ? cause.message : 'Monitoring pesan belum dapat dibuka.'
  } finally {
    state.loading = false
  }
}

async function setMonitoringPeriod(period: AdminPeriod) {
  if (state.period === period && state.messageProgress) return
  state.period = period
  await loadMessageProgress()
}

function setMonitoringSort(sort: MonitoringSort) { state.monitoringSort = sort }

async function loadMemberDirectory() {
  state.directoryLoading = true
  state.directoryError = ''
  try {
    const response = await fetch('/api/admin/members', { credentials: 'same-origin' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Daftar anggota belum dapat dimuat.')
    state.memberDirectory = payload as MemberDirectory
  } catch (cause) {
    state.directoryError = cause instanceof Error ? cause.message : 'Daftar anggota belum dapat dimuat.'
  } finally {
    state.directoryLoading = false
  }
}

async function initializeMemberDirectory() {
  state.loading = true
  state.error = ''
  try {
    const response = await fetch('/api/auth/session', { credentials: 'same-origin' })
    const payload = await response.json()
    if (!response.ok) {
      state.access = 'signed-out'
      throw new Error(payload.message || 'Sesi admin sudah berakhir.')
    }
    state.user = payload.user
    if (payload.user.accountType !== 'admin') {
      state.access = 'member'
      throw new Error('Akun anggota tidak memiliki akses ke pengelolaan akun.')
    }
    state.access = 'admin'
    await loadMemberDirectory()
    if (state.directoryError) throw new Error(state.directoryError)
  } catch (cause) {
    state.error = cause instanceof Error ? cause.message : 'Daftar anggota belum dapat dibuka.'
  } finally {
    state.loading = false
  }
}

async function resetManagedMemberPassword(memberId: number) {
  state.memberActionId = memberId
  state.directoryError = ''
  try {
    const response = await fetch(`/api/admin/members/${memberId}/reset-password`, {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'RESET KATA SANDI' }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Kata sandi belum dapat direset.')
    const member = state.memberDirectory?.members.find((item) => item.memberId === memberId)
    if (member) { member.mustChangePassword = true; member.activeSessions = 0 }
    return payload
  } catch (cause) {
    state.directoryError = cause instanceof Error ? cause.message : 'Kata sandi belum dapat direset.'
    throw cause
  } finally {
    state.memberActionId = null
  }
}

async function updateManagedMemberStatus(memberId: number, active: boolean) {
  state.memberActionId = memberId
  state.directoryError = ''
  try {
    const response = await fetch(`/api/admin/members/${memberId}/status`, {
      method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active, confirmation: active ? 'AKTIFKAN ANGGOTA' : 'NONAKTIFKAN ANGGOTA' }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Status akun belum dapat diperbarui.')
    const directory = state.memberDirectory
    const member = directory?.members.find((item) => item.memberId === memberId)
    if (member && directory) {
      if (member.isActive !== active) {
        directory.summary.active += active ? 1 : -1
        directory.summary.inactive += active ? -1 : 1
      }
      member.isActive = active
      if (!active) member.activeSessions = 0
    }
    return payload
  } catch (cause) {
    state.directoryError = cause instanceof Error ? cause.message : 'Status akun belum dapat diperbarui.'
    throw cause
  } finally {
    state.memberActionId = null
  }
}

function setDirectoryQuery(query: string) { state.directoryQuery = query }
function setDirectoryStatus(status: MemberDirectoryStatus) { state.directoryStatus = status }
function setDirectorySecurity(security: MemberDirectorySecurity) { state.directorySecurity = security }

async function setPeriod(period: AdminPeriod) {
  if (state.period === period) return
  state.period = period
  await loadOverview(true)
}

function setMemberQuery(query: string) { state.memberQuery = query }
function setMemberStatus(status: AdminMemberStatus) { state.memberStatus = status }
function setActivityStatus(status: AdminActivityStatus) { state.activityStatus = status }
function setActiveSection(section: string) { state.activeSection = section }
function setMenuOpen(open: boolean) { state.menuOpen = open }
function reset() {
  requestVersion += 1
  state.user = null
  state.overview = null
  state.error = ''
  state.access = 'unknown'
  state.loading = true
  state.refreshing = false
  state.memberQuery = ''
  state.memberStatus = 'all'
  state.activityStatus = 'all'
  state.activeSection = 'ringkasan'
  state.menuOpen = false
  state.messageAccess = null
  state.accessLoading = false
  state.accessUpdating = false
  state.accessError = ''
  state.messageProgress = null
  state.progressLoading = false
  state.progressError = ''
  state.monitoringSort = 'progress-desc'
  state.memberDirectory = null
  state.directoryLoading = false
  state.directoryError = ''
  state.directoryQuery = ''
  state.directoryStatus = 'all'
  state.directorySecurity = 'all'
  state.memberActionId = null
}

export function useAdminStore() {
  return {
    state,
    statistics,
    filteredMembers,
    filteredActivity,
    chartDays,
    chartMaximum,
    rankedProgressMembers,
    managedMembers,
    initialize,
    initializeMessageAccess,
    loadMessageAccess,
    updateMessageAccess,
    initializeMessageProgress,
    loadMessageProgress,
    setMonitoringPeriod,
    setMonitoringSort,
    initializeMemberDirectory,
    loadMemberDirectory,
    resetManagedMemberPassword,
    updateManagedMemberStatus,
    setDirectoryQuery,
    setDirectoryStatus,
    setDirectorySecurity,
    refresh: () => loadOverview(true),
    setPeriod,
    setMemberQuery,
    setMemberStatus,
    setActivityStatus,
    setActiveSection,
    setMenuOpen,
    reset,
  }
}
