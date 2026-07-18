<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ArrowLeft, ArrowRight, CircleCheck, Clock3, LockKeyhole, Mail, RefreshCw, Send, Sparkles, Target, UsersRound, Waves } from '@lucide/vue'
import AdminBottomNav from '@/components/admin/AdminBottomNav.vue'
import AdminStatCard from '@/components/admin/AdminStatCard.vue'
import AdminTopbar from '@/components/admin/AdminTopbar.vue'
import CompletionDonutChart from '@/components/admin/CompletionDonutChart.vue'
import CompletionTrendChart from '@/components/admin/CompletionTrendChart.vue'
import MemberCompletionChart from '@/components/admin/MemberCompletionChart.vue'
import MessageCompletionMatrix from '@/components/admin/MessageCompletionMatrix.vue'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import { useAdminStore } from '@/stores/admin'
import type { AdminPeriod } from '@/types/admin'

const admin = useAdminStore()
const state = admin.state
const progress = computed(() => state.messageProgress)
const stats = computed(() => progress.value?.statistics)
const periods: Array<{ value: AdminPeriod; label: string }> = [{ value: '7d', label: '7 hari' }, { value: '30d', label: '30 hari' }, { value: 'all', label: 'Sepanjang waktu' }]

const trendPoints = computed(() => {
  const timeline = progress.value?.timeline ?? []
  const totals = new Map(timeline.map((item) => [item.day, item.completedPairs]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let days = state.period === '7d' ? 7 : state.period === '30d' ? 30 : 7
  let start = new Date(today)
  if (state.period === 'all' && timeline.length) {
    start = new Date(`${timeline[0]!.day}T00:00:00`)
    days = Math.min(Math.max(Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1, 1), 60)
    if (days === 60) start = new Date(today.getTime() - 59 * 86_400_000)
  } else {
    start.setDate(start.getDate() - (days - 1))
  }

  let cumulative = 0
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const day = date.toISOString().slice(0, 10)
    cumulative += totals.get(day) ?? 0
    return {
      day,
      label: new Intl.DateTimeFormat('id-ID', days <= 7 ? { weekday: 'short' } : { day: '2-digit', month: 'short' }).format(date),
      total: cumulative,
    }
  })
})
const notStartedMembers = computed(() => (progress.value?.members ?? []).filter((member) => member.completedRecipients === 0))
const nearlyCompleteMembers = computed(() => (progress.value?.members ?? []).filter((member) => member.progress >= 75 && member.progress < 100))
const periodLabel = computed(() => periods.find((period) => period.value === state.period)?.label || 'Sepanjang waktu')

function navigate(section: string) {
  state.menuOpen = false
  if (section === 'monitoring') return
  if (section === 'anggota') return window.location.assign('/admin/anggota')
  if (section === 'akses') return window.location.assign('/admin/akses-pesan')
  window.location.assign(section === 'ringkasan' ? '/admin' : `/admin#admin-${section}`)
}

async function logout() {
  try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }) }
  finally { admin.reset(); window.location.assign('/login') }
}

onMounted(admin.initializeMessageProgress)
</script>

