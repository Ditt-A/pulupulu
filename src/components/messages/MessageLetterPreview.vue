<script setup lang="ts">
import { Eye, LockKeyhole, Waves } from '@lucide/vue'
import type { Member } from '@/data/members'

defineProps<{
  recipient: Member
  senderName: string
  title: string
  body: string
  closing: string
}>()
</script>

<template>
  <aside class="composer-preview">
    <header><Eye :size="15" /><span>Pratinjau surat</span><small>Langsung diperbarui</small></header>
    <div class="composer-preview__letter">
      <div class="composer-preview__recipient"><img :src="recipient.portrait" :alt="recipient.name" /><span><small>Untuk</small><strong>{{ recipient.name }}</strong></span></div>
      <p class="composer-preview__title">{{ title || 'Sebuah catatan kecil untukmu' }}</p>
      <blockquote :class="{ empty: !body }">{{ body || 'Pesanmu akan terlihat di sini saat kamu mulai menulis…' }}</blockquote>
      <p v-if="closing" class="composer-preview__closing">{{ closing }}</p>
      <footer><span>Dari,</span><strong>{{ senderName }}</strong></footer>
      <Waves :size="21" />
    </div>
    <p class="composer-preview__privacy"><LockKeyhole :size="13" /> Setelah dikirim, isi surat hanya dapat dibuka oleh {{ recipient.name.split(' ')[0] }}.</p>
  </aside>
</template>

