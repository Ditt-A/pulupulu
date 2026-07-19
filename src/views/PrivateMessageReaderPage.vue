<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, Check, LockKeyhole, LogOut, Waves } from '@lucide/vue'
import AnimatedPrivateEnvelope from '@/components/messages/AnimatedPrivateEnvelope.vue'
import FocusedPrivateLetter from '@/components/messages/FocusedPrivateLetter.vue'
import { members } from '@/data/members'
import type { AuthUser } from '@/types/auth'
import type { OpenInboxMessage, OpenInboxSummary } from '@/types/messages'

const props = defineProps<{ messageId: number }>()
const user = ref<AuthUser | null>(null)
const message = ref<OpenInboxSummary | null>(null)
const openedMessage = ref<OpenInboxMessage | null>(null)
const loading = ref(true)
const error = ref('')
const opening = ref(false)
const opened = ref(false)
const feedback = ref('')
let openTimer = 0
let feedbackTimer = 0

const currentMember = computed(() => members.find((member) => member.id === user.value?.memberId))
const portrait = computed(() => currentMember.value?.portrait || '/images/kkn-group-hero.png')

async function loadMessage() {
  loading.value = true
  try {
    const sessionResponse = await fetch('/api/auth/session', { credentials: 'same-origin' })
    const sessionPayload = await sessionResponse.json()
    if (!sessionResponse.ok) throw new Error(sessionPayload.message || 'Sesi tidak dapat dibuka.')
    user.value = sessionPayload.user

    const messageResponse = await fetch(`/api/messages/${props.messageId}`, { credentials: 'same-origin' })
    const payload = await messageResponse.json()
    if (messageResponse.status === 423) {
      window.location.replace('/dashboard/surat')
      return
    }
    if (!messageResponse.ok) throw new Error(payload.message || 'Surat ini tidak dapat ditemukan.')
    message.value = payload.message
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Surat belum dapat dibuka.'
  } finally {
    loading.value = false
  }
}

async function openLetter() {
  if (!message.value || opening.value || opened.value) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  opening.value = true
  try {
    const animation = new Promise<void>((resolve) => {
      openTimer = window.setTimeout(resolve, reducedMotion ? 0 : 1050)
    })
    const request = fetch(`/api/messages/${message.value.id}/open`, {
      method: 'POST',
      credentials: 'same-origin',
    })
    const [response] = await Promise.all([request, animation])
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Surat belum dapat dibuka.')

    openedMessage.value = payload.message as OpenInboxMessage
    opened.value = true
    opening.value = false
  } catch (cause) {
    opening.value = false
    showFeedback(cause instanceof Error ? cause.message : 'Surat belum dapat dibuka.')
  }
}

function showFeedback(text: string) {
  feedback.value = text
  window.clearTimeout(feedbackTimer)
  feedbackTimer = window.setTimeout(() => { feedback.value = '' }, 3400)
}

function backToInbox() {
  window.location.assign('/dashboard/surat/terbuka')
}

function reply() {
  const currentMessage = openedMessage.value || message.value
  if (!currentMessage) return
  window.sessionStorage.setItem('kkn-message-recipient', String(currentMessage.sender.memberId))
  window.location.assign('/dashboard/pesan/tulis')
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } finally {
    window.sessionStorage.removeItem('kkn-message-recipient')
    window.location.assign('/login')
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') backToInbox()
  if (event.key === 'Enter' && !opened.value) openLetter()
}

onMounted(() => {
  void loadMessage()
  window.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  window.clearTimeout(openTimer)
  window.clearTimeout(feedbackTimer)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <main v-if="loading" class="dash-gate focus-reader-gate">
    <span class="dash-gate__logo"><Waves :size="27" /></span>
    <div class="loading-ripple"><i /><i /><i /></div>
    <h1>Sedang membawa<br /><em>satu surat ke hadapanmu…</em></h1>
    <p>Sebentar, ceritanya hampir sampai.</p>
  </main>

  <main v-else-if="error || !user || !message" class="dash-gate dash-gate--error">
    <span class="dash-gate__logo"><LockKeyhole :size="25" /></span>
    <p class="dash-kicker">Surat privat</p>
    <h1>Surat ini belum dapat<br /><em>dibawa ke hadapanmu.</em></h1>
    <p>{{ error }}</p>
    <a href="/dashboard/surat/terbuka">Kembali ke inbox</a>
  </main>

  <main v-else class="focus-reader-page">
    <img class="focus-reader-page__background" src="/images/kkn-coast-sunset.png" alt="" />
    <div class="focus-reader-page__overlay" />
    <header class="focus-reader-nav">
      <button type="button" @click="backToInbox"><ArrowLeft :size="17" /> Inbox</button>
      <a href="/dashboard"><Waves :size="21" /><strong>PULUPULU</strong><small>RUANG SURAT PRIVAT</small></a>
      <div><img :src="portrait" :alt="user.name" /><span><strong>{{ user.name }}</strong><small>{{ user.role }}</small></span><button type="button" aria-label="Keluar" @click="logout"><LogOut :size="16" /></button></div>
    </header>

    <div class="focus-reader-stage">
      <Transition name="private-reader-stage" mode="out-in">
        <AnimatedPrivateEnvelope v-if="!opened" key="envelope" :message="message" :opening="opening" @open="openLetter" />
        <FocusedPrivateLetter v-else-if="openedMessage" key="letter" :message="openedMessage" :recipient-name="user.name" @back="backToInbox" @reply="reply" />
      </Transition>
    </div>

    <footer class="focus-reader-footer"><span><LockKeyhole :size="12" /> Surat ini hanya ditampilkan untuk akunmu.</span><small>Tekan Esc untuk kembali</small></footer>

    <Transition name="open-inbox-toast"><div v-if="feedback" class="focus-reader-feedback" role="status"><span><Check :size="16" /></span><p><strong>Surat belum terbuka</strong>{{ feedback }}</p></div></Transition>
  </main>
</template>
