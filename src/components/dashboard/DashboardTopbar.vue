<script setup lang="ts">
import { Bell, Menu, Search } from '@lucide/vue'
import type { AuthUser } from '@/types/auth'

defineProps<{ user: AuthUser; portrait: string }>()
const emit = defineEmits<{ menu: [] }>()
</script>

<template>
  <header class="dash-topbar">
    <button class="dash-topbar__menu" aria-label="Buka menu" @click="emit('menu')"><Menu :size="21" /></button>
    <div class="dash-topbar__title"><p>Ruang anggota</p><span>Desa Sumbersih · MMD FILKOM 33</span></div>
    <label class="dash-topbar__search"><Search :size="16" /><input aria-label="Cari kenangan" placeholder="Cari kenangan…" /></label>
    <button class="dash-topbar__notification" aria-label="Notifikasi"><Bell :size="18" /><i /></button>
    <div class="dash-topbar__member"><img :src="portrait" :alt="user.name" /><span><strong>{{ user.name }}</strong><small>{{ user.role }}</small></span></div>
  </header>
</template>
