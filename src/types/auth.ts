export interface AuthUser {
  id: number
  memberId: number | null
  username: string
  name: string
  accountType: 'member' | 'admin'
  role: string
  mustChangePassword: boolean
}

export interface PasswordChangePayload {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
