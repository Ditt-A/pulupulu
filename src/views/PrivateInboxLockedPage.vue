<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, ArrowRight, LockKeyhole, MailPlus, ShieldCheck, Sparkles, Waves } from '@lucide/vue'
import DashboardBottomNav from '@/components/dashboard/DashboardBottomNav.vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import DashboardTopbar from '@/components/dashboard/DashboardTopbar.vue'
import InboxUnlockPanel from '@/components/messages/InboxUnlockPanel.vue'
import LockedInboxEnvelope from '@/components/messages/LockedInboxEnvelope.vue'
import { members } from '@/data/members'
import type { AuthUser } from '@/types/auth'
import type { LockedInboxMessage } from '@/types/messages'

const user = ref<AuthUser | null>(null)
const messages = ref<LockedInboxMessage[]>([])
const releaseAt = ref('2026-08-08T19:00:00+07:00')
const loading = ref(true)
const error = ref('')
const menuOpen = ref(false)
const feedback = ref('')
const feedbackSender = ref('')
let feedbackTimer = 0

const currentMember = computed(() => members.find((member) => member.id === user.value?.memberId))
const portrait = computed(() => currentMember.value?.portrait || '/images/kkn-group-hero.png')
const firstName = computed(() => user.value?.name.split(' ').find((part) => part.replace(/[^A-Za-zÀ-ÿ]/g, '').length > 2) || 'Teman')

async function loadInbox() {
  loading.value = true
  try {
    const sessionResponse = await fetch('/api/auth/session', { credentials: 'same-origin' })
    const sessionPayload = await sessionResponse.json()
    if (!sessionResponse.ok) throw new Error(sessionPayload.message || 'Sesi tidak dapat dibuka.')
    user.value = sessionPayload.user

    const inboxResponse = await fetch('/api/messages/inbox', { credentials: 'same-origin' })
    const inboxPayload = await inboxResponse.json()
    if (!inboxResponse.ok) throw new Error(inboxPayload.message || 'Inbox privat belum dapat dibuka.')
    if (inboxPayload.accessUnlocked) {
      window.location.replace('/dashboard/surat/terbuka')
      return
    }
    messages.value = inboxPayload.messages
    releaseAt.value = inboxPayload.releaseAt
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Inbox privat belum dapat dibuka.'
  } finally {
    loading.value = false
  }
}

function inspectLocked(message: LockedInboxMessage) {
  feedbackSender.value = message.sender.name
  feedback.value = 'Segelnya masih menjaga cerita ini.'
  window.clearTimeout(feedbackTimer)
  feedbackTimer = window.setTimeout(() => { feedback.value = '' }, 3400)
}

function navigate(section: string) {
  if (section === 'surat') return
  if (section === 'profil') {
    window.location.assign('/dashboard/profil')
    return
  }
  window.location.assign(section === 'beranda' ? '/dashboard' : `/dashboard#dash-${section}`)
}

function writeMessage() {
  window.location.assign('/dashboard/pesan/baru')
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } finally {
    window.sessionStorage.removeItem('kkn-message-recipient')
    window.location.assign('/login')
  }
}

onMounted(loadInbox)
onBeforeUnmount(() => window.clearTimeout(feedbackTimer))
</script>

