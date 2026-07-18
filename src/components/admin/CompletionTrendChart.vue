<script setup lang="ts">
import { computed } from 'vue'

interface TrendPoint { day: string; label: string; total: number }
const props = defineProps<{ points: TrendPoint[] }>()
const width = 760
const height = 220
const paddingX = 36
const paddingTop = 20
const paddingBottom = 36
const maximum = computed(() => Math.max(...props.points.map((point) => point.total), 1))
const coordinates = computed(() => props.points.map((point, index) => {
  const usableWidth = width - paddingX * 2
  const usableHeight = height - paddingTop - paddingBottom
  return {
    ...point,
    x: props.points.length > 1 ? paddingX + (index / (props.points.length - 1)) * usableWidth : width / 2,
    y: paddingTop + usableHeight - (point.total / maximum.value) * usableHeight,
  }
}))
const linePath = computed(() => coordinates.value.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' '))
const areaPath = computed(() => {
  if (!coordinates.value.length) return ''
  const bottom = height - paddingBottom
  return `${linePath.value} L ${coordinates.value.at(-1)!.x.toFixed(1)} ${bottom} L ${coordinates.value[0]!.x.toFixed(1)} ${bottom} Z`
})
const labelStep = computed(() => Math.max(1, Math.ceil(props.points.length / 6)))
</script>

<template>
  <div class="completion-trend-chart" role="img" aria-label="Grafik tren pasangan pesan yang selesai">
    <svg :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="completion-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#32a3a1" stop-opacity=".32"/><stop offset="1" stop-color="#32a3a1" stop-opacity=".015"/></linearGradient></defs>
      <g class="completion-trend-chart__grid"><line v-for="level in 5" :key="level" :x1="paddingX" :x2="width - paddingX" :y1="paddingTop + ((level - 1) / 4) * (height - paddingTop - paddingBottom)" :y2="paddingTop + ((level - 1) / 4) * (height - paddingTop - paddingBottom)" /></g>
      <path v-if="coordinates.length" class="completion-trend-chart__area" :d="areaPath" />
      <path v-if="coordinates.length" class="completion-trend-chart__line" :d="linePath" />
      <g v-for="(point, index) in coordinates" :key="point.day" class="completion-trend-chart__point">
        <circle :cx="point.x" :cy="point.y" r="4"><title>{{ point.label }}: {{ point.total }} pasangan</title></circle>
        <text v-if="point.total" :x="point.x" :y="point.y - 11" text-anchor="middle">{{ point.total }}</text>
        <text v-if="index % labelStep === 0 || index === coordinates.length - 1" class="completion-trend-chart__label" :x="point.x" :y="height - 12" text-anchor="middle">{{ point.label }}</text>
      </g>
    </svg>
  </div>
</template>
