<script setup lang="ts">
withDefaults(defineProps<{ value: number; label?: string; showValue?: boolean }>(), { showValue: true })
</script>

<template>
  <div class="progress">
    <div v-if="label || showValue" class="progress__meta">
      <span>{{ label }}</span><span v-if="showValue">{{ value }}%</span>
    </div>
    <div class="progress__track"><span class="progress__fill" :style="{ width: `${value}%` }" /></div>
  </div>
</template>

