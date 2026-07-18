<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, Cloud, CloudCheck, LoaderCircle } from '@lucide/vue'
import type { MessageDraftState } from '@/types/messages'

const props = defineProps<{
  state: MessageDraftState
  lastSaved?: string
}>()

const meta = computed(() => {
  if (props.state === 'saving') return { icon: LoaderCircle, label: 'Menyimpan draf…' }
  if (props.state === 'pending') return { icon: Cloud, label: 'Perubahan belum disimpan' }
  if (props.state === 'saved') return { icon: CloudCheck, label: props.lastSaved ? `Tersimpan ${props.lastSaved}` : 'Draf tersimpan' }
  if (props.state === 'error') return { icon: AlertCircle, label: 'Draf gagal disimpan' }
  return { icon: Cloud, label: 'Mulai menulis untuk membuat draf' }
})
</script>

<template>
  <span class="composer-draft-state" :class="`composer-draft-state--${state}`" role="status" aria-live="polite">
    <component :is="meta.icon" :size="14" :class="{ spinning: state === 'saving' }" />
    {{ meta.label }}
  </span>
</template>

