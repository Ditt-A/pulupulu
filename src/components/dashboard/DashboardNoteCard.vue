<script setup lang="ts">
import { LockKeyhole, Quote } from '@lucide/vue'

defineProps<{ from: string; role: string; portrait: string; message: string; unread?: boolean }>()
</script>

<template>
  <article class="dash-note" :class="{ 'dash-note--unread': unread }">
    <div class="dash-note__top"><Quote :size="24" /><span v-if="unread">Baru</span><LockKeyhole v-else :size="14" /></div>
    <p>“{{ message }}”</p>
    <footer><img :src="portrait" :alt="from" /><span><strong>{{ from }}</strong><small>{{ role }}</small></span></footer>
  </article>
</template>

