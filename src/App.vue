<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { ArrowDown, CalendarDays, Camera, ChevronRight, MapPin, Quote, Sparkles, UsersRound, Waves } from '@lucide/vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'
import GalleryCard from '@/components/cards/GalleryCard.vue'
import MemberCard from '@/components/cards/MemberCard.vue'
import TimelineItem from '@/components/cards/TimelineItem.vue'
import AppButton from '@/components/ui/AppButton.vue'
import LoginPage from '@/views/LoginPage.vue'
import MemberDashboard from '@/views/MemberDashboard.vue'
import MessageRecipientPage from '@/views/MessageRecipientPage.vue'
import MessageComposerPage from '@/views/MessageComposerPage.vue'
import PrivateInboxLockedPage from '@/views/PrivateInboxLockedPage.vue'
import PrivateInboxOpenPage from '@/views/PrivateInboxOpenPage.vue'
import PrivateMessageReaderPage from '@/views/PrivateMessageReaderPage.vue'
import MemberProfilePage from '@/views/MemberProfilePage.vue'
import AdminDashboard from '@/views/AdminDashboard.vue'
import AdminMessageAccessPage from '@/views/AdminMessageAccessPage.vue'
import AdminMessageMonitoringPage from '@/views/AdminMessageMonitoringPage.vue'
import AdminMembersPage from '@/views/AdminMembersPage.vue'
import { members } from '@/data/members'

const isLoginPage = window.location.pathname.replace(/\/$/, '') === '/login'
const isDashboardPage = window.location.pathname.replace(/\/$/, '') === '/dashboard'
const isRecipientPage = window.location.pathname.replace(/\/$/, '') === '/dashboard/pesan/baru'
const isComposerPage = window.location.pathname.replace(/\/$/, '') === '/dashboard/pesan/tulis'
const isInboxPage = window.location.pathname.replace(/\/$/, '') === '/dashboard/surat'
const isOpenInboxPage = window.location.pathname.replace(/\/$/, '') === '/dashboard/surat/terbuka'
const isProfilePage = window.location.pathname.replace(/\/$/, '') === '/dashboard/profil'
const isAdminPage = window.location.pathname.replace(/\/$/, '') === '/admin'
const isAdminAccessPage = window.location.pathname.replace(/\/$/, '') === '/admin/akses-pesan'
const isAdminMonitoringPage = window.location.pathname.replace(/\/$/, '') === '/admin/monitoring-pesan'
const isAdminMembersPage = window.location.pathname.replace(/\/$/, '') === '/admin/anggota'
const messageReaderMatch = window.location.pathname.replace(/\/$/, '').match(/^\/dashboard\/surat\/(\d+)$/)
const isMessageReaderPage = Boolean(messageReaderMatch)
const messageReaderId = Number(messageReaderMatch?.[1] || 0)
let revealObserver: IntersectionObserver | undefined
let animationFrame = 0

