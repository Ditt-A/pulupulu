<script setup lang="ts">
import { Quote } from '@lucide/vue'
defineProps<{ from: string; role: string; message: string; portrait: string }>()
</script>

<template>
  <article class="message-card">
    <Quote class="message-card__quote" :size="30" />
    <p>“{{ message }}”</p>
    <div><img :src="portrait" :alt="from" loading="lazy" /><span><strong>{{ from }}</strong><small>{{ role }}</small></span></div>
  </article>
</template>

