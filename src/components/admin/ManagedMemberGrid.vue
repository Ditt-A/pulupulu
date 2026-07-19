<script setup lang="ts">
import { KeyRound, LogIn, Mail, PauseCircle, PlayCircle, RotateCcw, Send, ShieldCheck } from '@lucide/vue'
import { members as memberProfiles } from '@/data/members'
import type { ManagedMember } from '@/types/admin'
import { formatApiDate } from '@/utils/date'

defineProps<{ members: ManagedMember[]; actionId: number | null }>()
const emit = defineEmits<{ reset: [member: ManagedMember]; status: [member: ManagedMember] }>()
function portraitFor(memberId: number) { return memberProfiles.find((member) => member.id === memberId)?.portrait || '/images/kkn-group-hero.png' }
function lastLogin(value: string | null) {
  if (!value) return 'Belum pernah masuk'
  return formatApiDate(value, { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <div v-if="members.length" class="managed-member-grid">
    <article v-for="member in members" :key="member.memberId" class="managed-member-card" :class="{ inactive: !member.isActive }">
      <header>
        <div class="managed-member-card__portrait"><img :src="portraitFor(member.memberId)" :alt="member.name" /><i :class="{ active: member.isActive }" /></div>
        <div><span>{{ member.role }}</span><h3>{{ member.name }}</h3><small>@{{ member.username }}</small></div>
        <b>{{ String(member.memberId).padStart(2, '0') }}</b>
      </header>
      <div class="managed-member-card__badges"><span :class="{ active: member.isActive }">{{ member.isActive ? 'Akun aktif' : 'Nonaktif' }}</span><span :class="{ secure: !member.mustChangePassword }"><ShieldCheck :size="12" />{{ member.mustChangePassword ? 'Password awal' : 'Terlindungi' }}</span></div>
      <div class="managed-member-card__metrics"><span><Send :size="14" /><small>Dikirim</small><strong>{{ member.sentCount }}</strong></span><span><Mail :size="14" /><small>Diterima</small><strong>{{ member.receivedCount }}</strong></span><span><LogIn :size="14" /><small>Sesi aktif</small><strong>{{ member.activeSessions }}</strong></span></div>
      <p><KeyRound :size="13" /><span><small>Terakhir masuk</small><strong>{{ lastLogin(member.lastLoginAt) }}</strong></span></p>
      <footer>
        <button :disabled="actionId === member.memberId" @click="emit('reset', member)"><RotateCcw :class="{ spinning: actionId === member.memberId }" :size="14" /> Reset password</button>
        <button :class="member.isActive ? 'deactivate' : 'activate'" :disabled="actionId === member.memberId" @click="emit('status', member)"><PauseCircle v-if="member.isActive" :size="14" /><PlayCircle v-else :size="14" />{{ member.isActive ? 'Nonaktifkan' : 'Aktifkan' }}</button>
      </footer>
    </article>
  </div>
  <div v-else class="managed-member-empty"><span><ShieldCheck :size="25" /></span><h3>Tidak ada anggota yang cocok.</h3><p>Coba ubah kata kunci atau filter akun.</p></div>
</template>
