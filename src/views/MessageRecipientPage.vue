<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ArrowLeft, CheckCircle2, LockKeyhole, SearchX, Sparkles, UsersRound, Waves } from '@lucide/vue'
import DashboardBottomNav from '@/components/dashboard/DashboardBottomNav.vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import DashboardTopbar from '@/components/dashboard/DashboardTopbar.vue'
import MessageRecipientCard from '@/components/messages/MessageRecipientCard.vue'
import MessageRecipientFilters from '@/components/messages/MessageRecipientFilters.vue'
import MessageRecipientSummary from '@/components/messages/MessageRecipientSummary.vue'
import { members, type Member } from '@/data/members'
import type { AuthUser } from '@/types/auth'
import type { MessageRecipientStatus, MessageStatusFilter } from '@/types/messages'

const user = ref<AuthUser | null>(null)
const loading = ref(true)
const error = ref('')
const menuOpen = ref(false)
const search = ref('')
const division = ref('all')
const status = ref<MessageStatusFilter>('all')
const selected = ref<Member | null>(null)
const confirmed = ref(false)
const recipientStatuses = ref<Partial<Record<number, MessageRecipientStatus>>>({})
const toast = ref('')
let toastTimer = 0

const divisions = ['Pengurus Inti', 'Acara', 'Humas', 'Perkap', 'DDM']
const currentMember = computed(() => members.find((member) => member.id === user.value?.memberId))
const portrait = computed(() => currentMember.value?.portrait || '/images/kkn-group-hero.png')
const otherMembers = computed(() => members.filter((member) => member.id !== user.value?.memberId))
const hasFilters = computed(() => Boolean(search.value || division.value !== 'all' || status.value !== 'all'))

function divisionFor(role: string) {
  if (['Acara', 'Humas', 'Perkap', 'DDM'].includes(role)) return role
  return 'Pengurus Inti'
}

function recipientStatus(memberId: number) {
  return recipientStatuses.value[memberId] || 'available'
}

function matchesText(member: Member) {
  const term = search.value.trim().toLocaleLowerCase('id-ID')
  if (!term) return true
  return [member.name, member.role, member.memory, divisionFor(member.role)]
    .some((value) => value.toLocaleLowerCase('id-ID').includes(term))
}

const statusBase = computed(() => otherMembers.value.filter((member) => {
  const divisionMatch = division.value === 'all' || divisionFor(member.role) === division.value
  return divisionMatch && matchesText(member)
}))

const statusCounts = computed<Record<MessageRecipientStatus, number>>(() => {
  const counts: Record<MessageRecipientStatus, number> = { available: 0, draft: 0, sent: 0 }
  statusBase.value.forEach((member) => { counts[recipientStatus(member.id)] += 1 })
  return counts
})

const filteredMembers = computed(() => statusBase.value.filter((member) => (
  status.value === 'all' || recipientStatus(member.id) === status.value
)))

async function loadSession() {
  loading.value = true
  try {
    const response = await fetch('/api/auth/session', { credentials: 'same-origin' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Sesi tidak dapat dibuka.')
    user.value = payload.user

    const statusesResponse = await fetch('/api/messages/recipients', { credentials: 'same-origin' })
    const statusesPayload = await statusesResponse.json()
    if (!statusesResponse.ok) throw new Error(statusesPayload.message || 'Status penerima belum dapat dimuat.')
    recipientStatuses.value = Object.fromEntries(
      statusesPayload.recipients.map((recipient: { memberId: number; status: MessageRecipientStatus }) => (
        [recipient.memberId, recipient.status]
      )),
    )

    const savedId = Number(window.sessionStorage.getItem('kkn-message-recipient'))
    const savedMember = members.find((member) => member.id === savedId && member.id !== user.value?.memberId)
    if (savedMember) {
      selected.value = savedMember
      confirmed.value = true
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Daftar anggota belum dapat dibuka.'
  } finally {
    loading.value = false
  }
}

function selectRecipient(member: Member) {
  selected.value = member
  confirmed.value = false
}

function confirmRecipient() {
  if (!selected.value) return
  confirmed.value = true
  window.sessionStorage.setItem('kkn-message-recipient', String(selected.value.id))
  showToast(`${selected.value.name} dipilih sebagai penerima pesan.`)
}

function clearSelection() {
  selected.value = null
  confirmed.value = false
  window.sessionStorage.removeItem('kkn-message-recipient')
}

function clearFilters() {
  search.value = ''
  division.value = 'all'
  status.value = 'all'
}

function writeMessage() {
  if (!selected.value || !confirmed.value) return
  window.location.assign('/dashboard/pesan/tulis')
}

function showToast(message: string) {
  toast.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = '' }, 3600)
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
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } finally {
    window.sessionStorage.removeItem('kkn-message-recipient')
    window.location.assign('/login')
  }
}

