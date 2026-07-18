<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, ArrowRight, Check, Clock3, KeyRound, LockKeyhole, Mail, ShieldCheck, Sparkles, Unlock, UserCheck, UsersRound, Waves } from '@lucide/vue'
import AdminBottomNav from '@/components/admin/AdminBottomNav.vue'
import AdminTopbar from '@/components/admin/AdminTopbar.vue'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import { useAdminStore } from '@/stores/admin'

const admin = useAdminStore()
const state = admin.state
const modalOpen = ref(false)
const pendingUnlocked = ref(false)
const showToast = ref(false)
let toastTimer = 0

const access = computed(() => state.messageAccess)
const firstName = computed(() => state.user?.name.split(' ').find((part) => part.length > 3) || 'Pengelola')
const topbarTimestamp = computed(() => access.value?.updatedAt ? `${access.value.updatedAt.replace(' ', 'T')}Z` : undefined)
const formattedUpdatedAt = computed(() => {
  if (!access.value?.updatedAt) return 'Belum pernah diubah'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(`${access.value.updatedAt.replace(' ', 'T')}Z`))
})
const plannedDate = computed(() => access.value?.plannedReleaseAt
  ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(access.value.plannedReleaseAt))
  : '8 Agustus 2026, 19.00')
const modalTitle = computed(() => pendingUnlocked.value ? 'Buka seluruh surat sekarang?' : 'Kunci kembali seluruh surat?')
const modalDescription = computed(() => pendingUnlocked.value
  ? `Semua anggota akan segera dapat membaca surat yang sudah diterima. Tindakan ini berdampak pada ${access.value?.impact.recipientsWithMessages || 0} penerima.`
  : 'Akses membaca akan ditutup untuk seluruh anggota. Surat tetap tersimpan aman dan dapat dibuka kembali nanti.')

function requestToggle() {
  if (!access.value || state.accessUpdating) return
  state.accessError = ''
  pendingUnlocked.value = !access.value.unlocked
  modalOpen.value = true
}

async function confirmToggle() {
  try {
    await admin.updateMessageAccess(pendingUnlocked.value)
    modalOpen.value = false
    showToast.value = true
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => { showToast.value = false }, 4500)
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
          <div class="access-hero__copy"><p><Sparkles :size="13" /> Kendali akses global</p><h1>Satu tombol untuk<br /><em>{{ access.unlocked ? 'menjaga semua surat.' : 'membuka semua cerita.' }}</em></h1><span>Perubahan di halaman ini berlaku untuk seluruh inbox anggota MMD FILKOM 33.</span></div>
          <div class="access-hero__status"><span :class="{ open: access.unlocked }"><Unlock v-if="access.unlocked" :size="22" /><LockKeyhole v-else :size="22" /></span><small>Status saat ini</small><strong>{{ access.unlocked ? 'Akses terbuka' : 'Akses terkunci' }}</strong><i /><p>{{ access.unlocked ? 'Anggota dapat membaca surat yang sudah diterima.' : 'Isi surat masih tersegel untuk seluruh anggota.' }}</p></div>
        </section>

        <div v-if="state.accessError" class="access-error" role="alert"><ShieldCheck :size="17" /><span><strong>Perubahan belum tersimpan.</strong>{{ state.accessError }}</span><button @click="state.accessError = ''">Tutup</button></div>

        <section class="access-control-grid">
          <article class="access-switch-card">
            <header><div><p>Sakelar utama</p><h2>Akses membaca pesan</h2></div><span :class="{ open: access.unlocked }">{{ access.unlocked ? 'Terbuka' : 'Terkunci' }}</span></header>
            <div class="access-switch-card__control">
              <button type="button" role="switch" :aria-checked="access.unlocked" :aria-label="access.unlocked ? 'Kunci seluruh pesan' : 'Buka seluruh pesan'" :disabled="state.accessUpdating" :class="{ open: access.unlocked }" @click="requestToggle"><i><Unlock v-if="access.unlocked" :size="21" /><LockKeyhole v-else :size="21" /></i></button>
              <div><strong>{{ access.unlocked ? 'Semua inbox sedang terbuka' : 'Semua inbox masih terkunci' }}</strong><p>{{ access.unlocked ? 'Tekan sakelar untuk meminta konfirmasi penguncian.' : 'Tekan sakelar untuk meminta konfirmasi pembukaan.' }}</p></div>
            </div>
            <aside><ShieldCheck :size="16" /><p><strong>Tidak ada perubahan diam-diam.</strong>Sakelar baru berubah setelah konfirmasi dan respons server berhasil.</p></aside>
          </article>

          <article class="access-impact-card">
            <header><p>Dampak perubahan</p><h2>Yang akan terpengaruh</h2></header>
            <div><span><Mail :size="17" /><small>Surat terkirim</small><strong>{{ access.impact.sentMessages }}</strong></span><span><UsersRound :size="17" /><small>Penerima surat</small><strong>{{ access.impact.recipientsWithMessages }}/{{ access.impact.totalMembers }}</strong></span><span><KeyRound :size="17" /><small>Belum dibaca</small><strong>{{ access.impact.unreadMessages }}</strong></span></div>
            <footer><Clock3 :size="15" /><span><small>Rencana malam perpisahan</small><strong>{{ plannedDate }} WIB</strong></span></footer>
          </article>
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
    <ConfirmationModal :open="modalOpen" :tone="pendingUnlocked ? 'unlock' : 'lock'" eyebrow="Konfirmasi akses global" :title="modalTitle" :description="modalDescription" :confirm-label="pendingUnlocked ? 'Ya, buka akses' : 'Ya, kunci akses'" cancel-label="Batalkan" :loading="state.accessUpdating" @close="modalOpen = false" @confirm="confirmToggle" />
    <ToastNotification :show="showToast" :title="access.unlocked ? 'Seluruh akses berhasil dibuka' : 'Seluruh akses berhasil dikunci'" :message="access.unlocked ? 'Anggota kini dapat membaca surat privatnya.' : 'Surat tetap tersimpan aman di balik segel.'" @close="showToast = false" />
  </div>
</template>
