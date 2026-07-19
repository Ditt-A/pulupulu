<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { ArrowRight, CalendarDays, ChevronRight, Heart, Image, LockKeyhole, MailOpen, MapPin, Send, Sparkles, Waves } from '@lucide/vue'
import DashboardBottomNav from '@/components/dashboard/DashboardBottomNav.vue'
import DashboardMemoryCard from '@/components/dashboard/DashboardMemoryCard.vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import DashboardTopbar from '@/components/dashboard/DashboardTopbar.vue'
import { members } from '@/data/members'
import type { AuthUser } from '@/types/auth'

const user = ref<AuthUser | null>(null)
const loading = ref(true)
const error = ref('')
const active = ref('beranda')
const menuOpen = ref(false)
const inboxCount = ref(0)
const inboxUnlocked = ref(false)

const currentMember = computed(() => members.find((member) => member.id === user.value?.memberId))
const portrait = computed(() => currentMember.value?.portrait || '/images/kkn-group-hero.png')
const firstName = computed(() => {
  const parts = user.value?.name.split(' ') || []
  return parts.find((part) => part.replace(/[^A-Za-zÀ-ÿ]/g, '').length > 2) || parts[0] || 'Teman'
})
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
})

const memories = [
  { image: '/images/kkn-group-hero.png', title: 'Tiga belas orang, satu rumah', date: '12 Juli 2026', location: 'Desa Sumbersih', caption: 'Hari pertama sebelum semua nama terasa begitu akrab.', shape: 'landscape' as const },
  { image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=88', title: 'Sore tanpa agenda', date: '16 Juli 2026', location: 'Teras Posko', caption: 'Cerita yang dimulai setelah semua pekerjaan selesai.', shape: 'portrait' as const },
  { image: '/images/kkn-coast-sunset.png', title: 'Senja terakhir', date: '8 Agustus 2026', location: 'Garis Pantai', caption: 'Laut yang sama, arah pulang yang berbeda.', shape: 'square' as const },
]

async function loadSession() {
  loading.value = true
  try {
    const response = await fetch('/api/auth/session', { credentials: 'same-origin' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Sesi tidak dapat dibuka.')
    if (payload.user.accountType === 'admin') {
      window.location.replace('/admin')
      return
    }
    user.value = payload.user

    const inboxResponse = await fetch('/api/messages/inbox', { credentials: 'same-origin' })
    if (inboxResponse.ok) {
      const inboxPayload = await inboxResponse.json()
      inboxCount.value = inboxPayload.messages?.length || 0
      inboxUnlocked.value = Boolean(inboxPayload.accessUnlocked)
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Ruang anggota belum dapat dibuka.'
  } finally {
    loading.value = false
  }

  if (user.value && window.location.hash) {
    await nextTick()
    document.querySelector(window.location.hash)?.scrollIntoView({ block: 'start' })
  }
}

function navigate(section: string) {
  if (section === 'profil') {
    window.location.assign('/dashboard/profil')
    return
  }
  if (section === 'tulis') {
    window.location.assign('/dashboard/pesan/baru')
    return
  }
  if (section === 'baca') {
    window.location.assign('/dashboard/surat')
    return
  }
  active.value = section
  menuOpen.value = false
  document.getElementById(`dash-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

onMounted(loadSession)
</script>

<template>
  <main v-if="loading" class="dash-gate">
    <span class="dash-gate__logo"><Waves :size="27" /></span>
    <div class="loading-ripple"><i /><i /><i /></div>
    <h1>Sedang membawa kenanganmu ke tepian…</h1>
    <p>Sebentar, ombaknya hampir sampai.</p>
  </main>

  <main v-else-if="error || !user" class="dash-gate dash-gate--error">
    <span class="dash-gate__logo"><LockKeyhole :size="25" /></span>
    <p class="dash-kicker">Ruang anggota privat</p>
    <h1>Sepertinya kamu belum<br /><em>masuk ke ruang ini.</em></h1>
    <p>{{ error }}</p>
    <a href="/login">Masuk kembali <ArrowRight :size="17" /></a>
  </main>

  <div v-else class="dash-shell" :class="{ 'dash-shell--menu-open': menuOpen }">
    <DashboardSidebar :user="user" :portrait="portrait" :active="active" @navigate="navigate" @logout="logout" />
    <button class="dash-shell__scrim" aria-label="Tutup menu" @click="menuOpen = false" />

    <div class="dash-workspace">
      <DashboardTopbar :user="user" :portrait="portrait" @menu="menuOpen = true" />

      <div class="dash-content">
        <section id="dash-beranda" class="dash-welcome">
          <img src="/images/kkn-group-hero.png" alt="" />
          <div class="dash-welcome__overlay" />
          <svg viewBox="0 0 900 170" preserveAspectRatio="none" aria-hidden="true"><path d="M-30 82 C140 18 275 142 460 75 S740 35 930 98"/><path d="M-40 125 C145 68 300 176 495 120 S770 82 940 137"/></svg>
          <div class="dash-welcome__copy">
            <p><Sparkles :size="14" /> Cerita hari ini</p>
            <h1>{{ greeting }},<br /><em>{{ firstName }}.</em></h1>
            <blockquote>“Ada kenangan yang tak memudar—ia hanya menunggu waktu yang tepat untuk kita buka kembali.”</blockquote>
            <span>{{ user.role }} · MMD FILKOM 33</span>
          </div>
          <div class="dash-welcome__keepsakes">
            <article><strong>30</strong><span>hari<br />bersama</span></article>
            <article><strong>1.248</strong><span>foto<br />tersimpan</span></article>
            <article><strong>{{ inboxCount }}</strong><span>surat<br />untukmu</span></article>
          </div>
        </section>

        <section id="dash-tulis" class="dash-section">
          <header class="dash-section__head"><div><p>Bisa ditulis kapan saja</p><h2>Tulis pesan untuk temanmu.</h2></div><button @click="writeMessage">Pilih penerima <ChevronRight :size="16" /></button></header>
          <article class="dash-write-teaser">
            <span><Send :size="25" /></span>
            <div><p>Ruang menulis selalu terbuka</p><h3>Tidak perlu menunggu inbox dibuka untuk menyampaikan sesuatu.</h3><small>Pilih satu dari dua belas temanmu, lalu simpan sebagai draf atau kirim ketika sudah siap.</small></div>
            <button type="button" @click="writeMessage">Mulai menulis <ArrowRight :size="16" /></button>
          </article>
        </section>

        <section id="dash-baca" class="dash-section">
          <header class="dash-section__head"><div><p>{{ inboxUnlocked ? 'Akses membaca terbuka' : 'Dikunci oleh pengelola' }}</p><h2>Baca pesan yang dikirim untukmu.</h2></div><button @click="navigate('baca')">Lihat inbox <ChevronRight :size="16" /></button></header>
          <article class="dash-letter-teaser">
            <div class="dash-letter-teaser__envelope"><span><MailOpen v-if="inboxUnlocked" :size="25" /><LockKeyhole v-else :size="25" /></span><i /><b /></div>
            <p>{{ inboxUnlocked ? 'Inbox sudah dapat dibuka' : `${inboxCount} surat masih tersegel` }}</p>
            <h3>{{ inboxUnlocked ? 'Cerita-cerita itu sudah siap kamu baca.' : 'Ada sesuatu yang belum sempat dikatakan.' }}</h3>
            <button @click="navigate('baca')">{{ inboxUnlocked ? 'Buka inbox' : 'Lihat surat tersegel' }} <ArrowRight :size="16" /></button>
          </article>
        </section>

        <section id="dash-album" class="dash-section">
          <header class="dash-section__head"><div><p>Dekat di ingatan</p><h2>Album yang ingin dibuka lagi.</h2></div><button>Lihat seluruh album <ChevronRight :size="16" /></button></header>
          <div class="dash-memory-grid">
            <DashboardMemoryCard v-for="memory in memories" :key="memory.title" v-bind="memory" />
          </div>
        </section>

        <section class="dash-day-card">
          <div class="dash-day-card__number"><span>Hari</span><strong>30</strong></div>
          <div class="dash-day-card__copy"><p>8 Agustus 2026 · Hari Perpisahan</p><h2>Hari ketika “sampai besok”<br /><em>tidak lagi bisa diucapkan.</em></h2><blockquote>Pelukan, lambaian, dan satu tatapan terakhir ke laut. Kami pulang membawa sesuatu yang tidak pernah muat di dalam koper.</blockquote><button>Baca cerita lengkap <ArrowRight :size="16" /></button></div>
          <figure><img src="/images/kkn-coast-sunset.png" alt="Senja terakhir di garis pantai" /><figcaption><MapPin :size="12" /> Desa Sumbersih</figcaption></figure>
        </section>

        <section id="dash-lingkaran" class="dash-section dash-circle">
          <header class="dash-section__head"><div><p>Orang-orang rumah</p><h2>Lingkaran kecil kita.</h2></div><span>13 anggota · selalu terhubung</span></header>
          <div class="dash-circle__members">
            <button v-for="member in members" :key="member.id" :class="{ current: member.id === user.memberId }"><span><img :src="member.portrait" :alt="member.name" /><i v-if="member.id === user.memberId"><Heart :size="11" /></i></span><strong>{{ member.name.split(' ')[0] }}</strong><small>{{ member.role }}</small></button>
          </div>
        </section>

        <section id="dash-profil" class="dash-profile-card">
          <div><img :src="portrait" :alt="user.name" /><span><p>Profil anggota</p><h2>{{ user.name }}</h2><small>{{ user.role }} · @{{ user.username }}</small></span></div>
          <div class="dash-profile-card__meta"><span><CalendarDays :size="15" /> Bergabung Juli 2026</span><span><Image :size="15" /> 97 foto bersamamu</span></div>
          <button @click="navigate('profil')">Buka profilmu <ArrowRight :size="16" /></button>
        </section>

        <footer class="dash-footer"><span><Waves :size="18" /> PULUPULU</span><p>Dibuat dengan rindu, untuk orang-orang yang pernah berbagi rumah.</p></footer>
      </div>
    </div>

    <DashboardBottomNav :active="active" @navigate="navigate" />
  </div>
</template>
