<script setup lang="ts">
import { computed } from 'vue'
import { ChartNoAxesCombined, ExternalLink, LayoutDashboard, LockKeyhole, LogOut, Mail, UsersRound, Waves, X } from '@lucide/vue'
import type { AuthUser } from '@/types/auth'

const props = defineProps<{ user: AuthUser; active: string }>()
const emit = defineEmits<{ navigate: [section: string]; logout: []; close: [] }>()
const initials = computed(() => props.user.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase())
const items = [
  { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'anggota', label: 'Anggota', icon: UsersRound },
  { id: 'pesan', label: 'Pesan privat', icon: Mail },
  { id: 'monitoring', label: 'Monitoring pesan', icon: ChartNoAxesCombined },
  { id: 'akses', label: 'Akses pesan', icon: LockKeyhole },
]
</script>

<template>
  <aside class="admin-sidebar">
    <header><a class="admin-sidebar__brand" href="/admin"><span><Waves :size="21" /></span><b>PULU<span>PULU</span><small>RUANG PENGELOLA</small></b></a><button aria-label="Tutup menu" @click="emit('close')"><X :size="19" /></button></header>
    <div class="admin-sidebar__profile"><span>{{ initials }}</span><div><small>Masuk sebagai</small><strong>{{ user.name }}</strong><em>{{ user.role }}</em></div></div>
    <p class="admin-sidebar__label">Kendali arsip</p>
    <nav aria-label="Navigasi pengelola"><button v-for="item in items" :key="item.id" :class="{ active: active === item.id }" @click="emit('navigate', item.id)"><component :is="item.icon" :size="17" /><span>{{ item.label }}</span><i /></button></nav>
    <footer><a href="/" target="_self"><ExternalLink :size="16" /> Lihat website publik</a><button @click="emit('logout')"><LogOut :size="16" /> Keluar</button></footer>
  </aside>
</template>
