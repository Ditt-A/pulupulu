<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, MonitorCheck, PauseCircle, RefreshCw, Search, ShieldCheck, Sparkles, UserCheck, UsersRound, Waves } from '@lucide/vue'
import AdminBottomNav from '@/components/admin/AdminBottomNav.vue'
import AdminStatCard from '@/components/admin/AdminStatCard.vue'
import AdminTopbar from '@/components/admin/AdminTopbar.vue'
import ManagedMemberGrid from '@/components/admin/ManagedMemberGrid.vue'
import TemporaryPasswordModal from '@/components/admin/TemporaryPasswordModal.vue'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import { useAdminStore } from '@/stores/admin'
import type { ManagedMember, MemberDirectorySecurity, MemberDirectoryStatus } from '@/types/admin'

const admin = useAdminStore()
const state = admin.state
const directory = computed(() => state.memberDirectory)
const selectedMember = ref<ManagedMember | null>(null)
const pendingAction = ref<'reset' | 'status' | null>(null)
const confirmationOpen = ref(false)
const credentialOpen = ref(false)
const credential = ref({ memberName: '', username: '', password: '' })
const toast = ref({ show: false, title: '', message: '' })
let toastTimer = 0

const confirmationTitle = computed(() => {
  if (!selectedMember.value) return 'Konfirmasi tindakan'
  if (pendingAction.value === 'reset') return `Reset password ${selectedMember.value.name.split(' ')[0]}?`
  return selectedMember.value.isActive ? `Nonaktifkan akun ${selectedMember.value.name.split(' ')[0]}?` : `Aktifkan kembali akun ${selectedMember.value.name.split(' ')[0]}?`
})
const confirmationDescription = computed(() => {
  if (!selectedMember.value) return ''
  if (pendingAction.value === 'reset') return 'Password lama tidak lagi dapat digunakan dan seluruh sesi aktif akan dikeluarkan. Password sementara hanya ditampilkan sekali.'
  return selectedMember.value.isActive
    ? 'Anggota tidak dapat masuk, tetapi semua pesan, draf, dan profilnya tetap tersimpan.'
    : 'Anggota dapat masuk kembali menggunakan password terakhir yang tersimpan.'
})

function requestReset(member: ManagedMember) { selectedMember.value = member; pendingAction.value = 'reset'; confirmationOpen.value = true }
function requestStatus(member: ManagedMember) { selectedMember.value = member; pendingAction.value = 'status'; confirmationOpen.value = true }
function showSuccess(title: string, message: string) { toast.value = { show: true, title, message }; window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toast.value.show = false }, 4500) }

async function confirmAction() {
  const member = selectedMember.value
  if (!member || !pendingAction.value) return
  try {
    if (pendingAction.value === 'reset') {
      const result = await admin.resetManagedMemberPassword(member.memberId)
      confirmationOpen.value = false
      credential.value = { memberName: member.name, username: member.username, password: result.temporaryPassword }
      credentialOpen.value = true
    } else {
      const nextActive = !member.isActive
      await admin.updateManagedMemberStatus(member.memberId, nextActive)
      confirmationOpen.value = false
      showSuccess(nextActive ? 'Akun berhasil diaktifkan' : 'Akun berhasil dinonaktifkan', nextActive ? `${member.name} dapat masuk kembali.` : `Akses masuk ${member.name} sudah ditutup.`)
    }
  } catch { confirmationOpen.value = false }
}

function navigate(section: string) {
  state.menuOpen = false
  if (section === 'anggota') return
  if (section === 'monitoring') return window.location.assign('/admin/monitoring-pesan')
  if (section === 'akses') return window.location.assign('/admin/akses-pesan')
  window.location.assign(section === 'ringkasan' ? '/admin' : `/admin#admin-${section}`)
}
async function logout() { try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }) } finally { admin.reset(); window.location.assign('/login') } }

onMounted(admin.initializeMemberDirectory)
onBeforeUnmount(() => window.clearTimeout(toastTimer))
</script>

