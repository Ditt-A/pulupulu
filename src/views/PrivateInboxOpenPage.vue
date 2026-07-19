<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowLeft, ArrowRight, MailOpen, MailPlus, SearchX, Sparkles, Waves } from '@lucide/vue'
import DashboardBottomNav from '@/components/dashboard/DashboardBottomNav.vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import DashboardTopbar from '@/components/dashboard/DashboardTopbar.vue'
import OpenInboxFilters from '@/components/messages/OpenInboxFilters.vue'
import OpenInboxListItem from '@/components/messages/OpenInboxListItem.vue'
import { members } from '@/data/members'
import type { AuthUser } from '@/types/auth'
import type { InboxReadFilter, InboxSort, OpenInboxSummary } from '@/types/messages'

const user = ref<AuthUser | null>(null)
const messages = ref<OpenInboxSummary[]>([])
const loading = ref(true)
const error = ref('')
const menuOpen = ref(false)
const search = ref('')
const filter = ref<InboxReadFilter>('all')
const sort = ref<InboxSort>('newest')

const currentMember = computed(() => members.find((member) => member.id === user.value?.memberId))
const portrait = computed(() => currentMember.value?.portrait || '/images/kkn-group-hero.png')
const firstName = computed(() => user.value?.name.split(' ').find((part) => part.replace(/[^A-Za-zÀ-ÿ]/g, '').length > 2) || 'Teman')
const unreadCount = computed(() => messages.value.filter((message) => !message.isRead).length)

function messageTime(message: OpenInboxSummary) {
  const raw = message.sentAt.includes('T') ? message.sentAt : `${message.sentAt.replace(' ', 'T')}Z`
  return new Date(raw).getTime()
}

const filteredMessages = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('id-ID')
  return messages.value
    .filter((message) => {
      const readMatch = filter.value === 'all' || (filter.value === 'read' ? message.isRead : !message.isRead)
      const searchMatch = !term || [message.sender.name, message.sender.role]
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

function openMessage(message: OpenInboxSummary) {
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

  <div v-else class="dash-shell open-inbox-page" :class="{ 'dash-shell--menu-open': menuOpen }">
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

          <OpenInboxFilters :search="search" :filter="filter" :sort="sort" :total="messages.length" :unread="unreadCount" @update:search="search = $event" @update:filter="filter = $event" @update:sort="sort = $event" />

          <div v-if="messages.length" class="open-inbox-list open-inbox-list--sealed">
              <OpenInboxListItem v-for="message in filteredMessages" :key="message.id" :message="message" @select="openMessage" />
              <div v-if="!filteredMessages.length" class="open-inbox-no-results"><SearchX :size="25" /><strong>Tidak ada surat di hasil ini.</strong><span>Coba kata lain atau pilih filter berbeda.</span><button type="button" @click="search = ''; filter = 'all'">Tampilkan semua</button></div>
          </div>

          <div v-else class="inbox-empty"><span><MailPlus :size="28" /></span><p>Belum ada surat yang tersimpan</p><h3>Ruang ini menunggu<br /><em>cerita pertamanya.</em></h3><small>Tulis pesan kepada seorang teman—mungkin ia akan membalas dengan cerita yang juga ingin kamu simpan.</small><button type="button" @click="writeMessage">Mulai menulis <ArrowRight :size="15" /></button></div>
        </section>

        <aside class="open-inbox-read-note"><MailOpen :size="17" /><span><strong>Isi tetap tersegel di daftar.</strong> Status baru berubah menjadi dibaca setelah kamu mengetuk dan membuka amplop.</span><Waves :size="22" /></aside>
        <footer class="recipient-footer"><Waves :size="18" /><span>Beberapa kata menunggu begitu lama hanya untuk menemukan waktu yang tepat.</span></footer>
      </main>
    </div>

    <DashboardBottomNav active="surat" @navigate="navigate" />

  </div>
</template>
