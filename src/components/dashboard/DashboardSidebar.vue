<script setup lang="ts">
import { ArrowUpRight, Home, Images, LockKeyhole, LogOut, Send, UserCircle, UsersRound, Waves } from '@lucide/vue'
import type { AuthUser } from '@/types/auth'

defineProps<{ user: AuthUser; portrait: string; active?: string }>()
const emit = defineEmits<{ navigate: [section: string]; logout: [] }>()

const items = [
  { id: 'beranda', label: 'Beranda', icon: Home },
  { id: 'tulis', label: 'Tulis pesan', icon: Send },
  { id: 'baca', label: 'Baca pesan', icon: LockKeyhole },
  { id: 'album', label: 'Album kenangan', icon: Images },
  { id: 'lingkaran', label: 'Lingkaran kita', icon: UsersRound },
  { id: 'profil', label: 'Profil saya', icon: UserCircle },
]
</script>

<template>
  <aside class="dash-sidebar">
    <a class="dash-sidebar__brand" href="/"><span><Waves :size="22" /></span><b>PULU<span>PULU</span><small>RUANG ANGGOTA</small></b></a>

    <div class="dash-sidebar__profile">
      <img :src="portrait" :alt="user.name" />
      <span><small>Selamat datang,</small><strong>{{ user.name }}</strong><em>{{ user.role }}</em></span>
    </div>

    <p class="dash-sidebar__label">Ruang kenangan</p>
    <nav aria-label="Navigasi dashboard">
      <button v-for="item in items" :key="item.id" :class="{ active: active === item.id }" @click="emit('navigate', item.id)">
        <component :is="item.icon" :size="18" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="dash-sidebar__footer">
      <a href="/" target="_self"><ArrowUpRight :size="17" /> Lihat situs publik</a>
      <button @click="emit('logout')"><LogOut :size="17" /> Keluar</button>
    </div>
  </aside>
</template>
