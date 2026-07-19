<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, ArrowRight, CalendarDays, Camera, KeyRound, LockKeyhole, MapPin, Quote, ShieldCheck, Sparkles, UserRound, Waves } from '@lucide/vue'
import DashboardBottomNav from '@/components/dashboard/DashboardBottomNav.vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import DashboardTopbar from '@/components/dashboard/DashboardTopbar.vue'
import PasswordChangeForm from '@/components/profile/PasswordChangeForm.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import { members } from '@/data/members'
import type { AuthUser, PasswordChangePayload } from '@/types/auth'

const user = ref<AuthUser | null>(null)
const loading = ref(true)
const error = ref('')
const menuOpen = ref(false)
const passwordLoading = ref(false)
const passwordError = ref('')
const passwordResetKey = ref(0)
const showToast = ref(false)
const revokedSessions = ref(0)
let toastTimer = 0

const currentMember = computed(() => members.find((member) => member.id === user.value?.memberId))
const portrait = computed(() => currentMember.value?.portrait || '/images/kkn-group-hero.png')
const memory = computed(() => currentMember.value?.memory || 'Satu nama di antara tiga belas cerita yang tumbuh bersama di pesisir.')
const firstName = computed(() => user.value?.name.split(' ').find((part) => part.replace(/[^A-Za-zÀ-ÿ]/g, '').length > 2) || 'Teman')
const accountLabel = computed(() => user.value?.accountType === 'admin' ? 'Administrator' : 'Anggota KKN')

async function loadSession() {
  loading.value = true
  try {
    const response = await fetch('/api/auth/session', { credentials: 'same-origin' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Sesi tidak dapat dibuka.')
    user.value = payload.user
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Profil belum dapat dibuka.'
  } finally {
    loading.value = false
  }
}

function navigate(section: string) {
  menuOpen.value = false
  if (section === 'profil') return
  if (section === 'surat') {
    window.location.assign('/dashboard/surat')
    return
  }
  window.location.assign(section === 'beranda' ? '/dashboard' : `/dashboard#dash-${section}`)
}

async function changePassword(payload: PasswordChangePayload) {
  passwordLoading.value = true
  passwordError.value = ''
  try {
    const response = await fetch('/api/account/password', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'Kata sandi belum dapat diperbarui.')

    if (user.value) user.value.mustChangePassword = false
    revokedSessions.value = Number(result.sessionsRevoked || 0)
    passwordResetKey.value += 1
    showToast.value = true
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => { showToast.value = false }, 4800)
  } catch (cause) {
    passwordError.value = cause instanceof Error ? cause.message : 'Kata sandi belum dapat diperbarui.'
  } finally {
    passwordLoading.value = false
  }
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } finally {
    window.sessionStorage.removeItem('kkn-message-recipient')
    window.location.assign('/login')
  }
}

onMounted(loadSession)
onBeforeUnmount(() => window.clearTimeout(toastTimer))
</script>

