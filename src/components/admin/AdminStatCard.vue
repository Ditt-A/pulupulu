<script setup lang="ts">
import type { Component } from 'vue'
withDefaults(defineProps<{ label: string; value: string | number; note: string; icon: Component; tone?: 'blue' | 'teal' | 'sand' | 'navy'; progress?: number }>(), { tone: 'blue', progress: undefined })
</script>

<template>
  <article class="admin-stat-card" :class="`admin-stat-card--${tone}`">
    <div><span><component :is="icon" :size="19" /></span><small>{{ label }}</small></div>
    <strong>{{ value }}</strong>
    <p>{{ note }}</p>
    <div v-if="progress !== undefined" class="admin-stat-card__progress"><i :style="{ width: `${Math.min(progress, 100)}%` }" /></div>
  </article>
</template>
