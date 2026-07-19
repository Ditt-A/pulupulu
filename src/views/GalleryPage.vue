<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ArrowLeft, CalendarDays, Camera, ChevronRight, MapPin, Waves, X } from '@lucide/vue'
import { fullGallery, galleryCategories, type GalleryCategory, type GalleryMemory } from '@/data/gallery'

type GalleryFilter = 'all' | GalleryCategory

const activeFilter = ref<GalleryFilter>('all')
const activeMemory = ref<GalleryMemory | null>(null)
let scrollResetFrame = 0

// The landing page can be several screens down when it sends the visitor here.
// Disable native restoration for this document so that position is not copied
// to the standalone gallery page after Vue has mounted it.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

const visibleMemories = computed(() => {
  if (activeFilter.value === 'all') return fullGallery
  return fullGallery.filter((memory) => memory.category === activeFilter.value)
})

const activeFilterLabel = computed(() => (
  galleryCategories.find((category) => category.value === activeFilter.value)?.label ?? 'Semua kenangan'
))

function closeMemory() {
  activeMemory.value = null
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMemory()
}

function forceGalleryToTop() {
  const root = document.documentElement
  const previousBehavior = root.style.scrollBehavior

  // The global design system enables smooth scrolling. Temporarily overriding
  // it keeps this entry reset immediate instead of showing the hero half-way.
  root.style.scrollBehavior = 'auto'
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  root.scrollTop = 0
  document.body.scrollTop = 0
  root.style.scrollBehavior = previousBehavior
}

function resetGalleryEntryScroll() {
  forceGalleryToTop()
  cancelAnimationFrame(scrollResetFrame)
  scrollResetFrame = requestAnimationFrame(() => {
    forceGalleryToTop()
    scrollResetFrame = requestAnimationFrame(forceGalleryToTop)
  })
}

watch(activeMemory, (memory) => {
  document.body.style.overflow = memory ? 'hidden' : ''
})