<template>
  <main v-if="state.loading" class="admin-gate">
    <span><Target :size="27" /></span><div class="loading-ripple"><i /><i /><i /></div>
    <p>Monitoring pesan</p><h1>Sedang menghitung<br /><em>surat yang berlayar…</em></h1><small>Setiap pasangan pengirim dan penerima sedang dirapikan.</small>
  </main>

  <main v-else-if="state.error && !progress" class="admin-gate admin-gate--error">
    <span><LockKeyhole :size="25" /></span><p>Akses terbatas</p><h1>Monitoring belum<br /><em>dapat dibuka.</em></h1><small>{{ state.error }}</small>
    <a :href="state.access === 'member' ? '/dashboard' : '/login'">{{ state.access === 'member' ? 'Kembali ke ruang anggota' : 'Masuk sebagai admin' }} <ArrowRight :size="16" /></a>
  </main>

  <div v-else-if="state.user && progress && stats" class="admin-shell monitoring-page" :class="{ 'admin-shell--menu-open': state.menuOpen }">
    <AdminSidebar :user="state.user" active="monitoring" @navigate="navigate" @close="state.menuOpen = false" @logout="logout" />
    <button class="admin-shell__scrim" aria-label="Tutup menu" @click="state.menuOpen = false" />
    <div class="admin-workspace">
      <AdminTopbar :user="state.user" :refreshing="state.progressLoading" :generated-at="progress.generatedAt" @menu="state.menuOpen = true" @refresh="admin.loadMessageProgress" />
      <main class="monitoring-content">
        <a class="access-back" href="/admin"><ArrowLeft :size="15" /> Kembali ke ringkasan</a>

        <section class="monitoring-hero">
          <img src="/images/kkn-coast-sunset.png" alt="Laut tenang di Pesisir Harapan" /><div class="monitoring-hero__overlay" />
          <svg viewBox="0 0 940 190" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 91 C140 24 295 152 470 84 S760 39 960 110"/><path d="M-30 138 C145 82 315 184 500 130 S785 91 970 150"/></svg>
          <div class="monitoring-hero__copy"><p><Sparkles :size="13" /> Peta perjalanan pesan</p><h1>Setiap nama menuju<br /><em>dua belas cerita.</em></h1><span>Progres dihitung dari pasangan pengirim dan penerima yang unik—bukan dari banyaknya pesan yang dikirim berulang.</span></div>
          <div class="monitoring-hero__progress"><CompletionDonutChart :value="stats.completionPercentage" :completed="stats.completedPairs" :target="stats.targetPairs" /><span><small>Pasangan selesai</small><strong>{{ stats.completedPairs }} / {{ stats.targetPairs }}</strong><i /><p>{{ stats.remainingPairs }} hubungan pesan masih menunggu cerita.</p></span></div>
        </section>

        <div class="monitoring-toolbar"><span>Rentang monitoring</span><div><button v-for="period in periods" :key="period.value" :class="{ active: state.period === period.value }" :disabled="state.progressLoading" @click="admin.setMonitoringPeriod(period.value)">{{ period.label }}</button></div><button :disabled="state.progressLoading" @click="admin.loadMessageProgress"><RefreshCw :class="{ spinning: state.progressLoading }" :size="14" /> Perbarui</button></div>
        <div v-if="state.progressError" class="access-error" role="alert"><Target :size="17" /><span><strong>Data belum diperbarui.</strong>{{ state.progressError }}</span><button @click="state.progressError = ''">Tutup</button></div>

        <section class="admin-stat-grid monitoring-stat-grid">
          <AdminStatCard label="Progres keseluruhan" :value="`${stats.completionPercentage}%`" :icon="Target" tone="teal" :note="`${stats.completedPairs} pasangan selesai`" :progress="stats.completionPercentage" />
          <AdminStatCard label="Anggota mulai menulis" :value="`${stats.membersStarted}/${stats.totalMembers}`" :icon="UsersRound" tone="blue" :note="`${stats.membersCompleted} sudah lengkap`" />
          <AdminStatCard label="Rata-rata per anggota" :value="stats.averagePerMember" :icon="Send" tone="sand" :note="`dari target ${stats.targetPerMember} penerima`" :progress="Math.round((stats.averagePerMember / Math.max(stats.targetPerMember, 1)) * 100)" />
          <AdminStatCard label="Akses membaca" :value="progress.accessUnlocked ? 'Terbuka' : 'Terkunci'" :icon="progress.accessUnlocked ? CircleCheck : LockKeyhole" tone="navy" :note="`${stats.totalDrafts} draf masih tersimpan`" />
        </section>

        <section class="monitoring-overview-grid">
          <article class="monitoring-trend-card"><header><div><p>Akumulasi {{ periodLabel.toLowerCase() }}</p><h2>Gelombang penyelesaian</h2></div><span>{{ trendPoints.at(-1)?.total || 0 }} pasangan</span></header><CompletionTrendChart :points="trendPoints" /><footer><Clock3 :size="14" /> Grafik bertambah saat pasangan pengirim–penerima baru menyelesaikan satu surat.</footer></article>
          <article class="monitoring-division-card"><header><p>Menurut peran</p><h2>Progres tiap divisi</h2></header><div><span v-for="division in progress.divisions" :key="division.role"><i><b :style="{ width: `${division.progress}%` }" /></i><strong>{{ division.role }}</strong><small>{{ division.completedPairs }}/{{ division.targetPairs }}</small><em>{{ division.progress }}%</em></span></div></article>
        </section>

        <MemberCompletionChart :members="admin.rankedProgressMembers.value" :sort="state.monitoringSort" @update:sort="admin.setMonitoringSort" />
        <MessageCompletionMatrix :members="progress.members" :pairs="progress.pairs" />

        <section class="monitoring-attention-grid">
          <article><span><Mail :size="19" /></span><div><p>Belum memulai</p><h2>{{ notStartedMembers.length }} anggota</h2><small>{{ notStartedMembers.length ? notStartedMembers.map((member) => member.name.split(' ')[0]).join(', ') : 'Semua anggota sudah mengirim sedikitnya satu surat.' }}</small></div></article>
          <article><span><CircleCheck :size="19" /></span><div><p>Hampir selesai</p><h2>{{ nearlyCompleteMembers.length }} anggota</h2><small>{{ nearlyCompleteMembers.length ? nearlyCompleteMembers.map((member) => member.name.split(' ')[0]).join(', ') : 'Belum ada anggota pada rentang 75–99%.' }}</small></div></article>
        </section>
        <footer class="admin-footer"><span><Waves :size="18" /> PULUPULU · MONITORING PESAN</span><p>Angka menunjukkan arah; setiap surat tetap menyimpan cerita miliknya sendiri.</p></footer>
      </main>
    </div>
    <AdminBottomNav active="monitoring" @navigate="navigate" />
  </div>
</template>
