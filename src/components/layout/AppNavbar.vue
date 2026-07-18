<script setup lang="ts">
import { LogIn, Menu, Waves, X } from '@lucide/vue'
import { onMounted, onUnmounted, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'

const emit = defineEmits<{ login: [] }>()
const open = ref(false)
const scrolled = ref(false)

const links = [
  { label: 'Beranda', href: '#beranda' },
  { label: 'Cerita Kami', href: '#cerita' },
  { label: 'Galeri', href: '#galeri' },
  { label: 'Perjalanan', href: '#perjalanan' },
  { label: 'Anggota', href: '#anggota' },
]

function updateNav() {
  scrolled.value = window.scrollY > 56
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
      <a v-for="link in links" :key="link.href" :href="link.href">{{ link.label }}</a>
    </nav>

    <AppButton class="navbar__cta" variant="secondary" @click="openLogin">
      <LogIn :size="16" /> Masuk
    </AppButton>

    <button class="navbar__menu" :aria-expanded="open" aria-label="Buka menu" @click="open = !open">
      <X v-if="open" /><Menu v-else />
    </button>

    <Transition name="menu">
      <nav v-if="open" class="navbar__mobile" aria-label="Navigasi seluler">
        <a v-for="link in links" :key="link.href" :href="link.href" @click="open = false">{{ link.label }}</a>
        <button @click="openLogin"><LogIn :size="17" /> Masuk ke ruang anggota</button>
      </nav>
    </Transition>
  </header>
</template>

