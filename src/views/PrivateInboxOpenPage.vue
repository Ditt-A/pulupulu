<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, ArrowRight, CheckCheck, MailOpen, MailPlus, SearchX, Sparkles, Waves } from '@lucide/vue'
import DashboardBottomNav from '@/components/dashboard/DashboardBottomNav.vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import DashboardTopbar from '@/components/dashboard/DashboardTopbar.vue'
import OpenedPrivateLetter from '@/components/messages/OpenedPrivateLetter.vue'
import OpenInboxFilters from '@/components/messages/OpenInboxFilters.vue'
import OpenInboxListItem from '@/components/messages/OpenInboxListItem.vue'
import { members } from '@/data/members'
import type { AuthUser } from '@/types/auth'
import type { InboxReadFilter, InboxSort, OpenInboxMessage } from '@/types/messages'

const user = ref<AuthUser | null>(null)
const messages = ref<OpenInboxMessage[]>([])
const loading = ref(true)
const error = ref('')
const menuOpen = ref(false)
const search = ref('')
const filter = ref<InboxReadFilter>('all')
const sort = ref<InboxSort>('newest')
const selectedId = ref<number | null>(null)
const readerOpen = ref(false)
const feedback = ref('')
const feedbackTitle = ref('')
let feedbackTimer = 0

const currentMember = computed(() => members.find((member) => member.id === user.value?.memberId))
const portrait = computed(() => currentMember.value?.portrait || '/images/kkn-group-hero.png')
const firstName = computed(() => user.value?.name.split(' ').find((part) => part.replace(/[^A-Za-zÀ-ÿ]/g, '').length > 2) || 'Teman')
const unreadCount = computed(() => messages.value.filter((message) => !message.isRead).length)
const selectedMessage = computed(() => messages.value.find((message) => message.id === selectedId.value) || null)

function messageTime(message: OpenInboxMessage) {
  const raw = message.sentAt.includes('T') ? message.sentAt : `${message.sentAt.replace(' ', 'T')}Z`
  return new Date(raw).getTime()
}

const filteredMessages = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('id-ID')
  return messages.value
    .filter((message) => {
      const readMatch = filter.value === 'all' || (filter.value === 'read' ? message.isRead : !message.isRead)
      const searchMatch = !term || [message.sender.name, message.sender.role, message.title, message.body, message.closing]
        .some((value) => value.toLocaleLowerCase('id-ID').includes(term))
      return readMatch && searchMatch
    })
    .sort((a, b) => sort.value === 'newest' ? messageTime(b) - messageTime(a) : messageTime(a) - messageTime(b))
})

async function loadInbox() {
  loading.value = true
  try {
    const sessionResponse = await fetch('/api/auth/session', { credentials: 'same-origin' })
    const sessionPayload = await sessionResponse.json()
    if (!sessionResponse.ok) throw new Error(sessionPayload.message || 'Sesi tidak dapat dibuka.')
    user.value = sessionPayload.user

    const inboxResponse = await fetch('/api/messages/open-inbox', { credentials: 'same-origin' })
    const inboxPayload = await inboxResponse.json()
    if (inboxResponse.status === 423) {
      window.location.replace('/dashboard/surat')
      return
    }
    if (!inboxResponse.ok) throw new Error(inboxPayload.message || 'Surat-suratmu belum dapat dibuka.')
    messages.value = inboxPayload.messages
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Inbox terbuka belum dapat dimuat.'
  } finally {
    loading.value = false
  }
}

