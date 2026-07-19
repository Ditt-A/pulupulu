<script setup lang="ts">
import { computed } from 'vue'
import { Menu, RefreshCw, ShieldCheck } from '@lucide/vue'
import type { AuthUser } from '@/types/auth'
import { formatApiDate } from '@/utils/date'

const props = defineProps<{ user: AuthUser; refreshing: boolean; generatedAt?: string }>()
const emit = defineEmits<{ menu: []; refresh: [] }>()
const initials = computed(() => props.user.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase())
const updatedLabel = computed(() => props.generatedAt
  ? `Diperbarui ${formatApiDate(props.generatedAt, { hour: '2-digit', minute: '2-digit' }, 'baru saja')}`
  : 'Menunggu pembaruan')
</script>

<template>
  <header class="admin-topbar">
    <button class="admin-topbar__menu" aria-label="Buka menu" @click="emit('menu')"><Menu :size="20" /></button>
    <div class="admin-topbar__title"><p>Ruang pengelola</p><span><ShieldCheck :size="12" /> Akses privat · MMD FILKOM 33</span></div>
    <button class="admin-topbar__refresh" :disabled="refreshing" @click="emit('refresh')"><RefreshCw :class="{ spinning: refreshing }" :size="15" /><span>{{ updatedLabel }}</span></button>
    <div class="admin-topbar__user"><span>{{ initials }}</span><div><strong>{{ user.name }}</strong><small>{{ user.role }}</small></div></div>
  </header>
</template>