onMounted(loadSession)
onUnmounted(() => window.clearTimeout(toastTimer))
</script>

<template>
  <main v-if="loading" class="dash-gate">
    <span class="dash-gate__logo"><Waves :size="27" /></span>
    <div class="loading-ripple"><i /><i /><i /></div>
    <h1>Sedang memanggil<br /><em>nama-nama dari rumah…</em></h1>
    <p>Sebentar, daftar temanmu hampir sampai.</p>
  </main>

  <main v-else-if="error || !user" class="dash-gate dash-gate--error">
    <span class="dash-gate__logo"><LockKeyhole :size="25" /></span>
    <p class="dash-kicker">Ruang anggota privat</p>
    <h1>Kamu perlu masuk<br /><em>sebelum memilih penerima.</em></h1>
    <p>{{ error }}</p>
    <a href="/login">Masuk kembali</a>
  </main>

  <div v-else class="dash-shell recipient-page" :class="{ 'dash-shell--menu-open': menuOpen }">
    <DashboardSidebar :user="user" :portrait="portrait" active="surat" @navigate="navigate" @logout="logout" />
    <button class="dash-shell__scrim" aria-label="Tutup menu" @click="menuOpen = false" />

    <div class="dash-workspace">
      <DashboardTopbar :user="user" :portrait="portrait" @menu="menuOpen = true" />

      <main class="recipient-content">
        <button class="recipient-back" type="button" @click="navigate('surat')"><ArrowLeft :size="15" /> Kembali ke surat</button>

        <section class="recipient-hero">
          <div class="recipient-hero__copy">
            <p><Sparkles :size="14" /> Surat pribadi</p>
            <h1>Untuk siapa pesan ini<br /><em>ingin berlabuh?</em></h1>
            <span>Pilih satu orang dari lingkaran KKN-mu. Namamu sendiri tidak ditampilkan sebagai penerima.</span>
          </div>
          <div class="recipient-hero__people" aria-hidden="true">
            <span v-for="member in otherMembers.slice(0, 5)" :key="member.id"><img :src="member.portrait" alt="" /></span>
            <b><UsersRound :size="17" /> {{ otherMembers.length }} teman</b>
          </div>
          <svg viewBox="0 0 900 150" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 75 C140 12 285 135 455 72 S725 28 920 92"/><path d="M-40 112 C130 65 300 165 490 111 S760 78 930 128"/></svg>
        </section>

        <div class="recipient-privacy"><LockKeyhole :size="16" /><span><strong>Ruang yang aman dan privat.</strong> Hanya penerima yang dapat membuka isi pesan setelah dikirim.</span></div>

        <div class="recipient-layout">
          <section class="recipient-directory" aria-labelledby="recipient-title">
            <header class="recipient-directory__head">
              <div><p>Lingkaran MMD FILKOM 33</p><h2 id="recipient-title">Pilih satu nama.</h2></div>
              <span>{{ filteredMembers.length }} dari {{ otherMembers.length }} teman ditampilkan</span>
            </header>

            <MessageRecipientFilters
              :search="search"
              :division="division"
              :status="status"
              :divisions="divisions"
              :counts="statusCounts"
              :has-filters="hasFilters"
              @update:search="search = $event"
              @update:division="division = $event"
              @update:status="status = $event"
              @clear="clearFilters"
            />

            <div v-if="filteredMembers.length" class="recipient-grid">
              <MessageRecipientCard
                v-for="member in filteredMembers"
                :key="member.id"
                :member="member"
                :division="divisionFor(member.role)"
                :status="recipientStatus(member.id)"
                :selected="selected?.id === member.id"
                @select="selectRecipient"
              />
            </div>

            <div v-else class="recipient-empty">
              <span><SearchX :size="27" /></span>
              <h3>Tidak ada nama yang singgah di hasil ini.</h3>
              <p>Coba kata pencarian lain atau bersihkan filter yang sedang aktif.</p>
              <button type="button" @click="clearFilters">Tampilkan semua teman</button>
            </div>
          </section>

          <MessageRecipientSummary
            :member="selected"
            :status="selected ? recipientStatus(selected.id) : undefined"
            :confirmed="confirmed"
            @confirm="confirmRecipient"
            @clear="clearSelection"
            @continue="writeMessage"
          />
        </div>

        <footer class="recipient-footer"><Waves :size="18" /><span>Pesan yang tulus tidak perlu panjang—ia hanya perlu sampai pada orang yang tepat.</span></footer>
      </main>
    </div>

    <DashboardBottomNav active="surat" @navigate="navigate" />

    <Transition name="recipient-toast">
      <div v-if="toast" class="recipient-toast" role="status" aria-live="polite"><CheckCircle2 :size="18" /><span><strong>Penerima tersimpan</strong>{{ toast }}</span></div>
    </Transition>
  </div>
</template>
