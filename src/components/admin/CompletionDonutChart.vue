<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: number; completed: number; target: number }>()
const normalizedValue = computed(() => Math.max(0, Math.min(props.value, 100)))
</script>

<template>
  <div class="completion-donut-chart" role="img" :aria-label="`Progres pesan ${normalizedValue}%: ${completed} dari ${target} pasangan selesai`">
    <svg viewBox="0 0 140 140" aria-hidden="true">
      <circle class="completion-donut-chart__track" cx="70" cy="70" r="55" pathLength="100" />
      <circle class="completion-donut-chart__value" cx="70" cy="70" r="55" pathLength="100" :stroke-dasharray="`${normalizedValue} 100`" />
      <circle class="completion-donut-chart__foam" cx="70" cy="70" r="45" />
    </svg>
    <span><strong>{{ normalizedValue }}%</strong><small>selesai</small></span>
  </div>
</template>
