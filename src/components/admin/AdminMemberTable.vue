<script setup lang="ts">
import { Search, ShieldCheck, UserRound, Waves } from '@lucide/vue'
import { members as memberProfiles } from '@/data/members'
import type { AdminMemberMetric, AdminMemberStatus } from '@/types/admin'

defineProps<{ members: AdminMemberMetric[]; total: number; query: string; status: AdminMemberStatus }>()
const emit = defineEmits<{ 'update:query': [value: string]; 'update:status': [value: AdminMemberStatus] }>()

function portraitFor(memberId: number) {
  return memberProfiles.find((member) => member.id === memberId)?.portrait || '/images/kkn-group-hero.png'
}
function formatLastLogin(value: string | null) {
  if (!value) return 'Belum pernah masuk'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value.replace(' ', 'T') + 'Z'))
}
</script>

<template>
  <section class="admin-members-card">
    <header><div><p>Pantau tanpa mengusik privasi</p><h2>Status anggota</h2></div><span>{{ members.length }} dari {{ total }} anggota</span></header>
    <div class="admin-members-toolbar">
      <label><Search :size="15" /><input :value="query" placeholder="Cari nama, username, atau peran…" aria-label="Cari anggota" @input="emit('update:query', ($event.target as HTMLInputElement).value)" /></label>
      <div><button :class="{ active: status === 'all' }" @click="emit('update:status', 'all')">Semua</button><button :class="{ active: status === 'secured' }" @click="emit('update:status', 'secured')">Terlindungi</button><button :class="{ active: status === 'initial' }" @click="emit('update:status', 'initial')">Password awal</button></div>
    </div>

    <div v-if="members.length" class="admin-members-table-wrap">
      <table class="admin-members-table">
        <thead><tr><th>Anggota</th><th>Keamanan</th><th>Pesan dikirim</th><th>Pesan diterima</th><th>Terakhir masuk</th></tr></thead>
        <tbody><tr v-for="member in members" :key="member.memberId">
          <td><div class="admin-member-identity"><img :src="portraitFor(member.memberId)" :alt="member.name" /><span><strong>{{ member.name }}</strong><small>{{ member.role }} · @{{ member.username }}</small></span></div></td>
          <td><span class="admin-member-security" :class="{ secure: !member.mustChangePassword }"><ShieldCheck :size="13" />{{ member.mustChangePassword ? 'Password awal' : 'Terlindungi' }}</span></td>
          <td><div class="admin-member-count"><strong>{{ member.sentCount }}</strong><span><i :style="{ width: `${Math.min((member.sentCount / Math.max(total - 1, 1)) * 100, 100)}%` }" /></span><small>/ {{ Math.max(total - 1, 0) }}</small></div></td>
          <td><strong class="admin-table-number">{{ member.receivedCount }}</strong><small class="admin-table-sub">{{ member.readCount }} dibaca</small></td>
          <td><small class="admin-last-login">{{ formatLastLogin(member.lastLoginAt) }}</small></td>
        </tr></tbody>
      </table>
    </div>
    <div v-else class="admin-members-empty"><span><UserRound :size="24" /></span><h3>Tidak ada anggota yang cocok.</h3><p>Coba kata kunci atau status akun yang lain.</p></div>
    <footer><Waves :size="17" /> Isi pesan pribadi tidak dapat dibuka dari tabel ini.</footer>
  </section>
</template>
