<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, CalendarClock, Check, Clock3, KeyRound, LockKeyhole, Mail, ShieldCheck, Sparkles, Unlock, UserCheck, UsersRound, Waves } from '@lucide/vue'
import AdminBottomNav from '@/components/admin/AdminBottomNav.vue'
import AdminTopbar from '@/components/admin/AdminTopbar.vue'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import { useAdminStore } from '@/stores/admin'

const admin = useAdminStore()
const state = admin.state
const modalOpen = ref(false)
const pendingAction = ref<'toggle' | 'schedule'>('toggle')
const pendingUnlocked = ref(false)
const showToast = ref(false)
const toastTitle = ref('')
const toastMessage = ref('')
const scheduleInput = ref('')
let toastTimer = 0

const access = computed(() => state.messageAccess)
const firstName = computed(() => state.user?.name.split(' ').find((part) => part.length > 3) || 'Pengelola')
const topbarTimestamp = computed(() => access.value?.updatedAt ? `${access.value.updatedAt.replace(' ', 'T')}Z` : undefined)
const formattedUpdatedAt = computed(() => {
  if (!access.value?.updatedAt) return 'Belum pernah diubah'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(`${access.value.updatedAt.replace(' ', 'T')}Z`))
})
const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' })
const plannedDate = computed(() => access.value?.plannedReleaseAt ? dateFormatter.format(new Date(access.value.plannedReleaseAt)) : 'Belum ditentukan')
const pendingReleaseAt = computed(() => scheduleInput.value ? `${scheduleInput.value}:00+07:00` : '')
const scheduleIsValid = computed(() => {
  const timestamp = Date.parse(pendingReleaseAt.value)
  return Number.isFinite(timestamp) && timestamp > Date.now() + 60_000
})
const minimumSchedule = computed(() => toJakartaInput(new Date(Date.now() + 120_000).toISOString()))
const accessStatusLabel = computed(() => {
  if (access.value?.mode === 'scheduled') return access.value.unlocked ? 'Jadwal tercapai' : 'Terjadwal'
  return access.value?.unlocked ? 'Akses terbuka' : 'Akses terkunci'
})
const modalTitle = computed(() => {
  if (pendingAction.value === 'schedule') return 'Simpan jadwal pembukaan?'
  return pendingUnlocked.value ? 'Buka seluruh surat sekarang?' : 'Kunci kembali seluruh surat?'
})
const modalDescription = computed(() => {
  if (pendingAction.value === 'schedule') return `Seluruh inbox akan tetap tersegel lalu terbuka otomatis pada ${dateFormatter.format(new Date(pendingReleaseAt.value))} WIB.`
  return pendingUnlocked.value
    ? `Semua anggota akan segera dapat membaca surat yang sudah diterima. Tindakan ini berdampak pada ${access.value?.impact.recipientsWithMessages || 0} penerima.`
    : 'Akses membaca akan ditutup untuk seluruh anggota. Surat tetap tersimpan aman dan dapat dibuka kembali nanti.'
})
const modalConfirmLabel = computed(() => pendingAction.value === 'schedule'
  ? 'Ya, simpan jadwal'
  : pendingUnlocked.value ? 'Ya, buka akses' : 'Ya, kunci akses')

function toJakartaInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}

function showSuccess(title: string, message: string) {
  toastTitle.value = title
  toastMessage.value = message
  showToast.value = true
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { showToast.value = false }, 4500)
}

function requestToggle() {
  if (!access.value || state.accessUpdating) return
  state.accessError = ''
  pendingAction.value = 'toggle'
  pendingUnlocked.value = !access.value.unlocked
  modalOpen.value = true
}

function requestForceLock() {
  if (!access.value || state.accessUpdating) return
  state.accessError = ''
  pendingAction.value = 'toggle'
  pendingUnlocked.value = false
  modalOpen.value = true
}

function requestSchedule() {
  state.accessError = ''
  if (!scheduleIsValid.value) {
    state.accessError = 'Pilih waktu pembukaan setidaknya satu menit dari sekarang.'
    return
  }
  pendingAction.value = 'schedule'
  modalOpen.value = true
}

async function confirmChange() {
  try {
    if (pendingAction.value === 'schedule') {
      await admin.scheduleMessageAccess(pendingReleaseAt.value)
      showSuccess('Jadwal pembukaan tersimpan', `Inbox akan terbuka otomatis pada ${plannedDate.value} WIB.`)
    } else {
      await admin.updateMessageAccess(pendingUnlocked.value)
      showSuccess(
        pendingUnlocked.value ? 'Seluruh akses berhasil dibuka' : 'Seluruh akses berhasil dikunci',
        pendingUnlocked.value ? 'Anggota kini dapat membaca surat privatnya.' : 'Surat tetap tersimpan aman di balik segel.',
      )
    }
    modalOpen.value = false
  } catch {
    modalOpen.value = false
  }
}

