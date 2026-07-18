<script setup lang="ts">
import { computed, nextTick, onMounted } from 'vue'
import { ArrowRight, CheckCheck, Clock3, KeyRound, LockKeyhole, Mail, RefreshCw, Send, ShieldCheck, Sparkles, UserCheck, UsersRound, Waves } from '@lucide/vue'
import AdminBottomNav from '@/components/admin/AdminBottomNav.vue'
import AdminMemberTable from '@/components/admin/AdminMemberTable.vue'
import AdminMessageChart from '@/components/admin/AdminMessageChart.vue'
import AdminStatCard from '@/components/admin/AdminStatCard.vue'
import AdminTopbar from '@/components/admin/AdminTopbar.vue'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import { useAdminStore } from '@/stores/admin'
import type { AdminActivityStatus, AdminPeriod } from '@/types/admin'

const admin = useAdminStore()
const state = admin.state
const stats = admin.statistics
const periodOptions: Array<{ value: AdminPeriod; label: string }> = [{ value: '7d', label: '7 hari' }, { value: '30d', label: '30 hari' }, { value: 'all', label: 'Sepanjang waktu' }]
const activityOptions: Array<{ value: AdminActivityStatus; label: string }> = [{ value: 'all', label: 'Semua' }, { value: 'unread', label: 'Belum dibaca' }, { value: 'read', label: 'Sudah dibaca' }]

const firstName = computed(() => state.user?.name.split(' ').find((part) => part.length > 3) || 'Pengelola')
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
})
const readDonut = computed(() => {
  const rate = stats.value?.readRate ?? 0
  if (!(stats.value?.sentMessages)) return { background: 'conic-gradient(#dbe9e6 0 100%)' }
  return { background: `conic-gradient(#3aa6a2 0 ${rate}%, #e3c48c ${rate}% 100%)` }
})
const periodLabel = computed(() => periodOptions.find((item) => item.value === state.period)?.label || 'Sepanjang waktu')

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value.replace(' ', 'T') + 'Z'))
}

