<script setup lang="ts">
defineProps<{ days: Array<{ day: string; label: string; total: number }>; maximum: number }>()
</script>

<template>
  <section class="admin-chart-card">
    <header><div><p>Irama tujuh hari</p><h2>Pesan yang berlayar</h2></div><span>7 hari terakhir</span></header>
    <div class="admin-chart" role="img" aria-label="Grafik pesan terkirim selama tujuh hari terakhir">
      <div v-for="item in days" :key="item.day" class="admin-chart__bar"><span><i :style="{ height: `${Math.max((item.total / maximum) * 100, item.total ? 8 : 2)}%` }" /><b v-if="item.total">{{ item.total }}</b></span><small>{{ item.label }}</small></div>
    </div>
    <footer>Batang hanya menghitung pesan yang benar-benar sudah dikirim, bukan draf.</footer>
  </section>
</template>
