<script setup lang="ts">
import { LogIn, Menu, Waves, X } from '@lucide/vue'
import { onMounted, onUnmounted, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'

const emit = defineEmits<{ login: [] }>()
const open = ref(false)
const scrolled = ref(false)
const activeSection = ref('#beranda')

const links = [
  { label: 'Beranda', href: '#beranda' },
  { label: 'Cerita Kami', href: '#cerita' },
  { label: 'Galeri', href: '#galeri' },
  { label: 'Perjalanan', href: '#perjalanan' },
  { label: 'Anggota', href: '#anggota' },
]

function updateNav() {
  scrolled.value = window.scrollY > 56

  const readingLine = window.scrollY + Math.min(window.innerHeight * 0.34, 310)
  let current = links[0]?.href ?? '#beranda'

  links.forEach((link) => {
    const section = document.querySelector<HTMLElement>(link.href)
    if (section && section.offsetTop <= readingLine) current = link.href
  })

  activeSection.value = current
}

function openLogin() {
  open.value = false
  emit('login')
}

onMounted(() => {
  updateNav()
  window.addEventListener('scroll', updateNav, { passive: true })
})

onUnmounted(() => window.removeEventListener('scroll', updateNav))
</script>

<template>
  <header class="navbar" :class="{ 'navbar--scrolled': scrolled, 'navbar--open': open }">
    <a class="navbar__brand" href="#beranda" aria-label="Pulupulu MMD FILKOM 33">
      <span><Waves :size="22" /></span>
      <b>PULU<span>PULU</span><small>MMD FILKOM 33</small></b>
    </a>

    <nav class="navbar__links" aria-label="Navigasi utama">
      <a
        v-for="link in links"
        :key="link.href"
        :href="link.href"
        :class="{ 'is-active': activeSection === link.href }"
        :aria-current="activeSection === link.href ? 'location' : undefined"
      >{{ link.label }}</a>
    </nav>

    <AppButton class="navbar__cta" variant="secondary" @click="openLogin">
      <LogIn :size="16" /> Masuk
    </AppButton>

    <button class="navbar__menu" :aria-expanded="open" aria-label="Buka menu" @click="open = !open">
      <X v-if="open" /><Menu v-else />
    </button>

    <Transition name="menu">
      <nav v-if="open" class="navbar__mobile" aria-label="Navigasi seluler">
        <a
          v-for="link in links"
          :key="link.href"
          :href="link.href"
          :class="{ 'is-active': activeSection === link.href }"
          :aria-current="activeSection === link.href ? 'location' : undefined"
          @click="open = false"
        >{{ link.label }}</a>
        <button @click="openLogin"><LogIn :size="17" /> Masuk</button>
      </nav>
    </Transition>
  </header>
</template>

<style scoped>
.navbar__links a:first-child:not(.is-active) { color: rgba(255,255,255,.74); }
.navbar__links a:first-child:not(.is-active)::after { opacity: 0; transform: translateX(-50%) scale(0); }
.navbar__links a.is-active { color: white; }
.navbar__links a.is-active::after { content: ''; position: absolute; left: 50%; bottom: -15px; width: 5px; height: 5px; border-radius: 50%; opacity: 1; background: var(--sunset); transform: translateX(-50%) scale(1); transition: opacity .25s ease, transform .25s ease; }
.navbar__mobile a.is-active { color: white; border-radius: 10px; background: rgba(80,184,185,.14); }
</style>
