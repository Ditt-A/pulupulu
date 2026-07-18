<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, Check, CircleAlert, LockKeyhole, MailCheck, Save, Send, Waves } from '@lucide/vue'
import DashboardBottomNav from '@/components/dashboard/DashboardBottomNav.vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import DashboardTopbar from '@/components/dashboard/DashboardTopbar.vue'
import MessageComposerForm from '@/components/messages/MessageComposerForm.vue'
import MessageDraftIndicator from '@/components/messages/MessageDraftIndicator.vue'
import MessageLetterPreview from '@/components/messages/MessageLetterPreview.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import { members, type Member } from '@/data/members'
import type { AuthUser } from '@/types/auth'
import type { MessageDraftState, PrivateMessageDraft } from '@/types/messages'

const user = ref<AuthUser | null>(null)
const recipient = ref<Member | null>(null)
const loading = ref(true)
const error = ref('')
const menuOpen = ref(false)
const title = ref('')
const body = ref('')
const closing = ref('')
const draftState = ref<MessageDraftState>('empty')
const lastSaved = ref('')
const touched = ref({ title: false, body: false, closing: false })
const submitAttempted = ref(false)
const confirmationOpen = ref(false)
const sending = ref(false)
const sendError = ref('')
const sent = ref(false)

let autoSaveTimer = 0
let changeVersion = 0
let hydrating = true

const currentMember = computed(() => members.find((member) => member.id === user.value?.memberId))
const portrait = computed(() => currentMember.value?.portrait || '/images/kkn-group-hero.png')
const hasContent = computed(() => Boolean(title.value.trim() || body.value.trim() || closing.value.trim()))

const errors = computed<{ title?: string; body?: string; closing?: string }>(() => {
  const result: { title?: string; body?: string; closing?: string } = {}
  if (title.value.length > 60) result.title = 'Judul kecil maksimal 60 karakter.'
  if (body.value.length > 1500) result.body = 'Isi pesan maksimal 1.500 karakter.'
  else if ((touched.value.body || submitAttempted.value) && body.value.trim().length < 20) result.body = 'Tulis sedikitnya 20 karakter sebelum mengirim.'
  if (closing.value.length > 80) result.closing = 'Kalimat penutup maksimal 80 karakter.'
  return result
})

const isValid = computed(() => (
  Boolean(recipient.value)
  && body.value.trim().length >= 20
  && body.value.length <= 1500
  && title.value.length <= 60
  && closing.value.length <= 80
))

function formatSaveTime(value?: string) {
  const date = value
    ? new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
    : new Date()
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date)
}

