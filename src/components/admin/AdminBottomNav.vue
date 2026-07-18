<script setup lang="ts">
import { ChartNoAxesCombined, LayoutDashboard, LockKeyhole, UsersRound } from '@lucide/vue'
defineProps<{ active: string }>()
const emit = defineEmits<{ navigate: [section: string] }>()
const items = [{ id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard }, { id: 'anggota', label: 'Anggota', icon: UsersRound }, { id: 'monitoring', label: 'Progres', icon: ChartNoAxesCombined }, { id: 'akses', label: 'Akses', icon: LockKeyhole }]
</script>

<template><nav class="admin-bottom-nav" aria-label="Navigasi admin seluler"><button v-for="item in items" :key="item.id" :class="{ active: active === item.id }" @click="emit('navigate', item.id)"><component :is="item.icon" :size="19" /><span>{{ item.label }}</span></button></nav></template>
