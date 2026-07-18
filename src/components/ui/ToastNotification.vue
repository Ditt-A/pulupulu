<script setup lang="ts">
import { Check, X } from '@lucide/vue'
defineProps<{ show: boolean; title: string; message: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="show" class="toast" role="status">
        <span class="toast__icon"><Check :size="17" /></span>
        <span><strong>{{ title }}</strong><small>{{ message }}</small></span>
        <button aria-label="Tutup notifikasi" @click="emit('close')"><X :size="16" /></button>
      </div>
    </Transition>
  </Teleport>
</template>

