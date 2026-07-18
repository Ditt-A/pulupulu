<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'success' | 'warning' | 'info' | 'neutral' }>(), { tone: 'info' })
</script>

<template><span class="status-badge" :class="`status-badge--${tone}`"><i /> <slot /></span></template>