const gallery = [
  { image: '/images/kkn-group-hero.png', title: 'Satu bingkai, tiga belas cerita', date: '12 Juli 2026', location: 'Pantai Pesisir Harapan', caption: 'Potret pertama sebelum kami benar-benar saling mengenal.', count: 13, size: 'wide' as const },
  { image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=88', title: 'Teman yang perlahan jadi rumah', date: '16 Juli 2026', location: 'Posko KKN', caption: 'Tidak ada agenda. Hanya sore, cerita, dan tawa yang panjang.', count: 18, size: 'tall' as const },
  { image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1000&q=88', title: 'Hari ketika semua ikut turun tangan', date: '22 Juli 2026', location: 'Balai Desa', caption: 'Pekerjaan besar terasa ringan ketika dilakukan bersama.', count: 24, size: 'normal' as const },
  { image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1000&q=88', title: 'Mengabdi, juga belajar', date: '27 Juli 2026', location: 'Dusun Bahari', caption: 'Desa ini memberi kami jauh lebih banyak dari yang kami bawa.', count: 31, size: 'polaroid' as const },
  { image: 'https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?auto=format&fit=crop&w=1000&q=88', title: 'Jeda di antara kesibukan', date: '31 Juli 2026', location: 'Teras Posko', caption: 'Lima menit istirahat yang berubah jadi satu jam bercerita.', count: 16, size: 'normal' as const },
  { image: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1000&q=88', title: 'Malam yang tak ingin selesai', date: '7 Agustus 2026', location: 'Halaman Posko', caption: 'Bernyanyi pelan agar besok datang sedikit lebih lambat.', count: 28, size: 'tall' as const },
  { image: '/images/kkn-coast-sunset.png', title: 'Senja terakhir di pesisir', date: '8 Agustus 2026', location: 'Garis Pantai', caption: 'Laut yang sama, arah pulang yang berbeda.', count: 27, size: 'wide' as const },
]

const journey = [
  { date: '01 · 12 Juli 2026', title: 'Hari Pertama', description: 'Kami datang sebagai tiga belas orang dengan koper, nama yang belum hafal, dan sedikit rasa canggung. Laut menjadi saksi sapaan pertama.', image: '/images/kkn-group-hero.png' },
  { date: '02 · 15 Juli 2026', title: 'Mulai Beradaptasi', description: 'Jadwal piket, dapur kecil, suara motor desa, dan obrolan selepas isya perlahan membuat tempat asing ini terasa akrab.', image: gallery[1]!.image },
  { date: '03 · 19 Juli 2026', title: 'Menyusun Program Kerja', description: 'Di antara kertas yang penuh coretan dan gelas kopi yang terus diisi, kami belajar menyatukan banyak kepala menjadi satu arah.', image: gallery[2]!.image },
  { date: '04 · 24 Juli 2026', title: 'Hari-Hari Pelaksanaan', description: 'Pagi dimulai lebih cepat, malam selesai lebih lambat. Lelah hadir, tetapi selalu ada tangan lain yang membantu.', image: gallery[3]!.image },
  { date: '05 · 30 Juli 2026', title: 'Cerita di Balik Layar', description: 'Ada rencana yang berubah, salah paham kecil, dan tawa yang meledak saat kamera mati—bagian paling jujur dari perjalanan kami.', image: gallery[4]!.image },
  { date: '06 · 7 Agustus 2026', title: 'Malam Terakhir', description: 'Kami duduk lebih lama dari biasanya. Tak banyak yang dibicarakan, sebab semua tahu besok rumah ini kembali menjadi sekadar tempat.', image: gallery[5]!.image },
  { date: '07 · 8 Agustus 2026', title: 'Hari Perpisahan', description: 'Pelukan, lambaian, dan satu tatapan terakhir ke laut. Kami pulang membawa sesuatu yang tidak pernah muat di dalam koper.', image: gallery[6]!.image },
]

function scrollTo(selector: string) {
  document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' })
}

function updateParallax() {
  cancelAnimationFrame(animationFrame)
  animationFrame = requestAnimationFrame(() => {
    const y = window.scrollY
    document.documentElement.style.setProperty('--hero-image-y', `${Math.min(y * 0.13, 120)}px`)
    document.documentElement.style.setProperty('--hero-copy-y', `${Math.min(y * 0.055, 52)}px`)
    document.documentElement.style.setProperty('--hero-foreground-y', `${Math.min(y * -0.035, 0)}px`)

    document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((element) => {
      const rect = element.getBoundingClientRect()
      const distance = (rect.top + rect.height / 2 - window.innerHeight / 2) * -0.035
      element.style.setProperty('--parallax-shift', `${Math.max(-28, Math.min(28, distance))}px`)
    })
  })
}

function goToLogin() {
  window.location.assign('/login')
}

onMounted(() => {
  if (isLoginPage || isDashboardPage || isRecipientPage || isComposerPage || isInboxPage || isOpenInboxPage || isProfilePage || isAdminPage || isAdminAccessPage || isAdminMonitoringPage || isAdminMembersPage || isMessageReaderPage) return
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible')
    })
  }, { threshold: 0.12 })
  document.querySelectorAll('[data-reveal]').forEach((element) => revealObserver?.observe(element))
  updateParallax()
  window.addEventListener('scroll', updateParallax, { passive: true })
})

