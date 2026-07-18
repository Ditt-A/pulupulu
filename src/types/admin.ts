import type { AuthUser } from '@/types/auth'

export type AdminPeriod = '7d' | '30d' | 'all'
export type AdminMemberStatus = 'all' | 'secured' | 'initial'
export type AdminActivityStatus = 'all' | 'read' | 'unread'

export interface AdminStatistics {
  totalMembers: number
  sentMessages: number
  draftMessages: number
  readMessages: number
  unreadMessages: number
  activeSenders: number
  reachedRecipients: number
  securedAccounts: number
  initialPasswordAccounts: number
  membersLoggedIn: number
  activeSessions: number
  messageCapacity: number
  completedPairs: number
  messageCompletion: number
  readRate: number
  securityRate: number
}

export interface AdminMemberMetric {
  memberId: number
  username: string
  name: string
  role: string
  mustChangePassword: boolean
  lastLoginAt: string | null
  sentCount: number
  receivedCount: number
  readCount: number
}

export interface AdminActivity {
  id: number
  senderName: string
  recipientName: string
  sentAt: string
  readAt: string | null
  status: 'read' | 'unread'
}

export interface AdminOverview {
  period: AdminPeriod
  generatedAt: string
  statistics: AdminStatistics
  recentActivity: AdminActivity[]
  members: AdminMemberMetric[]
  divisions: Array<{ role: string; total: number }>
  dailyMessages: Array<{ day: string; total: number }>
  privacy: string
}

export interface GlobalMessageAccess {
  unlocked: boolean
  status: 'locked' | 'unlocked'
  mode: 'locked' | 'unlocked' | 'scheduled'
  scheduled: boolean
  updatedAt: string | null
  updatedBy: string
  plannedReleaseAt: string
  impact: {
    sentMessages: number
    unreadMessages: number
    recipientsWithMessages: number
    totalMembers: number
  }
}

export type MonitoringSort = 'progress-desc' | 'progress-asc' | 'name'

export interface MessageCompletionMember {
  memberId: number
  name: string
  role: string
  completedRecipients: number
  receivedFrom: number
  draftCount: number
  openedByRecipients: number
  target: number
  progress: number
}

export interface MessageCompletionOverview {
  period: AdminPeriod
  generatedAt: string
  accessUnlocked: boolean
  statistics: {
    totalMembers: number
    targetPerMember: number
    targetPairs: number
    completedPairs: number
    remainingPairs: number
    completionPercentage: number
    totalMessages: number
    totalDrafts: number
    membersStarted: number
    membersCompleted: number
    averagePerMember: number
  }
  members: MessageCompletionMember[]
  divisions: Array<{ role: string; members: number; completedPairs: number; targetPairs: number; progress: number }>
  pairs: Array<{ senderMemberId: number; recipientMemberId: number; sentAt: string; isRead: boolean }>
  timeline: Array<{ day: string; messages: number; completedPairs: number }>
}

export interface AdminMessagesResetResult {
  ok: true
  message: string
  deleted: {
    total: number
    drafts: number
    sent: number
    read: number
    unread: number
  }
}

export type MemberDirectoryStatus = 'all' | 'active' | 'inactive'
export type MemberDirectorySecurity = 'all' | 'initial' | 'secured'

export interface ManagedMember {
  memberId: number
  username: string
  name: string
  role: string
  mustChangePassword: boolean
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  sentCount: number
  draftCount: number
  receivedCount: number
  activeSessions: number
}

export interface MemberDirectory {
  generatedAt: string
  summary: { total: number; active: number; inactive: number; initialPassword: number; activeSessions: number }
  members: ManagedMember[]
}

export interface AdminState {
  user: AuthUser | null
  overview: AdminOverview | null
  loading: boolean
  refreshing: boolean
  error: string
  access: 'unknown' | 'admin' | 'member' | 'signed-out'
  period: AdminPeriod
  memberQuery: string
  memberStatus: AdminMemberStatus
  activityStatus: AdminActivityStatus
  activeSection: string
  menuOpen: boolean
  messageAccess: GlobalMessageAccess | null
  accessLoading: boolean
  accessUpdating: boolean
  accessError: string
  messageProgress: MessageCompletionOverview | null
  progressLoading: boolean
  progressError: string
  messageResetting: boolean
  messageResetError: string
  monitoringSort: MonitoringSort
  memberDirectory: MemberDirectory | null
  directoryLoading: boolean
  directoryError: string
  directoryQuery: string
  directoryStatus: MemberDirectoryStatus
  directorySecurity: MemberDirectorySecurity
  memberActionId: number | null
}