<template>
  <main v-if="state.loading" class="admin-gate"><span><UsersRound :size="27" /></span><div class="loading-ripple"><i /><i /><i /></div><p>Direktori anggota</p><h1>Sedang merapikan<br /><em>tiga belas nama…</em></h1><small>Status akun sedang diambil dari database.</small></main>
  <main v-else-if="state.error && !directory" class="admin-gate admin-gate--error"><span><LockKeyhole :size="25" /></span><p>Akses terbatas</p><h1>Daftar anggota belum<br /><em>dapat dibuka.</em></h1><small>{{ state.error }}</small><a :href="state.access === 'member' ? '/dashboard' : '/login'">{{ state.access === 'member' ? 'Kembali ke ruang anggota' : 'Masuk sebagai admin' }} <ArrowRight :size="16" /></a></main>

  <div v-else-if="state.user && directory" class="admin-shell members-page" :class="{ 'admin-shell--menu-open': state.menuOpen }">
    <AdminSidebar :user="state.user" active="anggota" @navigate="navigate" @close="state.menuOpen = false" @logout="logout" /><button class="admin-shell__scrim" aria-label="Tutup menu" @click="state.menuOpen = false" />
    <div class="admin-workspace"><AdminTopbar :user="state.user" :refreshing="state.directoryLoading" :generated-at="directory.generatedAt" @menu="state.menuOpen = true" @refresh="admin.loadMemberDirectory" />
      <main class="members-content"><a class="access-back" href="/admin"><ArrowLeft :size="15" /> Kembali ke ringkasan</a>
        <section class="members-hero"><img src="/images/kkn-group-hero.png" alt="Tiga belas anggota KKN PULUPULU" /><div class="members-hero__overlay" /><svg viewBox="0 0 940 190" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 91 C140 24 295 152 470 84 S760 39 960 110"/><path d="M-30 138 C145 82 315 184 500 130 S785 91 970 150"/></svg><div><p><Sparkles :size="13" /> Pengelolaan akun anggota</p><h1>Tiga belas nama,<br /><em>satu lingkaran.</em></h1><span>Jaga akses setiap anggota tanpa menghapus cerita, pesan, atau jejak perjalanan mereka.</span></div><aside><UsersRound :size="24" /><span><small>Total anggota</small><strong>{{ directory.summary.total }}</strong><i />{{ directory.summary.active }} aktif · {{ directory.summary.inactive }} nonaktif</span></aside></section>

        <section class="admin-stat-grid members-stat-grid"><AdminStatCard label="Akun aktif" :value="directory.summary.active" :icon="UserCheck" tone="teal" note="dapat masuk ke ruang anggota" /><AdminStatCard label="Akun nonaktif" :value="directory.summary.inactive" :icon="PauseCircle" tone="sand" note="data tetap tersimpan" /><AdminStatCard label="Password awal" :value="directory.summary.initialPassword" :icon="KeyRound" tone="blue" note="wajib diganti setelah masuk" /><AdminStatCard label="Sesi aktif" :value="directory.summary.activeSessions" :icon="MonitorCheck" tone="navy" note="di seluruh perangkat anggota" /></section>

        <section class="members-directory-card"><header><div><p>Semua akun anggota</p><h2>Direktori MMD FILKOM 33</h2></div><span>{{ admin.managedMembers.value.length }} dari {{ directory.summary.total }} anggota</span></header><div class="members-directory-toolbar"><label><Search :size="15" /><input :value="state.directoryQuery" aria-label="Cari anggota" placeholder="Cari nama, username, atau peran…" @input="admin.setDirectoryQuery(($event.target as HTMLInputElement).value)" /></label><select :value="state.directoryStatus" aria-label="Filter status akun" @change="admin.setDirectoryStatus(($event.target as HTMLSelectElement).value as MemberDirectoryStatus)"><option value="all">Semua status</option><option value="active">Akun aktif</option><option value="inactive">Nonaktif</option></select><select :value="state.directorySecurity" aria-label="Filter keamanan" @change="admin.setDirectorySecurity(($event.target as HTMLSelectElement).value as MemberDirectorySecurity)"><option value="all">Semua keamanan</option><option value="initial">Password awal</option><option value="secured">Terlindungi</option></select><button :disabled="state.directoryLoading" @click="admin.loadMemberDirectory"><RefreshCw :class="{ spinning: state.directoryLoading }" :size="14" /> Segarkan</button></div>
          <div v-if="state.directoryError" class="access-error" role="alert"><ShieldCheck :size="17" /><span><strong>Tindakan belum berhasil.</strong>{{ state.directoryError }}</span><button @click="state.directoryError = ''">Tutup</button></div>
          <ManagedMemberGrid :members="admin.managedMembers.value" :action-id="state.memberActionId" @reset="requestReset" @status="requestStatus" />
          <footer><ShieldCheck :size="15" /> Menonaktifkan akun tidak menghapus profil, pesan, atau draf anggota.</footer></section>
        <footer class="admin-footer"><span><Waves :size="18" /> PULUPULU · DIREKTORI ANGGOTA</span><p>Akses dapat berubah; tempat mereka di dalam cerita tetap sama.</p></footer>
      </main>
    </div><AdminBottomNav active="anggota" @navigate="navigate" />
    <ConfirmationModal :open="confirmationOpen" :tone="pendingAction === 'status' && !selectedMember?.isActive ? 'unlock' : 'lock'" eyebrow="Konfirmasi pengelolaan akun" :title="confirmationTitle" :description="confirmationDescription" :confirm-label="pendingAction === 'reset' ? 'Ya, reset password' : selectedMember?.isActive ? 'Ya, nonaktifkan' : 'Ya, aktifkan'" cancel-label="Batalkan" :loading="state.memberActionId === selectedMember?.memberId" @close="confirmationOpen = false" @confirm="confirmAction" />
    <TemporaryPasswordModal :open="credentialOpen" :member-name="credential.memberName" :username="credential.username" :password="credential.password" @close="credentialOpen = false" />
    <ToastNotification :show="toast.show" :title="toast.title" :message="toast.message" @close="toast.show = false" />
  </div>
</template>