function navigate(section: string) {
  state.menuOpen = false
  if (section === 'akses') return
  if (section === 'anggota') return window.location.assign('/admin/anggota')
  if (section === 'monitoring') return window.location.assign('/admin/monitoring-pesan')
  const target = section === 'ringkasan' ? '/admin' : `/admin#admin-${section}`
  window.location.assign(target)
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } finally {
    admin.reset()
    window.location.assign('/login')
  }
}

watch(() => access.value?.plannedReleaseAt, (value) => {
  if (value) scheduleInput.value = toJakartaInput(value)
}, { immediate: true })

onMounted(admin.initializeMessageAccess)
onBeforeUnmount(() => window.clearTimeout(toastTimer))
</script>

<template>
  <main v-if="state.loading" class="admin-gate">
    <span><LockKeyhole :size="27" /></span><div class="loading-ripple"><i /><i /><i /></div>
    <p>Kendali akses global</p><h1>Sedang memeriksa<br /><em>segel seluruh surat…</em></h1><small>Status terakhir sedang diambil dari database.</small>
  </main>

  <main v-else-if="state.error && !access" class="admin-gate admin-gate--error">
    <span><LockKeyhole :size="25" /></span><p>Akses terbatas</p><h1>Pengaturan belum<br /><em>dapat dibuka.</em></h1><small>{{ state.error }}</small>
    <a :href="state.access === 'member' ? '/dashboard' : '/login'">{{ state.access === 'member' ? 'Kembali ke ruang anggota' : 'Masuk sebagai admin' }} <ArrowRight :size="16" /></a>
  </main>

  <div v-else-if="state.user && access" class="admin-shell access-page" :class="{ 'admin-shell--menu-open': state.menuOpen }">
    <AdminSidebar :user="state.user" active="akses" @navigate="navigate" @close="state.menuOpen = false" @logout="logout" />
    <button class="admin-shell__scrim" aria-label="Tutup menu" @click="state.menuOpen = false" />

    <div class="admin-workspace">
      <AdminTopbar :user="state.user" :refreshing="state.accessLoading" :generated-at="topbarTimestamp" @menu="state.menuOpen = true" @refresh="admin.loadMessageAccess" />
      <main class="access-content">
        <a class="access-back" href="/admin"><ArrowLeft :size="15" /> Kembali ke ringkasan</a>

        <section class="access-hero" :class="{ 'access-hero--open': access.unlocked }">
          <img src="/images/kkn-coast-sunset.png" alt="Garis pantai tenang saat senja" /><div class="access-hero__overlay" />
          <svg viewBox="0 0 940 190" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 91 C140 24 295 152 470 84 S760 39 960 110"/><path d="M-30 138 C145 82 315 184 500 130 S785 91 970 150"/></svg>
          <div class="access-hero__copy"><p><Sparkles :size="13" /> Kendali akses global</p><h1>Atur momen untuk<br /><em>{{ access.unlocked ? 'menjaga semua surat.' : 'membuka semua cerita.' }}</em></h1><span>Perubahan di halaman ini berlaku untuk seluruh inbox anggota MMD FILKOM 33.</span></div>
          <div class="access-hero__status"><span :class="{ open: access.unlocked }"><Unlock v-if="access.unlocked" :size="22" /><LockKeyhole v-else :size="22" /></span><small>Status saat ini</small><strong>{{ accessStatusLabel }}</strong><i /><p>{{ access.mode === 'scheduled' && !access.unlocked ? `Terbuka otomatis ${plannedDate} WIB.` : access.unlocked ? 'Anggota dapat membaca surat yang sudah diterima.' : 'Isi surat masih tersegel untuk seluruh anggota.' }}</p></div>
        </section>

        <div v-if="state.accessError" class="access-error" role="alert"><ShieldCheck :size="17" /><span><strong>Perubahan belum tersimpan.</strong>{{ state.accessError }}</span><button @click="state.accessError = ''">Tutup</button></div>

        <section class="access-control-grid">
          <article class="access-switch-card">
            <header><div><p>Sakelar utama</p><h2>Akses membaca pesan</h2></div><span :class="{ open: access.unlocked }">{{ access.mode === 'scheduled' ? 'Terjadwal' : access.unlocked ? 'Terbuka' : 'Terkunci' }}</span></header>
            <div class="access-switch-card__control">
              <button type="button" role="switch" :aria-checked="access.unlocked" :aria-label="access.unlocked ? 'Kunci seluruh pesan' : 'Buka seluruh pesan'" :disabled="state.accessUpdating" :class="{ open: access.unlocked }" @click="requestToggle"><i><Unlock v-if="access.unlocked" :size="21" /><LockKeyhole v-else :size="21" /></i></button>
              <div><strong>{{ access.mode === 'scheduled' && !access.unlocked ? 'Semua inbox menunggu jadwal' : access.unlocked ? 'Semua inbox sedang terbuka' : 'Semua inbox masih terkunci' }}</strong><p>{{ access.mode === 'scheduled' && !access.unlocked ? 'Tekan sakelar untuk membuka sekarang, atau batalkan timer di bawah agar tetap terkunci.' : access.unlocked ? 'Tekan sakelar untuk meminta konfirmasi penguncian.' : 'Tekan sakelar untuk meminta konfirmasi pembukaan.' }}</p></div>
            </div>
            <aside><ShieldCheck :size="16" /><p><strong>Tidak ada perubahan diam-diam.</strong>Sakelar baru berubah setelah konfirmasi dan respons server berhasil.</p></aside>
          </article>

          <article class="access-impact-card">
            <header><p>Dampak perubahan</p><h2>Yang akan terpengaruh</h2></header>
            <div><span><Mail :size="17" /><small>Surat terkirim</small><strong>{{ access.impact.sentMessages }}</strong></span><span><UsersRound :size="17" /><small>Penerima surat</small><strong>{{ access.impact.recipientsWithMessages }}/{{ access.impact.totalMembers }}</strong></span><span><KeyRound :size="17" /><small>Belum dibaca</small><strong>{{ access.impact.unreadMessages }}</strong></span></div>
            <footer><Clock3 :size="15" /><span><small>Rencana malam perpisahan</small><strong>{{ plannedDate }} WIB</strong></span></footer>
          </article>
        </section>

        <section class="access-schedule-card">
          <div class="access-schedule-card__intro">
            <span><CalendarClock :size="22" /></span>
            <div><p>Timer pembukaan</p><h2>Tentukan waktu semua surat berlabuh</h2><small>Jadwal memakai zona waktu WIB dan tersimpan di database. Saat waktunya tiba, inbox anggota terbuka otomatis tanpa tindakan tambahan.</small></div>
          </div>
          <form @submit.prevent="requestSchedule">
            <label for="message-release-at">Tanggal dan waktu pembukaan <small>WIB</small></label>
            <div><input id="message-release-at" v-model="scheduleInput" type="datetime-local" :min="minimumSchedule" required /><button type="submit" :disabled="state.accessUpdating || !scheduleIsValid"><CalendarClock :size="16" /> Jadwalkan pembukaan</button></div>
            <p><Clock3 :size="14" /><span><strong>{{ access.mode === 'scheduled' ? 'Jadwal otomatis aktif' : 'Jadwal tersimpan' }}</strong>{{ plannedDate }} WIB</span><button v-if="access.mode === 'scheduled' && !access.unlocked" class="access-schedule-card__cancel" type="button" :disabled="state.accessUpdating" @click="requestForceLock">Batalkan timer</button></p>
          </form>
        </section>

        <section class="access-explanation-grid">
          <article class="access-when-card">
            <p>{{ access.unlocked ? 'Saat akses dikunci kembali' : 'Saat akses dibuka' }}</p><h2>{{ access.unlocked ? 'Cerita berhenti di depan segel.' : 'Setiap surat berlabuh ke pemiliknya.' }}</h2>
            <ul v-if="!access.unlocked"><li><Check :size="14" /> Anggota dapat membuka inbox privat.</li><li><Check :size="14" /> Status baca dan belum dibaca mulai dicatat.</li><li><Check :size="14" /> Surat tetap hanya terlihat oleh penerimanya.</li></ul>
            <ul v-else><li><LockKeyhole :size="14" /> Halaman membaca kembali ditutup.</li><li><LockKeyhole :size="14" /> Isi dan status surat tetap tersimpan.</li><li><LockKeyhole :size="14" /> Admin dapat membukanya lagi kapan saja.</li></ul>
          </article>
          <article class="access-audit-card"><span><UserCheck :size="20" /></span><div><p>Perubahan terakhir</p><h2>{{ formattedUpdatedAt }}</h2><small>oleh {{ access.updatedBy }}</small></div><Waves :size="30" /></article>
        </section>

        <aside class="access-privacy-note"><ShieldCheck :size="19" /><span><strong>Kendali akses tidak memberi admin hak membaca pesan.</strong> Isi surat tetap hanya tersedia bagi anggota penerima setelah akses global dibuka.</span></aside>
        <footer class="admin-footer"><span><Waves :size="18" /> PULUPULU · KENDALI AKSES</span><p>Beberapa cerita menjadi lebih berarti ketika dibuka pada waktu yang tepat.</p></footer>
      </main>
    </div>

    <AdminBottomNav active="akses" @navigate="navigate" />
    <ConfirmationModal :open="modalOpen" :tone="pendingAction === 'schedule' || pendingUnlocked ? 'unlock' : 'lock'" :eyebrow="pendingAction === 'schedule' ? 'Konfirmasi timer pembukaan' : 'Konfirmasi akses global'" :title="modalTitle" :description="modalDescription" :confirm-label="modalConfirmLabel" cancel-label="Batalkan" :loading="state.accessUpdating" @close="modalOpen = false" @confirm="confirmChange" />
    <ToastNotification :show="showToast" :title="toastTitle" :message="toastMessage" @close="showToast = false" />
  </div>