onMounted(() => {
  resetGalleryEntryScroll()
  window.addEventListener('pageshow', resetGalleryEntryScroll)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.body.style.overflow = ''
  cancelAnimationFrame(scrollResetFrame)
  window.removeEventListener('pageshow', resetGalleryEntryScroll)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="gallery-page">
    <header class="gallery-nav">
      <a class="gallery-brand" href="/" aria-label="Kembali ke beranda PULUPULU">
        <span><Waves :size="23" /></span>
        <b>PULU<em>PULU</em><small>MMD FILKOM 33</small></b>
      </a>

      <div class="gallery-nav__actions">
        <a href="/#galeri"><ArrowLeft :size="16" /> Kembali ke cerita</a>
        <a class="gallery-nav__message" href="/login">Tulis kesan dan pesan <ChevronRight :size="16" /></a>
      </div>
    </header>

    <main>
      <section class="gallery-hero">
        <img src="/images/kkn-group-hero.png" alt="Tiga belas anggota MMD FILKOM 33 di Desa Sumbersih" />
        <div class="gallery-hero__wash" />
        <div class="gallery-hero__light" aria-hidden="true" />

        <div class="gallery-hero__copy">
          <p><span /> Album kenangan lengkap</p>
          <h1>Tiga puluh hari,<br /><em>ribuan cara untuk mengingat.</em></h1>
          <div class="gallery-hero__description">
            <p>Potongan kecil dari perjalanan MMD FILKOM 33 di Desa Sumbersih—dari pagi yang tergesa sampai malam yang tidak ingin selesai.</p>
            <span><Camera :size="16" /> 1.248 foto tersimpan</span>
          </div>
        </div>

        <svg class="gallery-hero__wave" viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 70 C195 10 365 130 580 70 C800 8 970 132 1185 72 C1305 38 1385 48 1440 68 L1440 140 L0 140 Z" />
          <path d="M0 94 C210 43 390 147 600 94 C815 40 985 148 1205 95 C1320 68 1390 75 1440 91" />
        </svg>
      </section>

      <section class="gallery-album" aria-labelledby="gallery-title">
        <div class="gallery-album__intro">
          <div>
            <p class="gallery-kicker"><span /> Arsip perjalanan</p>
            <h2 id="gallery-title">Kenangan yang kami<br /><em>bawa pulang.</em></h2>
          </div>
          <p>Setiap foto menyimpan detail yang nyaris terlewat: tangan yang ikut membantu, wajah yang mulai akrab, dan tawa di sela-sela lelah.</p>
        </div>

        <div class="gallery-filter-row">
          <div class="gallery-filters" aria-label="Filter album">
            <button
              v-for="category in galleryCategories"
              :key="category.value"
              type="button"
              :class="{ active: activeFilter === category.value }"
              :aria-pressed="activeFilter === category.value"
              @click="activeFilter = category.value"
            >
              {{ category.label }}
            </button>
          </div>
          <span>{{ visibleMemories.length }} cerita · {{ activeFilterLabel }}</span>
        </div>

        <TransitionGroup name="album" tag="div" class="gallery-grid">
          <button
            v-for="(memory, index) in visibleMemories"
            :key="memory.slug"
            type="button"
            class="memory-card"
            :class="`memory-card--${memory.size}`"
            :style="{ '--card-delay': `${Math.min(index, 5) * 55}ms` }"
            :aria-label="`Buka foto ${memory.title}`"
            @click="activeMemory = memory"
          >
            <img :src="memory.image" :alt="memory.title" loading="lazy" />
            <span class="memory-card__wash" />
            <span class="memory-card__category">{{ galleryCategories.find((item) => item.value === memory.category)?.label }}</span>
            <span class="memory-card__content">
              <small><CalendarDays :size="12" /> {{ memory.date }} <i /> <MapPin :size="12" /> {{ memory.location }}</small>
              <strong>{{ memory.title }}</strong>
              <span>{{ memory.caption }}</span>
            </span>
            <span class="memory-card__open"><Camera :size="15" /> Lihat cerita</span>
          </button>
        </TransitionGroup>
      </section>

      <section class="gallery-closing">
        <div>
          <Waves :size="28" />
          <p>“Yang paling berharga bukan foto yang sempurna, tetapi orang-orang yang membuat kita ingin mengambilnya.”</p>
          <span>MMD FILKOM 33 · Desa Sumbersih · Juli - Agustus 2026</span>
        </div>
        <a href="/login">Tulis kesan dan pesan <ChevronRight :size="17" /></a>
      </section>
    </main>

    <footer class="gallery-footer">
      <a href="/"><Waves :size="20" /> PULUPULU</a>
      <p>Arsip digital MMD FILKOM 33, Universitas Brawijaya.</p>
      <span>© 2026 · Dibuat dengan rindu</span>
    </footer>

    <Teleport to="body">
      <Transition name="lightbox">
        <div v-if="activeMemory" class="gallery-lightbox" role="dialog" aria-modal="true" :aria-label="activeMemory.title" @click.self="closeMemory">
          <button type="button" aria-label="Tutup foto" @click="closeMemory"><X :size="22" /></button>
          <article>
            <figure><img :src="activeMemory.image" :alt="activeMemory.title" /></figure>
            <div>
              <p>{{ galleryCategories.find((item) => item.value === activeMemory?.category)?.label }}</p>
              <h2>{{ activeMemory.title }}</h2>
              <span><CalendarDays :size="14" /> {{ activeMemory.date }}</span>
              <span><MapPin :size="14" /> {{ activeMemory.location }}</span>
              <blockquote>{{ activeMemory.caption }}</blockquote>
            </div>
          </article>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.gallery-page { min-height: 100vh; overflow: clip; color: #123743; background: #f8f3e9; }
.gallery-nav { position: absolute; z-index: 10; top: 0; left: 50%; width: min(1240px, calc(100% - 56px)); height: 94px; display: flex; align-items: center; justify-content: space-between; color: white; transform: translateX(-50%); border-bottom: 1px solid rgba(255,255,255,.2); }
.gallery-brand { display: flex; align-items: center; gap: 11px; }
.gallery-brand > span { width: 41px; height: 41px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.24); border-radius: 50%; background: rgba(255,255,255,.08); backdrop-filter: blur(10px); }
.gallery-brand b { display: grid; grid-template-columns: auto auto; color: white; font-size: 14px; font-style: normal; letter-spacing: .14em; }
.gallery-brand b em { color: #8ad7d6; font-style: normal; }
.gallery-brand b small { grid-column: span 2; margin-top: -1px; color: rgba(255,255,255,.48); font-size: 12px; letter-spacing: .21em; }
.gallery-nav__actions { display: flex; align-items: center; gap: 10px; }
.gallery-nav__actions a { min-height: 42px; display: inline-flex; align-items: center; gap: 8px; padding: 0 16px; border-radius: 999px; color: rgba(255,255,255,.8); font-size: 15px; font-weight: 700; transition: background .25s ease, color .25s ease, transform .25s ease; }
.gallery-nav__actions a:hover { color: white; background: rgba(255,255,255,.09); transform: translateY(-1px); }
.gallery-nav__actions .gallery-nav__message { color: #082c42; background: #f8f3e9; }
.gallery-nav__actions .gallery-nav__message:hover { color: #082c42; background: white; }

.gallery-hero { position: relative; min-height: max(720px, 100svh); color: white; background: #082c42; isolation: isolate; }
.gallery-hero > img { position: absolute; z-index: -3; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 42%; animation: hero-drift 17s ease-in-out infinite alternate; }
.gallery-hero__wash { position: absolute; z-index: -2; inset: 0; background: linear-gradient(90deg, rgba(3,27,42,.94) 0%, rgba(5,43,62,.72) 48%, rgba(5,36,51,.32) 100%), linear-gradient(0deg, rgba(4,35,49,.72), transparent 55%); }
.gallery-hero__light { position: absolute; z-index: -1; top: 18%; right: 13%; width: 280px; height: 280px; border-radius: 50%; background: rgba(234,183,105,.18); filter: blur(70px); }
.gallery-hero__copy { position: absolute; left: max(7vw, calc((100vw - 1180px) / 2)); top: 50%; width: min(820px, calc(100% - 48px)); transform: translateY(-42%); }
.gallery-hero__copy > p, .gallery-kicker { display: flex; align-items: center; gap: 11px; margin-bottom: 22px; color: #bce7e4; font-size: 14px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; }
.gallery-hero__copy > p span, .gallery-kicker span { width: 32px; height: 1px; background: currentColor; }
.gallery-hero h1 { max-width: 920px; margin: 0; font-family: 'Italiana', Georgia, serif; font-size: clamp(62px, 7.3vw, 108px); font-weight: 400; line-height: .96; letter-spacing: -.055em; }
.gallery-hero h1 em { color: #8ad7d6; font-style: italic; }
.gallery-hero__description { display: flex; align-items: end; gap: 50px; margin-top: 34px; }
.gallery-hero__description p { max-width: 570px; margin: 0; color: rgba(255,255,255,.68); font-size: 16px; line-height: 1.8; }
.gallery-hero__description span { display: flex; align-items: center; gap: 8px; padding-bottom: 4px; color: rgba(255,255,255,.58); font-size: 14px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }
.gallery-hero__wave { position: absolute; left: 0; bottom: -1px; width: 100%; height: 135px; }
.gallery-hero__wave path:first-child { fill: #f8f3e9; }
.gallery-hero__wave path:last-child { fill: none; stroke: rgba(255,255,255,.68); stroke-width: 2; }

.gallery-album { width: min(1180px, calc(100% - 48px)); margin-inline: auto; padding: 126px 0 150px; }
.gallery-album__intro { display: grid; grid-template-columns: 1fr 360px; gap: 80px; align-items: end; }
.gallery-kicker { margin: 0 0 18px; color: #0b7089; }
.gallery-album h2 { margin: 0; color: #082c42; font-family: 'Italiana', Georgia, serif; font-size: clamp(52px, 5.5vw, 78px); font-weight: 400; line-height: 1; letter-spacing: -.05em; }
.gallery-album h2 em { color: #15939e; font-style: italic; }
.gallery-album__intro > p { margin: 0 0 6px; color: #627d82; font-size: 15px; line-height: 1.85; }
.gallery-filter-row { display: flex; align-items: center; justify-content: space-between; gap: 22px; margin: 70px 0 36px; padding-bottom: 20px; border-bottom: 1px solid rgba(9,81,101,.14); }
.gallery-filters { display: flex; flex-wrap: wrap; gap: 8px; }
.gallery-filters button { min-height: 41px; padding: 0 16px; color: #617b81; border: 1px solid rgba(9,81,101,.13); border-radius: 999px; background: rgba(255,255,255,.47); font-size: 15px; font-weight: 700; transition: color .25s ease, border .25s ease, background .25s ease, transform .25s ease; }
.gallery-filters button:hover { color: #0b7089; border-color: rgba(11,112,137,.35); transform: translateY(-1px); }
.gallery-filters button.active { color: white; border-color: #0a5770; background: #0a5770; box-shadow: 0 10px 24px rgba(7,73,93,.17); }
.gallery-filter-row > span { color: #819397; font-size: 14px; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }

.gallery-grid { columns: 3 300px; column-gap: 22px; }
.memory-card { position: relative; width: 100%; min-height: 380px; display: block; break-inside: avoid; margin: 0 0 22px; padding: 0; overflow: hidden; color: white; text-align: left; border: 0; border-radius: 18px; background: #0b4059; box-shadow: 0 18px 45px rgba(7,52,66,.12); isolation: isolate; animation: memory-enter .65s cubic-bezier(.2,.7,.2,1) both; animation-delay: var(--card-delay); }
.memory-card--tall { min-height: 540px; }
.memory-card--wide { min-height: 320px; }
.memory-card--polaroid { padding: 10px 10px 76px; border-radius: 8px; background: #fffaf0; transform: rotate(-.6deg); }
.memory-card > img { position: absolute; z-index: -2; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .8s cubic-bezier(.2,.7,.2,1), filter .5s ease; }
.memory-card--polaroid > img { inset: 10px 10px 76px; width: calc(100% - 20px); height: calc(100% - 86px); }
.memory-card__wash { position: absolute; z-index: -1; inset: 0; background: linear-gradient(0deg, rgba(4,28,40,.92), rgba(4,35,49,.06) 68%); }
.memory-card--polaroid .memory-card__wash { inset: 10px 10px 76px; background: linear-gradient(0deg, rgba(4,28,40,.8), transparent 65%); }
.memory-card__category { position: absolute; top: 17px; left: 17px; padding: 7px 10px; color: rgba(255,255,255,.88); border: 1px solid rgba(255,255,255,.22); border-radius: 999px; background: rgba(5,42,57,.3); backdrop-filter: blur(10px); font-size: 13px; font-weight: 700; letter-spacing: .11em; text-transform: uppercase; }
.memory-card__content { position: absolute; left: 22px; right: 22px; bottom: 22px; display: grid; }
.memory-card__content small { display: flex; align-items: center; gap: 5px; color: rgba(255,255,255,.6); font-size: 13px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }
.memory-card__content small i { width: 3px; height: 3px; margin-inline: 3px; border-radius: 50%; background: rgba(255,255,255,.35); }
.memory-card__content strong { margin-top: 8px; font-family: 'Italiana', Georgia, serif; font-size: 27px; font-weight: 400; line-height: 1.08; }
.memory-card__content > span { max-height: 0; margin-top: 0; overflow: hidden; opacity: 0; color: rgba(255,255,255,.7); font-size: 15px; line-height: 1.55; transition: max-height .4s ease, margin .4s ease, opacity .4s ease; }
.memory-card__open { position: absolute; top: 18px; right: 18px; display: flex; align-items: center; gap: 7px; opacity: 0; transform: translateY(-4px); color: white; font-size: 14px; font-weight: 700; transition: opacity .3s ease, transform .3s ease; }
.memory-card--polaroid .memory-card__category { top: 25px; left: 25px; }
.memory-card--polaroid .memory-card__content { bottom: 17px; color: #123743; }
.memory-card--polaroid .memory-card__content small { color: #6a858a; }
.memory-card--polaroid .memory-card__content strong { margin-top: 4px; font-family: 'Caveat', cursive; font-size: 25px; }
.memory-card--polaroid .memory-card__content > span { display: none; }
.memory-card:hover > img { transform: scale(1.055); filter: saturate(1.05); }
.memory-card:hover .memory-card__content > span { max-height: 60px; margin-top: 9px; opacity: 1; }
.memory-card:hover .memory-card__open { opacity: 1; transform: translateY(0); }
.memory-card:focus-visible { outline: 3px solid #39b8bd; outline-offset: 4px; }
.album-move, .album-enter-active, .album-leave-active { transition: all .45s ease; }
.album-enter-from, .album-leave-to { opacity: 0; transform: translateY(18px) scale(.98); }

.gallery-closing { position: relative; min-height: 400px; display: flex; align-items: center; justify-content: space-between; gap: 70px; padding: 80px max(7vw, calc((100vw - 1180px) / 2)); color: white; background: radial-gradient(circle at 78% 25%, rgba(42,152,164,.22), transparent 25%), #082c42; }
.gallery-closing::before { content: ''; position: absolute; inset: 0; opacity: .08; background-image: repeating-radial-gradient(ellipse at 50% 0, transparent 0 23px, #8dd6d2 24px 25px, transparent 26px 50px); background-size: 700px 180px; }
.gallery-closing > * { position: relative; z-index: 1; }
.gallery-closing > div { max-width: 760px; }
.gallery-closing svg { color: #8ad7d6; }
.gallery-closing p { margin: 22px 0 18px; font-family: 'Italiana', Georgia, serif; font-size: clamp(34px, 4vw, 54px); line-height: 1.15; letter-spacing: -.03em; }
.gallery-closing span { color: rgba(255,255,255,.48); font-size: 14px; font-weight: 700; letter-spacing: .11em; text-transform: uppercase; }
.gallery-closing > a { min-height: 52px; display: inline-flex; align-items: center; gap: 10px; padding: 0 21px; color: #082c42; border-radius: 999px; background: #f8f3e9; font-size: 15px; font-weight: 700; white-space: nowrap; transition: transform .25s ease, background .25s ease; }
.gallery-closing > a:hover { transform: translateY(-2px); background: white; }
.gallery-footer { min-height: 95px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 30px; padding: 20px max(5vw, calc((100vw - 1240px) / 2)); color: rgba(255,255,255,.48); background: #061f2f; font-size: 14px; }
.gallery-footer a { display: flex; align-items: center; gap: 8px; color: white; font-size: 15px; font-weight: 800; letter-spacing: .14em; }
.gallery-footer p { margin: 0; text-align: center; }
.gallery-footer > span { justify-self: end; }

.gallery-lightbox { position: fixed; z-index: 200; inset: 0; display: grid; place-items: center; padding: 34px; background: rgba(2,20,30,.82); backdrop-filter: blur(15px); }
.gallery-lightbox > button { position: fixed; z-index: 2; top: 24px; right: 24px; width: 45px; height: 45px; display: grid; place-items: center; color: white; border: 1px solid rgba(255,255,255,.2); border-radius: 50%; background: rgba(255,255,255,.08); }
.gallery-lightbox article { width: min(1060px, 100%); max-height: min(760px, calc(100vh - 68px)); display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, .72fr); overflow: hidden; border: 1px solid rgba(255,255,255,.13); border-radius: 22px; background: #f8f3e9; box-shadow: 0 35px 100px rgba(0,12,18,.4); }
.gallery-lightbox figure { min-height: 530px; margin: 0; background: #082c42; }
.gallery-lightbox figure img { width: 100%; height: 100%; object-fit: cover; }
.gallery-lightbox article > div { display: flex; flex-direction: column; align-items: start; justify-content: center; padding: 48px 40px; }
.gallery-lightbox article > div > p { margin-bottom: 18px; color: #0b7089; font-size: 14px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
.gallery-lightbox h2 { margin: 0 0 25px; color: #082c42; font-family: 'Italiana', Georgia, serif; font-size: clamp(34px, 3.5vw, 52px); font-weight: 400; line-height: 1.05; letter-spacing: -.04em; }
.gallery-lightbox article > div > span { display: flex; align-items: center; gap: 8px; margin: 4px 0; color: #6f8589; font-size: 14px; }
.gallery-lightbox blockquote { margin: 28px 0 0; padding-top: 24px; color: #47656b; border-top: 1px solid rgba(9,81,101,.13); font-family: 'Caveat', cursive; font-size: 24px; line-height: 1.35; }
.lightbox-enter-active, .lightbox-leave-active { transition: opacity .3s ease; }
.lightbox-enter-active article, .lightbox-leave-active article { transition: transform .4s cubic-bezier(.2,.7,.2,1), opacity .3s ease; }
.lightbox-enter-from, .lightbox-leave-to { opacity: 0; }
.lightbox-enter-from article, .lightbox-leave-to article { opacity: 0; transform: translateY(22px) scale(.97); }

@keyframes hero-drift { from { transform: scale(1.01); } to { transform: scale(1.055) translate3d(-.6%, -.4%, 0); } }
@keyframes memory-enter { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 900px) {
  .gallery-nav { width: calc(100% - 36px); }
  .gallery-nav__actions > a:first-child { display: none; }
  .gallery-hero { min-height: max(680px, 100svh); }
  .gallery-hero__description { display: grid; gap: 18px; }
  .gallery-album__intro { grid-template-columns: 1fr; gap: 28px; }
  .gallery-album__intro > p { max-width: 600px; }
  .gallery-filter-row { align-items: start; flex-direction: column; }
  .gallery-grid { columns: 2 250px; }
  .gallery-closing { align-items: start; flex-direction: column; gap: 36px; }
  .gallery-footer { grid-template-columns: 1fr 1fr; }
  .gallery-footer p { display: none; }
  .gallery-lightbox article { grid-template-columns: 1fr; overflow-y: auto; }
  .gallery-lightbox figure { min-height: min(52vh, 460px); }
}

@media (max-width: 600px) {
  .gallery-nav { width: calc(100% - 24px); height: 76px; }
  .gallery-brand > span { width: 36px; height: 36px; }
  .gallery-nav__actions .gallery-nav__message { min-height: 38px; padding: 0 13px; font-size: 0; }
  .gallery-nav__message::before { content: 'Tulis pesan'; font-size: 14px; }
  .gallery-hero { min-height: max(700px, 100svh); }
  .gallery-hero__copy { left: 24px; top: 47%; width: calc(100% - 48px); }
  .gallery-hero__copy > p { margin-bottom: 18px; font-size: 13px; }
  .gallery-hero h1 { font-size: clamp(48px, 15vw, 67px); }
  .gallery-hero__description { margin-top: 24px; }
  .gallery-hero__description p { font-size: 15px; line-height: 1.65; }
  .gallery-hero__description span { font-size: 13px; }
  .gallery-hero__wave { height: 85px; }
  .gallery-album { width: calc(100% - 32px); padding: 85px 0 95px; }
  .gallery-album h2 { font-size: 47px; }
  .gallery-album__intro > p { font-size: 15px; }
  .gallery-filter-row { margin: 46px 0 25px; }
  .gallery-filters { width: 100%; flex-wrap: nowrap; padding-bottom: 8px; overflow-x: auto; scrollbar-width: none; }
  .gallery-filters::-webkit-scrollbar { display: none; }
  .gallery-filters button { flex: 0 0 auto; min-height: 39px; padding-inline: 14px; font-size: 14px; }
  .gallery-grid { columns: 1; }
  .memory-card, .memory-card--wide { min-height: 370px; }
  .memory-card--tall { min-height: 500px; }
  .memory-card__content strong { font-size: 25px; }
  .gallery-closing { min-height: 470px; padding: 70px 24px; }
  .gallery-closing p { font-size: 35px; }
  .gallery-footer { min-height: 120px; grid-template-columns: 1fr; align-content: center; padding-inline: 24px; }
  .gallery-footer > span { justify-self: start; }
  .gallery-lightbox { padding: 12px; }
  .gallery-lightbox > button { top: 20px; right: 20px; background: rgba(4,35,49,.5); }
  .gallery-lightbox article { max-height: calc(100vh - 24px); border-radius: 16px; }
  .gallery-lightbox figure { min-height: 43vh; }
  .gallery-lightbox article > div { padding: 30px 25px; }
}

@media (max-width: 380px) {
  .gallery-hero { min-height: max(740px, 100svh); }
  .gallery-hero__copy { left: 20px; width: calc(100% - 40px); }
  .gallery-hero h1 { font-size: 46px; }
}

@media (prefers-reduced-motion: reduce) {
  .gallery-hero > img, .memory-card { animation: none; }
  .memory-card, .memory-card > img { transition: none; }
}
</style>