<template>
  <main v-if="loading" class="dash-gate profile-gate">
    <span class="dash-gate__logo"><UserRound :size="26" /></span>
    <div class="loading-ripple"><i /><i /><i /></div>
    <h1>Sedang merapikan<br /><em>cerita tentangmu…</em></h1>
    <p>Sebentar, profilmu hampir sampai.</p>
  </main>

  <main v-else-if="error || !user" class="dash-gate dash-gate--error">
    <span class="dash-gate__logo"><LockKeyhole :size="25" /></span>
    <p class="dash-kicker">Profil anggota privat</p>
    <h1>Halaman ini masih<br /><em>tertutup untukmu.</em></h1>
    <p>{{ error }}</p>
    <a href="/login">Masuk kembali <ArrowRight :size="17" /></a>
  </main>

  <div v-else class="dash-shell profile-page" :class="{ 'dash-shell--menu-open': menuOpen }">
    <DashboardSidebar :user="user" :portrait="portrait" active="profil" @navigate="navigate" @logout="logout" />
    <button class="dash-shell__scrim" aria-label="Tutup menu" @click="menuOpen = false" />

    <div class="dash-workspace">
      <DashboardTopbar :user="user" :portrait="portrait" @menu="menuOpen = true" />

      <main class="profile-content">
        <button class="recipient-back" type="button" @click="navigate('beranda')"><ArrowLeft :size="15" /> Kembali ke beranda</button>

        <section class="profile-hero">
          <img src="/images/kkn-coast-sunset.png" alt="Garis pantai tempat perjalanan KKN tersimpan" />
          <div class="profile-hero__overlay" />
          <svg viewBox="0 0 1000 190" preserveAspectRatio="none" aria-hidden="true"><path d="M-40 100 C145 26 300 154 500 88 S820 45 1040 120"/><path d="M-40 141 C150 84 325 185 525 132 S815 95 1045 154"/></svg>
          <div class="profile-hero__identity">
            <div class="profile-hero__portrait"><img :src="portrait" :alt="user.name" /><span><Camera :size="15" /></span></div>
            <div><p><Sparkles :size="13" /> Profil anggota</p><h1>{{ user.name }}</h1><span>{{ user.role }} · MMD FILKOM 33</span></div>
          </div>
          <StatusBadge :tone="user.mustChangePassword ? 'warning' : 'success'">{{ user.mustChangePassword ? 'Perlu ganti kata sandi' : 'Akun terlindungi' }}</StatusBadge>
        </section>

        <div class="profile-layout">
          <aside class="profile-aside">
            <article class="profile-story-card">
              <Quote :size="22" />
              <p>{{ memory }}</p>
              <span>— satu catatan kecil tentang {{ firstName }}</span>
            </article>

            <article class="profile-detail-card">
              <header><p>Tentang akunmu</p><h2>Detail anggota</h2></header>
              <dl>
                <div><dt><UserRound :size="15" /> Nama pengguna</dt><dd>@{{ user.username }}</dd></div>
                <div><dt><Waves :size="15" /> Peran di kelompok</dt><dd>{{ user.role }}</dd></div>
                <div><dt><ShieldCheck :size="15" /> Jenis akses</dt><dd>{{ accountLabel }}</dd></div>
                <div><dt><CalendarDays :size="15" /> Bergabung</dt><dd>Juli 2026</dd></div>
                <div><dt><MapPin :size="15" /> Perjalanan</dt><dd>Desa Sumbersih</dd></div>
              </dl>
            </article>

            <article class="profile-keepsake">
              <span><strong>30</strong><small>hari<br />bersama</small></span>
              <i />
              <p>“Profil ini adalah satu halaman kecil dari cerita tiga belas orang.”</p>
            </article>
          </aside>

          <section class="profile-security">
            <div class="profile-security__intro">
              <div><p>Ruang yang hanya milikmu</p><h2>Jaga cerita ini tetap privat.</h2></div>
              <span><KeyRound :size="18" /> Kata sandi diacak satu arah dan tidak dapat dibaca oleh anggota lain.</span>
            </div>

            <aside v-if="user.mustChangePassword" class="profile-password-notice">
              <span><ShieldCheck :size="20" /></span>
              <p><strong>Satu langkah kecil sebelum melanjutkan.</strong>Kamu masih menggunakan kata sandi awal dari pengelola. Ganti sekarang agar ruang kenangan ini benar-benar menjadi milikmu.</p>
            </aside>

            <PasswordChangeForm :username="user.username" :loading="passwordLoading" :server-error="passwordError" :reset-key="passwordResetKey" @submit="changePassword" @clear-error="passwordError = ''" />
          </section>
        </div>

        <footer class="recipient-footer profile-footer"><Waves :size="18" /><span>Yang privat tetap privat; yang berkesan tetap tinggal.</span></footer>
      </main>
    </div>

    <DashboardBottomNav active="profil" @navigate="navigate" />
    <ToastNotification :show="showToast" title="Kata sandi sudah diperbarui" :message="revokedSessions ? `${revokedSessions} sesi lain telah dikeluarkan dari akunmu.` : 'Akunmu kini memakai kata sandi baru.'" @close="showToast = false" />
  </div>
</template>
