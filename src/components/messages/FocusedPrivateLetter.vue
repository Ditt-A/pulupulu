<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, Reply, ShieldCheck, Waves } from '@lucide/vue'
import { members } from '@/data/members'
import type { OpenInboxMessage } from '@/types/messages'

const props = defineProps<{
  message: OpenInboxMessage
  recipientName: string
}>()

const emit = defineEmits<{ back: []; reply: [] }>()
const sender = computed(() => members.find((member) => member.id === props.message.sender.memberId))
const date = computed(() => {
  const raw = props.message.sentAt.includes('T') ? props.message.sentAt : `${props.message.sentAt.replace(' ', 'T')}Z`
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(raw))
})
</script>

<template>
  <article class="focused-letter">
    <header class="focused-letter__toolbar">
      <button type="button" @click="emit('back')"><ArrowLeft :size="15" /> Kembali ke inbox</button>
      <span><ShieldCheck :size="14" /> Hanya kamu yang dapat membaca</span>
      <time>{{ date }}</time>
    </header>

    <div class="focused-letter__paper">
      <div class="focused-letter__sender" style="--line-delay: 80ms"><img :src="sender?.portrait || '/images/kkn-group-hero.png'" :alt="message.sender.name" /><span><small>Surat dari</small><strong>{{ message.sender.name }}</strong><em>{{ message.sender.role }}</em></span></div>
      <div class="focused-letter__salutation" style="--line-delay: 170ms"><span>Kepada,</span><h2>{{ recipientName }}</h2></div>
      <h3 style="--line-delay: 270ms">{{ message.title || 'Sebuah catatan kecil untukmu' }}</h3>
      <p style="--line-delay: 380ms">{{ message.body }}</p>
      <blockquote v-if="message.closing" style="--line-delay: 500ms">{{ message.closing }}</blockquote>
      <footer style="--line-delay: 590ms"><span>Dari teman seperjalananmu,</span><strong>{{ message.sender.name }}</strong></footer>
      <Waves :size="27" />
    </div>

    <div class="focused-letter__actions"><p>Simpan kata-kata ini, lalu balas ketika kamu siap.</p><button type="button" @click="emit('reply')"><Reply :size="15" /> Balas {{ message.sender.name.split(' ')[0] }}</button></div>
  </article>
</template>