onUnmounted(() => {
  revealObserver?.disconnect()
  window.removeEventListener('scroll', updateParallax)
  cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <LoginPage v-if="isLoginPage" />
  <AdminMembersPage v-else-if="isAdminMembersPage" />
  <AdminMessageMonitoringPage v-else-if="isAdminMonitoringPage" />
  <AdminMessageAccessPage v-else-if="isAdminAccessPage" />
  <AdminDashboard v-else-if="isAdminPage" />
  <PrivateMessageReaderPage v-else-if="isMessageReaderPage" :message-id="messageReaderId" />
  <MemberProfilePage v-else-if="isProfilePage" />
  <PrivateInboxOpenPage v-else-if="isOpenInboxPage" />
  <PrivateInboxLockedPage v-else-if="isInboxPage" />
  <MessageComposerPage v-else-if="isComposerPage" />
  <MessageRecipientPage v-else-if="isRecipientPage" />
  <MemberDashboard v-else-if="isDashboardPage" />
  <div v-else class="site-shell landing-page">
    <AppNavbar @login="goToLogin" />

    <main>
      <section id="beranda" class="landing-hero">
        <img class="landing-hero__image" src="/images/kkn-group-hero.png" alt="Foto kelompok tiga belas anggota KKN di tepi pantai" />
        <div class="landing-hero__overlay" />
        <div class="landing-hero__light" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <svg class="landing-hero__wave-lines" viewBox="0 0 1440 310" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-60 160 C180 80 350 250 590 155 S1010 72 1500 176" />
          <path d="M-80 205 C190 130 380 280 640 202 S1080 125 1510 220" />
          <path d="M-40 250 C220 180 410 315 690 250 S1110 178 1490 266" />
        </svg>

        <div class="landing-hero__content">
          <p class="eyebrow eyebrow--light"><span /> Sebuah arsip untuk pulang</p>
          <h1>Akhir dari Sebuah Perjalanan,<br /><em>Awal dari Kenangan</em></h1>
          <p class="landing-hero__copy">Cerita tentang pengabdian, kebersamaan, tawa, dan orang-orang yang membuat perjalanan ini lebih berarti.</p>
          <div class="landing-hero__actions">
            <AppButton icon @click="scrollTo('#perjalanan')">Lihat Perjalanan Kami</AppButton>
            <AppButton variant="secondary" icon @click="scrollTo('#penutup')">Tulis Kesan dan Pesan</AppButton>
          </div>
        </div>

        <div class="landing-hero__identity">
          <span><small>Kelompok</small><strong>MMD FILKOM 33</strong></span>
          <i />
          <span><small>Lokasi</small><strong>Desa Sumbersih</strong></span>
          <i />
          <span><small>Almamater</small><strong>Universitas Brawijaya</strong></span>
          <i />
          <span><small>Pelaksanaan</small><strong>Juli—Agustus 2026</strong></span>
        </div>

        <button class="landing-hero__scroll" aria-label="Gulir ke cerita kami" @click="scrollTo('#cerita')">
          <span>Telusuri cerita</span><ArrowDown :size="17" />
        </button>

        <div class="landing-hero__foreground" aria-hidden="true">
          <svg viewBox="0 0 1440 150" preserveAspectRatio="none"><path d="M0 74 C160 22 330 126 520 73 C710 20 875 124 1070 72 C1225 31 1340 58 1440 82 L1440 150 L0 150 Z" fill="#f8f3e9"/><path d="M0 94 C190 44 350 143 555 93 C765 42 900 137 1110 91 C1270 55 1365 75 1440 98" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="2"/></svg>
        </div>
      </section>

      <section id="cerita" class="landing-intro sand-surface section-pad">
        <div class="section-shell landing-intro__grid">
          <figure class="landing-intro__photo reveal" data-reveal>
            <div><img data-parallax src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1400&q=90" alt="Kegiatan pengabdian bersama warga" /></div>
            <figcaption><Camera :size="14" /> Hari ke-16 · Belajar bersama warga</figcaption>
            <span class="landing-intro__stamp"><Waves :size="24" /><b>30</b><small>hari<br />bersama</small></span>
          </figure>

          <div class="landing-intro__copy reveal" data-reveal>
            <p class="eyebrow"><span /> Cerita kami</p>
            <h2>Lebih dari sekadar<br /><em>program kerja.</em></h2>
            <p class="landing-intro__lead">Tempat ini dibuat untuk menyimpan potongan perjalanan, cerita sederhana, dan orang-orang yang membuat masa KKN menjadi lebih berarti.</p>
            <p>Kami datang membawa banyak rencana. Desa ini mengajarkan bahwa pengabdian juga berarti mendengarkan, tumbuh bersama, dan mengizinkan diri sendiri diubah oleh orang-orang yang ditemui.</p>
            <div class="landing-intro__signature"><span>“beberapa tempat tak hanya kita kunjungi—mereka ikut tinggal di dalam diri.”</span><i /></div>
            <a href="#galeri" class="editorial-link">Buka album kenangan <ChevronRight :size="16" /></a>
          </div>
        </div>
        <svg class="shoreline-transition" viewBox="0 0 1440 130" preserveAspectRatio="none" aria-hidden="true"><path d="M0 35 C210 128 425 18 680 80 C930 142 1180 22 1440 72 L1440 130 L0 130 Z" fill="#082c42"/><path d="M0 61 C240 137 430 40 700 97 C950 151 1190 48 1440 92" fill="none" stroke="rgba(127,210,208,.25)" stroke-width="2"/></svg>
      </section>

      <section id="galeri" class="memory-gallery section-pad">
        <div class="section-shell">
          <header class="memory-gallery__head reveal" data-reveal>
            <div><p class="eyebrow eyebrow--light"><span /> Potongan waktu</p><h2>Kenangan tidak selalu rapi.<br /><em>Itulah yang membuatnya nyata.</em></h2></div>
            <p>Foto buram, tatapan yang tidak siap, dan tawa yang datang sebelum hitungan ketiga—semuanya kami simpan di sini.</p>
          </header>

          <div class="memory-masonry">
            <GalleryCard v-for="(item, index) in gallery" :key="item.title" v-bind="item" class="reveal" :style="{ '--delay': `${(index % 3) * 90}ms` }" data-reveal />
          </div>

          <footer class="memory-gallery__footer reveal" data-reveal>
            <span><Camera :size="18" /> 1.248 foto dari 30 hari perjalanan</span>
            <AppButton variant="secondary" icon>Lihat galeri lengkap</AppButton>
          </footer>
        </div>
        <svg class="ocean-to-foam" viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true"><path d="M0 82 C175 18 330 127 535 72 C770 9 915 126 1145 70 C1270 40 1370 54 1440 78 L1440 140 L0 140 Z" fill="#e7f2ef"/><path d="M0 104 C190 48 355 148 560 94 C765 40 935 142 1165 92 C1285 66 1375 72 1440 98" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="3"/></svg>
      </section>

      <section id="perjalanan" class="journey-section section-pad">
        <div class="section-shell">
          <header class="journey-section__head reveal" data-reveal>
            <p class="eyebrow"><span /> Tiga puluh hari di pesisir</p>
            <h2>Perjalanan yang mengubah<br /><em>cara kami memandang pulang.</em></h2>
            <p>Waktu berjalan seperti ombak—datang perlahan, lalu tiba-tiba telah membawa kita begitu jauh.</p>
          </header>

          <div class="journey-track">
            <svg class="journey-track__wave" viewBox="0 0 100 2800" preserveAspectRatio="none" aria-hidden="true"><path d="M50 0 C5 120 95 260 50 400 S5 680 50 800 S95 1080 50 1200 S5 1480 50 1600 S95 1880 50 2000 S5 2280 50 2400 S95 2680 50 2800" /></svg>
            <TimelineItem v-for="(item, index) in journey" :key="item.title" v-bind="item" :side="index % 2 ? 'right' : 'left'" class="reveal" data-reveal />
          </div>
        </div>
      </section>

      <section class="horizon-quote">
        <img data-parallax src="/images/kkn-coast-sunset.png" alt="Garis pantai tenang saat matahari terbenam" />
        <div class="horizon-quote__overlay" />
        <div class="horizon-quote__light" />
        <blockquote class="reveal" data-reveal>
          <Quote :size="30" />
          <p>Kita mungkin meninggalkan desa ini,<br />tetapi desa ini tidak pernah benar-benar<br /><em>meninggalkan kita.</em></p>
          <footer><span /> Catatan dari garis pantai terakhir</footer>
        </blockquote>
      </section>

      <section id="anggota" class="landing-members section-pad sand-surface">
        <div class="section-shell">
          <header class="landing-members__head reveal" data-reveal>
            <div><p class="eyebrow"><span /> Keluarga kecil kami</p><h2>Orang-Orang di Balik<br /><em>Cerita Ini</em></h2></div>
            <div class="landing-members__count"><UsersRound :size="22" /><span><strong>13</strong><small>anggota<br />MMD FILKOM 33</small></span></div>
          </header>

          <div class="landing-members__grid">
            <MemberCard v-for="(member, index) in members" :key="member.id" :member="member" :featured="index === members.length - 1" class="reveal" :style="{ '--delay': `${(index % 4) * 70}ms` }" data-reveal />
          </div>
          <p class="landing-members__note">Tiga belas kepala, tiga belas kebiasaan kecil, dan satu rumah yang kami bangun bersama.</p>
        </div>
        <svg class="sand-to-sunset" viewBox="0 0 1440 130" preserveAspectRatio="none" aria-hidden="true"><path d="M0 54 C225 123 405 12 680 72 C950 130 1175 23 1440 79 L1440 130 L0 130 Z" fill="#061f2f"/></svg>
      </section>

      <section id="penutup" class="closing-cta">
        <img data-parallax src="/images/kkn-coast-sunset.png" alt="Senja di tepi laut sebagai penutup perjalanan" />
        <div class="closing-cta__overlay" />
        <div class="closing-cta__content reveal" data-reveal>
          <Sparkles :size="24" />
          <p class="eyebrow eyebrow--light">Sampai bertemu di cerita berikutnya</p>
          <h2>Perjalanannya selesai.<br /><em>Kenangannya tetap berlayar.</em></h2>
          <p>Tinggalkan satu pesan kecil untuk orang-orang yang membuat tiga puluh hari ini terasa seperti rumah.</p>
          <div><AppButton icon>Tulis Kesan dan Pesan</AppButton><AppButton variant="secondary" icon @click="goToLogin">Masuk ke Ruang Anggota</AppButton></div>
        </div>
      </section>
    </main>

    <footer class="landing-footer">
      <svg class="landing-footer__texture" viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true"><path d="M-30 80 C180 10 355 142 570 72 S970 140 1190 75 S1400 58 1480 86"/><path d="M-40 108 C190 48 360 166 590 103 S970 165 1210 105 S1380 92 1480 112"/></svg>
      <div class="section-shell landing-footer__grid">
        <div class="landing-footer__brand"><a href="#beranda"><span><Waves :size="24" /></span><b>PULUPULU</b></a><p>Arsip digital keluarga kecil MMD FILKOM 33 di Desa Pesisir Harapan.</p></div>
        <nav><strong>Jelajahi</strong><a href="#cerita">Cerita Kami</a><a href="#galeri">Galeri</a><a href="#perjalanan">Perjalanan</a><a href="#anggota">Anggota</a></nav>
        <div class="landing-footer__meta"><strong>Pelaksanaan</strong><span><CalendarDays :size="14" /> Juli—Agustus 2026</span><span><MapPin :size="14" /> Desa Pesisir Harapan</span><span>Universitas Nusantara</span></div>
      </div>
      <div class="section-shell landing-footer__bottom"><span>© 2026 MMD FILKOM 33</span><p>Dibuat dengan rindu, di antara ombak dan jalan pulang.</p><button @click="goToLogin">Masuk anggota</button></div>
    </footer>

    <MobileBottomNav />
  </div>
</template>
