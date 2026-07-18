<script setup lang="ts">
import { Footprints, Home, Images, UsersRound } from '@lucide/vue'
const items = [{ label: 'Beranda', href: '#beranda', icon: Home }, { label: 'Galeri', href: '#galeri', icon: Images }, { label: 'Perjalanan', href: '#perjalanan', icon: Footprints }, { label: 'Anggota', href: '#anggota', icon: UsersRound }]
</script>
<template><nav class="mobile-bottom" aria-label="Navigasi seluler"><a v-for="(item, index) in items" :key="item.href" :href="item.href" :class="{ active: index === 0 }"><component :is="item.icon" :size="20"/><span>{{ item.label }}</span></a></nav></template>
