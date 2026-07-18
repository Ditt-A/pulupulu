<script setup lang="ts">
import { Image as ImageIcon, MapPin } from '@lucide/vue'
defineProps<{ image: string; title: string; date: string; location?: string; caption?: string; count?: number; size?: 'wide' | 'tall' | 'normal' | 'polaroid' }>()
</script>

<template>
  <article class="gallery-card" :class="`gallery-card--${size || 'normal'}`">
    <img :src="image" :alt="title" loading="lazy" />
    <div class="gallery-card__overlay" />
    <div class="gallery-card__meta">
      <span>{{ date }} <template v-if="location"><i>·</i> <MapPin :size="11" /> {{ location }}</template></span>
      <h3>{{ title }}</h3>
      <p v-if="caption">{{ caption }}</p>
    </div>
    <span v-if="count" class="gallery-card__count"><ImageIcon :size="14" /> {{ count }}</span>
  </article>
</template>
