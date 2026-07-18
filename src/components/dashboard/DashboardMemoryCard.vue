<script setup lang="ts">
import { ArrowUpRight, CalendarDays, MapPin } from '@lucide/vue'

withDefaults(defineProps<{
  image: string
  title: string
  date: string
  location: string
  caption?: string
  shape?: 'landscape' | 'portrait' | 'square'
}>(), { shape: 'landscape', caption: '' })
</script>

<template>
  <article class="dash-memory" :class="`dash-memory--${shape}`">
    <img :src="image" :alt="title" loading="lazy" />
    <div class="dash-memory__overlay" />
    <button :aria-label="`Buka ${title}`"><ArrowUpRight :size="17" /></button>
    <div class="dash-memory__content">
      <span><CalendarDays :size="12" /> {{ date }} <i>·</i> <MapPin :size="12" /> {{ location }}</span>
      <h3>{{ title }}</h3>
      <p v-if="caption">{{ caption }}</p>
    </div>
  </article>
</template>

