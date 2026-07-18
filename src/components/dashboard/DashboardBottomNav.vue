<script setup lang="ts">
import { Home, Images, Mail, UserCircle } from '@lucide/vue'
defineProps<{ active: string }>()
const emit = defineEmits<{ navigate: [section: string] }>()
const items = [{ id: 'beranda', label: 'Beranda', icon: Home }, { id: 'surat', label: 'Surat', icon: Mail }, { id: 'album', label: 'Album', icon: Images }, { id: 'profil', label: 'Profil', icon: UserCircle }]
</script>

<template>
  <nav class="dash-bottom-nav" aria-label="Navigasi dashboard seluler">
    <button v-for="item in items" :key="item.id" :class="{ active: active === item.id }" @click="emit('navigate', item.id)"><component :is="item.icon" :size="20" /><span>{{ item.label }}</span><i v-if="item.id === 'surat'">3</i></button>
  </nav>
</template>
