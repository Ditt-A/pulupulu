<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CalendarDays, LockKeyhole, Sparkles } from '@lucide/vue'

const props = defineProps<{
  releaseAt: string
  messageCount: number
}>()

const now = ref(Date.now())
let clock = 0

const remaining = computed(() => Math.max(0, Date.parse(props.releaseAt) - now.value))
const units = computed(() => {
  let seconds = Math.floor(remaining.value / 1000)
  const days = Math.floor(seconds / 86400)
  seconds -= days * 86400
  const hours = Math.floor(seconds / 3600)
  seconds -= hours * 3600
  const minutes = Math.floor(seconds / 60)
  seconds -= minutes * 60
  return [
    { value: days, label: 'hari' },
    { value: hours, label: 'jam' },
    { value: minutes, label: 'menit' },
    { value: seconds, label: 'detik' },
  ]
})

const progress = computed(() => {
  const start = Date.parse('2026-07-12T08:00:00+07:00')
  const end = Date.parse(props.releaseAt)
  return Math.max(4, Math.min(100, ((now.value - start) / (end - start)) * 100))
})

const releaseLabel = computed(() => new Intl.DateTimeFormat('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
}).format(new Date(props.releaseAt)))

onMounted(() => { clock = window.setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => window.clearInterval(clock))
</script>

<template>
  <section class="inbox-unlock-panel">
    <div class="inbox-unlock-panel__lock">
      <span><LockKeyhole :size="27" /></span>
      <i /><i /><i />
    </div>
    <div class="inbox-unlock-panel__copy">
      <p><Sparkles :size="13" /> Waktu buka bersama</p>
      <h2>Semua surat akan terbuka<br /><em>pada malam perpisahan.</em></h2>
      <span><CalendarDays :size="13" /> {{ releaseLabel }} WIB</span>
    </div>
    <div class="inbox-unlock-panel__countdown" aria-label="Hitung mundur pembukaan surat">
      <span v-for="unit in units" :key="unit.label"><strong>{{ String(unit.value).padStart(2, '0') }}</strong><small>{{ unit.label }}</small></span>
    </div>
    <div class="inbox-unlock-panel__progress"><span :style="{ width: `${progress}%` }" /><i :style="{ left: `${progress}%` }" /></div>
    <footer><span>{{ messageCount }} surat menunggumu dengan tenang.</span><small>{{ Math.round(progress) }}% menuju malam pembukaan</small></footer>
  </section>
</template>