</template>

<style scoped>
.access-schedule-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, .8fr);
  gap: 28px;
  align-items: center;
  margin-top: 15px;
  padding: 24px 25px;
  border: 1px solid rgba(10, 86, 101, .09);
  border-radius: 20px;
  background: rgba(255, 255, 255, .72);
  box-shadow: 0 15px 38px rgba(23, 70, 78, .045);
}

.access-schedule-card__intro {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: start;
}

.access-schedule-card__intro > span {
  width: 47px;
  height: 47px;
  display: grid;
  place-items: center;
  color: #287f86;
  border-radius: 14px;
  background: #dfeeea;
}

.access-schedule-card__intro p {
  margin: 0 0 4px;
  color: #3d9896;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .13em;
  text-transform: uppercase;
}

.access-schedule-card__intro h2 {
  margin: 0;
  color: var(--ocean-900);
  font-family: 'Italiana';
  font-size: 25px;
  font-weight: 400;
}

.access-schedule-card__intro small {
  display: block;
  max-width: 610px;
  margin-top: 6px;
  color: #819497;
  font-size: 14px;
  line-height: 1.6;
}

.access-schedule-card form {
  padding: 15px;
  border: 1px solid rgba(10, 86, 101, .08);
  border-radius: 15px;
  background: #eff6f3;
}