async function navigate(section: string) {
  state.menuOpen = false
  if (section === 'anggota') {
    window.location.assign('/admin/anggota')
    return
  }
  if (section === 'akses') {
    window.location.assign('/admin/akses-pesan')
    return
  }
  if (section === 'monitoring') {
    window.location.assign('/admin/monitoring-pesan')
    return
  }
  admin.setActiveSection(section)
  await nextTick()
  document.getElementById(`admin-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } finally {
    admin.reset()
    window.location.assign('/login')
  }
}

onMounted(admin.initialize)
</script>

<template>
  <main v-if="state.loading" class="admin-gate">
    <span><ShieldCheck :size="27" /></span><div class="loading-ripple"><i /><i /><i /></div>
    <p>Ruang pengelola</p><h1>Sedang membaca<br /><em>arah ombak data…</em></h1><small>Ringkasan privat sedang disiapkan.</small>
  </main>

  <main v-else-if="state.error && !state.overview" class="admin-gate admin-gate--error">
    <span><LockKeyhole :size="25" /></span><p>Akses terbatas</p><h1>Ruang ini belum<br /><em>dapat dibuka.</em></h1><small>{{ state.error }}</small>
    <a :href="state.access === 'member' ? '/dashboard' : '/login'">{{ state.access === 'member' ? 'Kembali ke ruang anggota' : 'Masuk sebagai admin' }} <ArrowRight :size="16" /></a>
  </main>

  <div v-else-if="state.user && state.overview && stats" class="admin-shell" :class="{ 'admin-shell--menu-open': state.menuOpen }">
    <AdminSidebar :user="state.user" :active="state.activeSection" @navigate="navigate" @close="state.menuOpen = false" @logout="logout" />
    <button class="admin-shell__scrim" aria-label="Tutup menu" @click="state.menuOpen = false" />

    <div class="admin-workspace">
      <AdminTopbar :user="state.user" :refreshing="state.refreshing" :generated-at="state.overview.generatedAt" @menu="state.menuOpen = true" @refresh="admin.refresh" />
      <main class="admin-content">
        <section id="admin-ringkasan" class="admin-hero">
          <img src="/images/kkn-coast-sunset.png" alt="Garis pantai Pesisir Harapan" /><div class="admin-hero__overlay" />
          <svg viewBox="0 0 900 170" preserveAspectRatio="none" aria-hidden="true"><path d="M-25 86 C130 22 280 146 450 80 S735 42 925 105"/><path d="M-35 126 C145 72 300 175 485 120 S760 85 935 140"/></svg>
          <div class="admin-hero__copy"><p><Sparkles :size="13" /> Pusat kendali kenangan</p><h1>{{ greeting }},<br /><em>{{ firstName }}.</em></h1><span>Tiga belas cerita sedang dijaga dari satu ruang yang tenang.</span></div>
          <div class="admin-hero__meta"><span><ShieldCheck :size="15" /><small>Status sistem</small><strong>Semua layanan aktif</strong></span><i /><span><Clock3 :size="15" /><small>Periode statistik</small><strong>{{ periodLabel }}</strong></span></div>
        </section>

        <div class="admin-period-bar">
          <span>Rentang ringkasan</span><div><button v-for="item in periodOptions" :key="item.value" :class="{ active: state.period === item.value }" :disabled="state.refreshing" @click="admin.setPeriod(item.value)">{{ item.label }}</button></div>
          <button :disabled="state.refreshing" @click="admin.refresh"><RefreshCw :class="{ spinning: state.refreshing }" :size="14" /> Perbarui</button>
        </div>

        <section class="admin-stat-grid" aria-label="Statistik utama">
          <AdminStatCard label="Anggota aktif" :value="stats.totalMembers" :icon="UsersRound" tone="blue" :note="`${stats.membersLoggedIn} sudah pernah masuk`" />
          <AdminStatCard label="Pesan terkirim" :value="stats.sentMessages" :icon="Send" tone="teal" :note="`${stats.activeSenders} anggota sudah menulis`" :progress="stats.messageCompletion" />
          <AdminStatCard label="Tingkat terbaca" :value="`${stats.readRate}%`" :icon="CheckCheck" tone="sand" :note="`${stats.readMessages} dari ${stats.sentMessages} pesan dibuka`" :progress="stats.readRate" />
          <AdminStatCard label="Akun terlindungi" :value="`${stats.securedAccounts}/${stats.totalMembers}`" :icon="ShieldCheck" tone="navy" :note="`${stats.initialPasswordAccounts} masih memakai password awal`" :progress="stats.securityRate" />
        </section>

        <section id="admin-pesan" class="admin-analytics-grid">
          <AdminMessageChart :days="admin.chartDays.value" :maximum="admin.chartMaximum.value" />
          <article class="admin-delivery-card">
            <header><div><p>Status pembacaan</p><h2>Surat yang sampai</h2></div><Mail :size="19" /></header>
            <div class="admin-delivery-card__body"><div class="admin-donut" :style="readDonut"><span><strong>{{ stats.readRate }}%</strong><small>dibaca</small></span></div><div><span><i class="read" /><b>{{ stats.readMessages }}</b><small>Sudah dibaca</small></span><span><i class="unread" /><b>{{ stats.unreadMessages }}</b><small>Belum dibaca</small></span><span><i class="draft" /><b>{{ stats.draftMessages }}</b><small>Masih draf</small></span></div></div>
            <footer><strong>{{ stats.reachedRecipients }}/{{ stats.totalMembers }}</strong><span>anggota sudah menerima sedikitnya satu surat</span></footer>
          </article>
        </section>

        <section class="admin-progress-card">
          <div><p>Perjalanan pesan pribadi</p><h2>{{ stats.sentMessages }} dari {{ stats.messageCapacity }} kemungkinan pesan</h2><span>Setiap anggota dapat menulis untuk dua belas teman lainnya.</span></div>
          <div class="admin-progress-card__visual"><span><i :style="{ width: `${stats.messageCompletion}%` }" /></span><p><strong>{{ stats.messageCompletion }}%</strong> lengkap</p></div>
          <div class="admin-division-list"><span v-for="division in state.overview.divisions" :key="division.role"><b>{{ division.total }}</b>{{ division.role }}</span></div>
        </section>

        <section class="admin-activity-card">
          <header><div><p>Metadata terbaru</p><h2>Aktivitas pesan</h2></div><div><button v-for="item in activityOptions" :key="item.value" :class="{ active: state.activityStatus === item.value }" @click="admin.setActivityStatus(item.value)">{{ item.label }}</button></div></header>
          <div v-if="admin.filteredActivity.value.length" class="admin-activity-list"><article v-for="activity in admin.filteredActivity.value" :key="activity.id"><span :class="activity.status"><CheckCheck v-if="activity.status === 'read'" :size="16" /><Mail v-else :size="16" /></span><div><strong>{{ activity.senderName }}</strong><p>mengirim surat kepada <b>{{ activity.recipientName }}</b></p></div><time>{{ formatActivityDate(activity.sentAt) }}</time><small :class="activity.status">{{ activity.status === 'read' ? 'Sudah dibaca' : 'Belum dibaca' }}</small></article></div>
          <div v-else class="admin-activity-empty"><span><Mail :size="25" /></span><h3>Belum ada surat pada rentang ini.</h3><p>Aktivitas baru akan muncul tanpa menampilkan isi pesan privat.</p></div>
          <footer><ShieldCheck :size="15" /> {{ state.overview.privacy }}</footer>
        </section>

        <section id="admin-anggota">
          <AdminMemberTable :members="admin.filteredMembers.value" :total="stats.totalMembers" :query="state.memberQuery" :status="state.memberStatus" @update:query="admin.setMemberQuery" @update:status="admin.setMemberStatus" />
        </section>

        <section id="admin-keamanan" class="admin-security-grid">
          <article><span><KeyRound :size="20" /></span><div><p>Kata sandi awal</p><h2>{{ stats.initialPasswordAccounts }} akun perlu perhatian</h2><small>Akun berstatus ini belum mengganti kata sandi yang dibuat oleh seeder.</small></div><strong>{{ stats.securityRate }}%</strong></article>
          <article><span><UserCheck :size="20" /></span><div><p>Sesi terverifikasi</p><h2>{{ stats.activeSessions }} sesi sedang aktif</h2><small>Sesi kedaluwarsa dibersihkan otomatis oleh server.</small></div><strong>{{ stats.activeSessions }}</strong></article>
        </section>

        <footer class="admin-footer"><span><Waves :size="18" /> PULUPULU · RUANG PENGELOLA</span><p>Data dijaga seperlunya, kenangan dijaga sepenuhnya.</p></footer>
      </main>
    </div>

    <AdminBottomNav :active="state.activeSection" @navigate="navigate" />
  </div>
</template>
