<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'

withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost'
  type?: 'button' | 'submit'
  icon?: boolean
}>(), { variant: 'primary', type: 'button', icon: false })
</script>

<template>
  <button :type="type" class="app-button" :class="`app-button--${variant}`">
    <span><slot /></span>
    <ArrowRight v-if="icon" :size="17" :stroke-width="1.8" aria-hidden="true" />
  </button>
</template>

