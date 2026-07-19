export type MessageRecipientStatus = 'available' | 'draft' | 'sent'

export type MessageStatusFilter = 'all' | MessageRecipientStatus

export type MessageDraftState = 'empty' | 'pending' | 'saving' | 'saved' | 'error'

export interface PrivateMessageDraft {
  id: number
  recipientMemberId: number
  title: string
  body: string
  closing: string
  status: 'draft'
  updatedAt: string
}

export interface LockedInboxMessage {
  id: number
  sentAt: string
  unlockAt: string
  locked: boolean
  sender: {
    memberId: number
    name: string
    role: string
  }
}

export type InboxReadFilter = 'all' | 'unread' | 'read'

export type InboxSort = 'newest' | 'oldest'

export interface OpenInboxSummary {
  id: number
  sentAt: string
  unlockAt: string
  readAt: string | null
  isRead: boolean
  sender: {
    memberId: number
    name: string
    role: string
  }
}

export interface OpenInboxMessage extends OpenInboxSummary {
  title: string
  body: string
  closing: string
}
