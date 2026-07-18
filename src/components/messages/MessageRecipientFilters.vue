<script setup lang="ts">
import { Search, SlidersHorizontal, X } from '@lucide/vue'
import type { MessageRecipientStatus, MessageStatusFilter } from '@/types/messages'

const props = defineProps<{
  search: string
  division: string
  status: MessageStatusFilter
  divisions: string[]
  counts: Record<MessageRecipientStatus, number>
  hasFilters: boolean
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:division': [value: string]
  'update:status': [value: MessageStatusFilter]
  clear: []
}>()

const statusOptions: { id: MessageStatusFilter; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'available', label: 'Belum dikirimi' },
  { id: 'draft', label: 'Ada draf' },
  { id: 'sent', label: 'Sudah dikirimi' },
]

function updateSearch(event: Event) {
  emit('update:search', (event.target as HTMLInputElement).value)
}

function updateDivision(event: Event) {
  emit('update:division', (event.target as HTMLSelectElement).value)
}

function countFor(status: MessageStatusFilter) {
  if (status === 'all') return props.counts.available + props.counts.draft + props.counts.sent
  return props.counts[status]
}
</script>

<template>
  <div class="recipient-filters">
    <div class="recipient-filters__primary">
      <label class="recipient-search">
        <Search :size="18" />
        <input :value="search" type="search" placeholder="Cari nama atau peran anggota…" aria-label="Cari anggota" @input="updateSearch" />
        <button v-if="search" type="button" aria-label="Hapus pencarian" @click="emit('update:search', '')"><X :size="15" /></button>
      </label>

      <label class="recipient-division">
        <SlidersHorizontal :size="16" />
        <span>Divisi</span>
        <select :value="division" aria-label="Filter divisi" @change="updateDivision">
          <option value="all">Semua divisi</option>
          <option v-for="item in divisions" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
    </div>

    <div class="recipient-filters__status" aria-label="Filter status pesan">
      <span>Status surat</span>
      <div>
        <button
          v-for="item in statusOptions"
          :key="item.id"
          type="button"
          :class="{ active: status === item.id }"
          @click="emit('update:status', item.id)"
        >
          {{ item.label }} <small>{{ countFor(item.id) }}</small>
        </button>
      </div>
      <button v-if="hasFilters" class="recipient-filters__clear" type="button" @click="emit('clear')"><X :size="13" /> Bersihkan</button>
    </div>
  </div>
</template>