async function openMessage(message: OpenInboxMessage) {
  selectedId.value = message.id
  readerOpen.value = true
  if (message.isRead) return

  message.isRead = true
  message.readAt = new Date().toISOString()
  try {
    const response = await fetch(`/api/messages/${message.id}/read`, { method: 'PATCH', credentials: 'same-origin' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Status baca belum dapat disimpan.')
    message.readAt = payload.message.readAt
  } catch (cause) {
    message.isRead = false
    message.readAt = null
    showFeedback('Status belum tersimpan', cause instanceof Error ? cause.message : 'Coba buka surat ini lagi.')
  }
}

async function markAllRead() {
  const unread = messages.value.filter((message) => !message.isRead)
  if (!unread.length) return
  const markedAt = new Date().toISOString()
  unread.forEach((message) => { message.isRead = true; message.readAt = markedAt })

  try {
    const response = await fetch('/api/messages/read-all', { method: 'PATCH', credentials: 'same-origin' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Status surat belum dapat diperbarui.')
    showFeedback('Semua surat sudah dibaca', `${payload.updated} surat ditandai sebagai sudah dibaca.`)
  } catch (cause) {
    unread.forEach((message) => { message.isRead = false; message.readAt = null })
    showFeedback('Perubahan dibatalkan', cause instanceof Error ? cause.message : 'Silakan coba lagi.')
  }
}

function showFeedback(title: string, message: string) {
  feedbackTitle.value = title
  feedback.value = message
  window.clearTimeout(feedbackTimer)
  feedbackTimer = window.setTimeout(() => { feedback.value = '' }, 3400)
}

function closeReader() {
  readerOpen.value = false
}

function replyTo(message: OpenInboxMessage) {
  window.sessionStorage.setItem('kkn-message-recipient', String(message.sender.memberId))
  window.location.assign('/dashboard/pesan/tulis')
}

function focusMessage(message: OpenInboxMessage) {
  window.location.assign(`/dashboard/surat/${message.id}`)
}

function writeMessage() {
  window.location.assign('/dashboard/pesan/baru')
}

function navigate(section: string) {
  if (section === 'surat') return
  if (section === 'profil') {
    window.location.assign('/dashboard/profil')
    return
  }
  window.location.assign(section === 'beranda' ? '/dashboard' : `/dashboard#dash-${section}`)
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
  <main v-if="loading" class="dash-gate open-inbox-gate">
    <span class="dash-gate__logo"><MailOpen :size="27" /></span>
    <div class="loading-ripple"><i /><i /><i /></div>
    <h1>Sedang membuka<br /><em>surat-surat yang pulang…</em></h1>
    <p>Sebentar, semua cerita sedang dirapikan untukmu.</p>
  </main>

  <main v-else-if="error || !user" class="dash-gate dash-gate--error">
    <span class="dash-gate__logo"><MailOpen :size="25" /></span>
    <p class="dash-kicker">Inbox anggota privat</p>
    <h1>Surat-suratmu belum<br /><em>dapat dibawa ke sini.</em></h1>
    <p>{{ error }}</p>
    <a href="/dashboard/surat">Kembali ke inbox</a>
  </main>

  <div v-else class="dash-shell open-inbox-page" :class="{ 'dash-shell--menu-open': menuOpen, 'open-inbox-page--reader-open': readerOpen }">
    <DashboardSidebar :user="user" :portrait="portrait" active="surat" @navigate="navigate" @logout="logout" />
    <button class="dash-shell__scrim" aria-label="Tutup menu" @click="menuOpen = false" />

    <div class="dash-workspace">
      <DashboardTopbar :user="user" :portrait="portrait" @menu="menuOpen = true" />

      <main class="open-inbox-content">
        <button class="recipient-back" type="button" @click="navigate('beranda')"><ArrowLeft :size="15" /> Kembali ke beranda</button>

        <section class="open-inbox-hero">
          <img src="/images/kkn-coast-sunset.png" alt="" />
          <div class="open-inbox-hero__overlay" />
          <div class="open-inbox-hero__copy"><p><Sparkles :size="14" /> Inbox privat · akses terbuka</p><h1>Malam yang ditunggu<br /><em>akhirnya tiba, {{ firstName }}.</em></h1><span>Setiap surat kini boleh bercerita. Buka perlahan, baca tanpa terburu-buru, dan simpan perasaan yang datang bersamanya.</span></div>
          <div class="open-inbox-hero__stats"><article><strong>{{ messages.length }}</strong><span>semua<br />surat</span></article><article><strong>{{ unreadCount }}</strong><span>belum<br />dibaca</span></article><article><strong>{{ messages.length - unreadCount }}</strong><span>sudah<br />dibaca</span></article></div>
          <svg viewBox="0 0 900 150" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 75 C140 12 285 135 455 72 S725 28 920 92"/><path d="M-40 112 C130 65 300 165 490 111 S760 78 930 128"/></svg>
        </section>

        <section class="open-inbox-directory">
          <header class="open-inbox-directory__head"><div><p>Untukmu, akhirnya</p><h2>Surat-surat yang sudah boleh bercerita.</h2></div><button type="button" @click="writeMessage"><MailPlus :size="15" /> Tulis pesan baru</button></header>

          <OpenInboxFilters :search="search" :filter="filter" :sort="sort" :total="messages.length" :unread="unreadCount" @update:search="search = $event" @update:filter="filter = $event" @update:sort="sort = $event" @read-all="markAllRead" />

          <div v-if="messages.length" class="open-inbox-layout">
            <div class="open-inbox-list">
              <OpenInboxListItem v-for="message in filteredMessages" :key="message.id" :message="message" :selected="selectedId === message.id" @select="openMessage" />
              <div v-if="!filteredMessages.length" class="open-inbox-no-results"><SearchX :size="25" /><strong>Tidak ada surat di hasil ini.</strong><span>Coba kata lain atau pilih filter berbeda.</span><button type="button" @click="search = ''; filter = 'all'">Tampilkan semua</button></div>
            </div>

            <button v-if="readerOpen" class="open-inbox-reader__scrim" type="button" aria-label="Tutup surat" @click="closeReader" />
            <div class="open-inbox-reader" :class="{ 'open-inbox-reader--visible': readerOpen }">
              <OpenedPrivateLetter v-if="selectedMessage" :message="selectedMessage" :recipient-name="user.name" @close="closeReader" @reply="replyTo" @focus="focusMessage" />
              <div v-else class="open-inbox-reader__empty"><span><MailOpen :size="29" /></span><p>Pilih satu surat</p><h3>Biarkan sebuah cerita<br /><em>terbuka di sini.</em></h3><small>Status akan otomatis berubah menjadi dibaca ketika surat dibuka.</small></div>
            </div>
          </div>

          <div v-else class="inbox-empty"><span><MailPlus :size="28" /></span><p>Belum ada surat yang tersimpan</p><h3>Ruang ini menunggu<br /><em>cerita pertamanya.</em></h3><small>Tulis pesan kepada seorang teman—mungkin ia akan membalas dengan cerita yang juga ingin kamu simpan.</small><button type="button" @click="writeMessage">Mulai menulis <ArrowRight :size="15" /></button></div>
        </section>

        <aside class="open-inbox-read-note"><CheckCheck :size="17" /><span><strong>Status baca tersimpan otomatis.</strong> Surat yang dibuka akan tetap ditandai sebagai sudah dibaca saat kamu kembali lagi.</span><Waves :size="22" /></aside>
        <footer class="recipient-footer"><Waves :size="18" /><span>Beberapa kata menunggu begitu lama hanya untuk menemukan waktu yang tepat.</span></footer>
      </main>
    </div>

    <DashboardBottomNav active="surat" @navigate="navigate" />

    <Transition name="open-inbox-toast">
      <div v-if="feedback" class="open-inbox-feedback" role="status" aria-live="polite"><span><CheckCheck :size="18" /></span><p><strong>{{ feedbackTitle }}</strong>{{ feedback }}</p></div>
    </Transition>
  </div>
</template>
