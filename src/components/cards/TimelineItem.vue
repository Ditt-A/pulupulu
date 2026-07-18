<script setup lang="ts">
defineProps<{ date: string; title: string; description: string; side?: 'left' | 'right'; image?: string }>()
</script>

<template>
  <article class="timeline-item" :class="`timeline-item--${side || 'left'}`">
    <div class="timeline-item__dot"><i /></div>
    <div class="timeline-item__card">
      <img v-if="image" :src="image" :alt="title" loading="lazy" />
      <div><span>{{ date }}</span><h3>{{ title }}</h3><p>{{ description }}</p></div>
    </div>
  </article>
</template>

