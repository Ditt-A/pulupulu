<script setup lang="ts">
import { LockKeyhole, Sparkles } from '@lucide/vue'
defineProps<{ recipient: string; open?: boolean }>()
const emit = defineEmits<{ open: [] }>()
</script>

<template>
  <button class="envelope-wrap" :class="{ 'is-open': open }" :aria-label="`Buka surat untuk ${recipient}`" @click="emit('open')">
    <div class="envelope">
      <div class="envelope__back" />
      <div class="envelope__letter"><Sparkles :size="19"/><span>Untuk {{ recipient }}</span><small>sebuah pesan kecil untuk dibawa pulang</small></div>
      <div class="envelope__flap" />
      <div class="envelope__front" />
      <span class="envelope__seal"><LockKeyhole :size="16" /></span>
    </div>
    <span class="envelope-wrap__hint">Ketuk untuk membuka</span>
  </button>
</template>