.access-schedule-card label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #52747a;
  font-size: 14px;
  font-weight: 700;
}

.access-schedule-card label small { color: #3b9693; }
.access-schedule-card form > div { display: flex; gap: 8px; }

.access-schedule-card input {
  min-width: 0;
  flex: 1;
  padding: 0 12px;
  color: #315e67;
  border: 1px solid rgba(10, 86, 101, .13);
  border-radius: 10px;
  outline: none;
  background: white;
  font: 600 15px 'DM Sans', sans-serif;
}

.access-schedule-card input:focus {
  border-color: #3b9693;
  box-shadow: 0 0 0 3px rgba(59, 150, 147, .1);
}

.access-schedule-card button {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  color: white;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, #176f7b, #339894);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 8px 18px rgba(22, 111, 123, .14);
}

.access-schedule-card button:disabled { opacity: .5; cursor: not-allowed; }
.access-schedule-card form > p { display: flex; align-items: flex-start; gap: 7px; margin: 10px 1px 0; color: #749095; }
.access-schedule-card form > p svg { flex: 0 0 auto; margin-top: 2px; color: #3d9896; }
.access-schedule-card form > p span { display: flex; flex-direction: column; font-size: 14px; line-height: 1.5; }
.access-schedule-card form > p strong { color: #467078; font-size: 14px; }
.access-schedule-card .access-schedule-card__cancel {
  min-height: auto;
  margin-left: auto;
  padding: 3px 0;
  color: #8c6038;
  border-radius: 0;
  background: transparent;
  font-size: 14px;
  box-shadow: none;
}

@media (max-width: 900px) {
  .access-schedule-card { grid-template-columns: 1fr; }
}

@media (max-width: 560px) {
  .access-schedule-card { padding: 21px 18px; }
  .access-schedule-card form > div { flex-direction: column; }
  .access-schedule-card input { min-height: 42px; }
}
</style>
