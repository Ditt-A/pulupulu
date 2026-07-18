<script setup lang="ts">
import { CheckCheck, Search, SlidersHorizontal, X } from '@lucide/vue'
import type { InboxReadFilter, InboxSort } from '@/types/messages'

const props = defineProps<{
  search: string
  filter: InboxReadFilter
  sort: InboxSort
  total: number
  unread: number
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:filter': [value: InboxReadFilter]
  'update:sort': [value: InboxSort]
  'read-all': []
}>()

const tabs: { id: InboxReadFilter; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'unread', label: 'Belum dibaca' },
  { id: 'read', label: 'Sudah dibaca' },
]

function count(id: InboxReadFilter) {
  if (id === 'all') return props.total
  return id === 'unread' ? props.unread : props.total - props.unread
}

function inputSearch(event: Event) {
  emit('update:search', (event.target as HTMLInputElement).value)
}

function inputSort(event: Event) {
  emit('update:sort', (event.target as HTMLSelectElement).value as InboxSort)
}
</script>

<template>
  <div class="open-inbox-filters">
    <label class="open-inbox-search"><Search :size="16" /><input :value="search" type="search" placeholder="Cari pengirim atau isi surat…" @input="inputSearch" /><button v-if="search" type="button" aria-label="Hapus pencarian" @click="emit('update:search', '')"><X :size="14" /></button></label>
    <label class="open-inbox-sort"><SlidersHorizontal :size="14" /><select :value="sort" aria-label="Urutkan surat" @change="inputSort"><option value="newest">Terbaru</option><option value="oldest">Terlama</option></select></label>
    <div class="open-inbox-tabs"><button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: filter === tab.id }" @click="emit('update:filter', tab.id)">{{ tab.label }} <small>{{ count(tab.id) }}</small></button></div>
    <button v-if="unread" class="open-inbox-read-all" type="button" @click="emit('read-all')"><CheckCheck :size="14" /> Tandai semua dibaca</button>
  </div>
</template>

