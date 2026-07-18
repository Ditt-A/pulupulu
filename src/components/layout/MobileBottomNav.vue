<script setup lang="ts">
import { Footprints, Home, Images, UsersRound } from '@lucide/vue'
import { onMounted, onUnmounted, ref } from 'vue'

const items = [{ label: 'Beranda', href: '#beranda', icon: Home }, { label: 'Galeri', href: '#galeri', icon: Images }, { label: 'Perjalanan', href: '#perjalanan', icon: Footprints }, { label: 'Anggota', href: '#anggota', icon: UsersRound }]
const activeSection = ref('#beranda')

function updateActiveSection() {
  const readingLine = window.scrollY + Math.min(window.innerHeight * 0.34, 310)
  let current = items[0]?.href ?? '#beranda'

  items.forEach((item) => {
    const section = document.querySelector<HTMLElement>(item.href)
    if (section && section.offsetTop <= readingLine) current = item.href
  })

  activeSection.value = current
}

onMounted(() => {
  updateActiveSection()
  window.addEventListener('scroll', updateActiveSection, { passive: true })
})

onUnmounted(() => window.removeEventListener('scroll', updateActiveSection))
</script>

<template>
  <nav class="mobile-bottom" aria-label="Navigasi seluler">
    <a
      v-for="item in items"
      :key="item.href"
      :href="item.href"
      :class="{ active: activeSection === item.href }"
      :aria-current="activeSection === item.href ? 'location' : undefined"
    >
      <component :is="item.icon" :size="20" />
      <span>{{ item.label }}</span>
    </a>
  </nav>
</template>