<template>
  <main v-if="loading" class="dash-gate inbox-gate">
    <span class="dash-gate__logo"><LockKeyhole :size="25" /></span>
    <div class="loading-ripple"><i /><i /><i /></div>
    <h1>Sedang menghitung<br /><em>surat yang menunggumu…</em></h1>
    <p>Sebentar, segelnya sedang diperiksa.</p>
  </main>

  <main v-else-if="error || !user" class="dash-gate dash-gate--error">
    <span class="dash-gate__logo"><LockKeyhole :size="25" /></span>
    <p class="dash-kicker">Inbox anggota privat</p>
    <h1>Ruang ini masih<br /><em>tertutup untukmu.</em></h1>
    <p>{{ error }}</p>
    <a href="/login">Masuk kembali</a>
  </main>

  <div v-else class="dash-shell inbox-page" :class="{ 'dash-shell--menu-open': menuOpen }">
    <DashboardSidebar :user="user" :portrait="portrait" active="surat" @navigate="navigate" @logout="logout" />
    <button class="dash-shell__scrim" aria-label="Tutup menu" @click="menuOpen = false" />

    <div class="dash-workspace">
      <DashboardTopbar :user="user" :portrait="portrait" @menu="menuOpen = true" />

      <main class="inbox-content">
        <button class="recipient-back" type="button" @click="navigate('beranda')"><ArrowLeft :size="15" /> Kembali ke beranda</button>

        <section class="inbox-locked-hero">
          <div class="inbox-locked-hero__copy">
            <p><Sparkles :size="14" /> Inbox privat · masih tersegel</p>
            <h1>Ada kata-kata yang sedang<br /><em>menunggumu, {{ firstName }}.</em></h1>
            <span>Surat-surat ini sudah sampai, tetapi ceritanya sepakat menunggu malam terakhir untuk dibuka bersama.</span>
            <button type="button" @click="writeMessage"><MailPlus :size="15" /> Balas dengan menulis pesan</button>
          </div>
          <div class="inbox-locked-hero__stack" aria-hidden="true">
            <i /><i /><i />
            <span><LockKeyhole :size="25" /></span>
            <b>{{ messages.length }}</b><small>surat<br />tersegel</small>
          </div>
          <svg viewBox="0 0 920 170" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 88 C142 21 290 148 465 80 S735 32 940 104"/><path d="M-35 128 C130 78 310 179 500 125 S772 88 950 144"/></svg>
        </section>

        <InboxUnlockPanel :release-at="releaseAt" :message-count="messages.length" />

        <section class="inbox-directory">
          <header class="inbox-directory__head">
            <div><p>Disimpan untukmu</p><h2>Surat-surat yang belum boleh bercerita.</h2></div>
            <button type="button" @click="writeMessage">Tulis surat baru <ArrowRight :size="15" /></button>
          </header>

          <div v-if="messages.length" class="inbox-envelope-grid">
            <LockedInboxEnvelope v-for="(message, index) in messages" :key="message.id" :message="message" :index="index" @locked="inspectLocked" />
          </div>

          <div v-else class="inbox-empty">
            <span><MailPlus :size="28" /></span>
            <p>Belum ada surat yang berlabuh</p>
            <h3>Inbox ini masih setenang<br /><em>laut sebelum pagi.</em></h3>
            <small>Saat seorang teman mengirim pesan, amplop tersegelnya akan muncul di sini tanpa membocorkan isi.</small>
            <button type="button" @click="writeMessage">Jadi yang pertama menulis <ArrowRight :size="15" /></button>
          </div>
        </section>

        <aside class="inbox-privacy-note"><ShieldCheck :size="19" /><span><strong>Isi surat tidak dimuat pada halaman ini.</strong> Hanya metadata pengirim dan waktu segel yang ditampilkan sampai jadwal pembukaan tiba.</span><Waves :size="24" /></aside>
        <footer class="recipient-footer"><Waves :size="18" /><span>Ada cerita yang menjadi lebih berarti karena kita bersedia menunggunya.</span></footer>
      </main>
    </div>

    <DashboardBottomNav active="surat" @navigate="navigate" />

    <Transition name="lock-feedback">
      <div v-if="feedback" class="inbox-lock-feedback" role="status" aria-live="polite">
        <span><LockKeyhole :size="18" /><i /></span>
        <p><strong>Belum waktunya dibuka</strong>{{ feedback }} Surat dari {{ feedbackSender }} akan terbuka pada malam perpisahan.</p>
      </div>
    </Transition>
  </div>
</template>