async function loadPage() {
  loading.value = true
  try {
    const sessionResponse = await fetch('/api/auth/session', { credentials: 'same-origin' })
    const sessionPayload = await sessionResponse.json()
    if (!sessionResponse.ok) throw new Error(sessionPayload.message || 'Sesi tidak dapat dibuka.')
    user.value = sessionPayload.user

    const recipientId = Number(window.sessionStorage.getItem('kkn-message-recipient'))
    recipient.value = members.find((member) => member.id === recipientId && member.id !== user.value?.memberId) || null
    if (!recipient.value) return

    const draftResponse = await fetch(`/api/messages/draft?recipientMemberId=${recipient.value.id}`, { credentials: 'same-origin' })
    const draftPayload = await draftResponse.json()
    if (!draftResponse.ok) throw new Error(draftPayload.message || 'Draf belum dapat dibuka.')

    const draft = draftPayload.draft as PrivateMessageDraft | null
    if (draft) {
      title.value = draft.title
      body.value = draft.body
      closing.value = draft.closing
      draftState.value = 'saved'
      lastSaved.value = formatSaveTime(draft.updatedAt)
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Ruang menulis belum dapat dibuka.'
  } finally {
    loading.value = false
    await nextTick()
    hydrating = false
  }
}

function scheduleAutoSave() {
  if (hydrating || sent.value || !recipient.value) return
  changeVersion += 1
  draftState.value = 'pending'
  window.clearTimeout(autoSaveTimer)
  const version = changeVersion
  autoSaveTimer = window.setTimeout(() => { void saveDraft(version) }, 850)
}

async function saveDraft(version = changeVersion, keepalive = false) {
  if (!recipient.value || sent.value) return false
  window.clearTimeout(autoSaveTimer)
  draftState.value = 'saving'

  try {
    const response = await fetch('/api/messages/draft', {
      method: 'PUT',
      credentials: 'same-origin',
      keepalive,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientMemberId: recipient.value.id,
        title: title.value,
        body: body.value,
        closing: closing.value,
      }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Draf belum dapat disimpan.')

    if (version === changeVersion) {
      draftState.value = payload.draft ? 'saved' : 'empty'
      lastSaved.value = payload.draft ? formatSaveTime(payload.draft.updatedAt) : ''
      error.value = ''
    }
    return true
  } catch (cause) {
    if (version === changeVersion) draftState.value = 'error'
    error.value = cause instanceof Error ? cause.message : 'Draf belum dapat disimpan.'
    return false
  }
}

function touchField(field: 'title' | 'body' | 'closing') {
  touched.value = { ...touched.value, [field]: true }
}

function usePrompt(prompt: string) {
  body.value = body.value.trim() ? `${body.value.trimEnd()}\n\n${prompt}` : prompt
  void nextTick(() => document.getElementById('private-message-body')?.focus())
}

function requestSend() {
  submitAttempted.value = true
  touched.value = { title: true, body: true, closing: true }
  sendError.value = ''
  if (!isValid.value) {
    void nextTick(() => document.querySelector<HTMLTextAreaElement>('.composer-field--body textarea')?.focus())
    return
  }
  confirmationOpen.value = true
}

async function sendMessage() {
  if (!recipient.value || !isValid.value || sending.value) return
  sending.value = true
  sendError.value = ''
  window.clearTimeout(autoSaveTimer)

  try {
    const response = await fetch('/api/messages/send', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientMemberId: recipient.value.id,
        title: title.value,
        body: body.value,
        closing: closing.value,
      }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Pesan belum dapat dikirim.')

    sent.value = true
    confirmationOpen.value = false
    draftState.value = 'saved'
    window.sessionStorage.removeItem('kkn-message-recipient')
  } catch (cause) {
    confirmationOpen.value = false
    sendError.value = cause instanceof Error ? cause.message : 'Pesan belum dapat dikirim.'
  } finally {
    sending.value = false
  }
}

async function saveAndLeave() {
  const saved = await saveDraft(changeVersion)
  if (saved) window.location.assign('/dashboard/pesan/baru')
}

function chooseRecipient() {
  window.location.assign('/dashboard/pesan/baru')
}

function navigate(section: string) {
  if (section === 'profil') {
    window.location.assign('/dashboard/profil')
    return
  }
  if (section === 'surat') {
    window.location.assign('/dashboard/surat')
    return
  }
  window.location.assign(section === 'beranda' ? '/dashboard' : `/dashboard#dash-${section}`)
}

async function logout() {
  if (draftState.value === 'pending') await saveDraft(changeVersion)
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } finally {
    window.sessionStorage.removeItem('kkn-message-recipient')
    window.location.assign('/login')
  }
}

function flushDraft() {
  if (draftState.value === 'pending') void saveDraft(changeVersion, true)
}

watch([title, body, closing], scheduleAutoSave)
onMounted(() => {
  void loadPage()
  window.addEventListener('beforeunload', flushDraft)
})
onBeforeUnmount(() => {
  window.clearTimeout(autoSaveTimer)
  window.removeEventListener('beforeunload', flushDraft)
  flushDraft()
})
</script>

<template>
  <main v-if="loading" class="dash-gate">
    <span class="dash-gate__logo"><Waves :size="27" /></span>
    <div class="loading-ripple"><i /><i /><i /></div>
    <h1>Sedang membuka<br /><em>lembar suratmu…</em></h1>
    <p>Sebentar, draf terakhirmu sedang diperiksa.</p>
  </main>

  <main v-else-if="error && !user" class="dash-gate dash-gate--error">
    <span class="dash-gate__logo"><LockKeyhole :size="25" /></span>
    <p class="dash-kicker">Ruang anggota privat</p>
    <h1>Kamu perlu masuk<br /><em>sebelum menulis pesan.</em></h1>
    <p>{{ error }}</p>
    <a href="/login">Masuk kembali</a>
  </main>

  <div v-else-if="user" class="dash-shell composer-page" :class="{ 'dash-shell--menu-open': menuOpen }">
    <DashboardSidebar :user="user" :portrait="portrait" active="surat" @navigate="navigate" @logout="logout" />
    <button class="dash-shell__scrim" aria-label="Tutup menu" @click="menuOpen = false" />

    <div class="dash-workspace">
      <DashboardTopbar :user="user" :portrait="portrait" @menu="menuOpen = true" />

      <main v-if="!recipient" class="composer-missing">
        <span><MailCheck :size="28" /></span>
        <p>Langkah pertama</p>
        <h1>Pilih seseorang<br /><em>sebelum mulai menulis.</em></h1>
        <p>Pesan privat membutuhkan satu penerima dari lingkaran anggota MMD FILKOM 33.</p>
        <button type="button" @click="chooseRecipient">Pilih penerima <ArrowRight :size="16" /></button>
      </main>

      <main v-else-if="sent" class="composer-sent">
        <div class="composer-sent__envelope"><span><MailCheck :size="28" /></span><i /><b /></div>
        <p>Pesan telah berlayar</p>
        <h1>Suratmu sudah dikirim<br /><em>kepada {{ recipient.name.split(' ')[0] }}.</em></h1>
        <span>Pesan tersimpan dengan aman dan hanya dapat dibuka oleh {{ recipient.name }}.</span>
        <div><button type="button" @click="navigate('surat')">Kembali ke ruang surat</button><button type="button" @click="chooseRecipient">Tulis pesan lain <ArrowRight :size="15" /></button></div>
      </main>

      <main v-else class="composer-content">
        <button class="recipient-back" type="button" @click="saveAndLeave"><ArrowLeft :size="15" /> Ganti penerima</button>

        <header class="composer-heading">
          <div><p>Ruang menulis privat</p><h1>Satu pesan kecil<br /><em>untuk {{ recipient.name.split(' ')[0] }}.</em></h1></div>
          <div class="composer-heading__meta">
            <MessageDraftIndicator :state="draftState" :last-saved="lastSaved" />
            <button type="button" @click="saveAndLeave"><img :src="recipient.portrait" :alt="recipient.name" /><span><small>Penerima</small><strong>{{ recipient.name }}</strong></span><ArrowRight :size="14" /></button>
          </div>
        </header>

        <div v-if="error || sendError" class="composer-alert" role="alert"><CircleAlert :size="17" /><span><strong>Pesan belum aman disimpan.</strong>{{ sendError || error }}</span><button type="button" @click="error = ''; sendError = ''">Tutup</button></div>

        <div class="composer-layout">
          <MessageComposerForm
            :title="title"
            :body="body"
            :closing="closing"
            :sender-name="user.name"
            :recipient-name="recipient.name"
            :errors="errors"
            @update:title="title = $event"
            @update:body="body = $event"
            @update:closing="closing = $event"
            @blur="touchField"
            @prompt="usePrompt"
          />

          <MessageLetterPreview :recipient="recipient" :sender-name="user.name" :title="title" :body="body" :closing="closing" />
        </div>

        <section class="composer-actions">
          <div>
            <span :class="{ valid: isValid }"><Check v-if="isValid" :size="14" /><CircleAlert v-else :size="14" /></span>
            <p><strong>{{ isValid ? 'Pesan siap dikirim' : 'Pesan belum siap dikirim' }}</strong><small>{{ isValid ? 'Semua validasi sudah terpenuhi.' : 'Isi pesan sedikitnya 20 karakter.' }}</small></p>
          </div>
          <button class="composer-actions__save" type="button" :disabled="draftState === 'saving'" @click="saveAndLeave"><Save :size="15" /> Simpan & kembali</button>
          <button class="composer-actions__send" type="button" :disabled="sending" @click="requestSend"><Send :size="15" /> {{ sending ? 'Mengirim…' : 'Kirim pesan' }}</button>
        </section>
      </main>
    </div>

    <DashboardBottomNav active="surat" @navigate="navigate" />

    <ConfirmationModal
      :open="confirmationOpen"
      :title="`Kirim pesan untuk ${recipient?.name.split(' ')[0]}?`"
      description="Setelah dikirim, draf akan berubah menjadi surat privat dan tidak lagi dapat diedit dari halaman ini."
      @close="confirmationOpen = false"
      @confirm="sendMessage"
    />
  </div>
</template>
