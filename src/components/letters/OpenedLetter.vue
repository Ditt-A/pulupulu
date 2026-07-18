<script setup lang="ts">
defineProps<{ from: string; recipient: string; message: string }>()
</script>

<template>
  <article class="opened-letter">
    <span class="opened-letter__date">Pantai kita, Juli 2026</span>
    <h3>Untuk {{ recipient }},</h3>
    <p>{{ message }}</p>
    <div class="opened-letter__sign"><span>Sampai bertemu di cerita berikutnya,</span><strong>{{ from }}</strong></div>
  </article>
</template>

