<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, MailOpen, Maximize2, Reply, Waves, X } from '@lucide/vue'
import { members } from '@/data/members'
import type { OpenInboxMessage } from '@/types/messages'

const props = defineProps<{
  message: OpenInboxMessage
  recipientName: string
}>()

const emit = defineEmits<{ close: []; reply: [message: OpenInboxMessage]; focus: [message: OpenInboxMessage] }>()
const sender = computed(() => members.find((member) => member.id === props.message.sender.memberId))
const sentLabel = computed(() => {
  const raw = props.message.sentAt.includes('T') ? props.message.sentAt : `${props.message.sentAt.replace(' ', 'T')}Z`
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(raw))
})
</script>

<template>
  <article class="opened-private-letter">
    <button class="opened-private-letter__close" type="button" aria-label="Tutup surat" @click="emit('close')"><X :size="18" /></button>
    <header>
      <span><MailOpen :size="15" /> Surat telah dibuka</span>
      <time>{{ sentLabel }}</time>
    </header>
    <div class="opened-private-letter__sender"><img :src="sender?.portrait || '/images/kkn-group-hero.png'" :alt="message.sender.name" /><span><small>Ditulis oleh</small><strong>{{ message.sender.name }}</strong><em>{{ message.sender.role }}</em></span></div>
    <div class="opened-private-letter__paper">
      <span>Kepada,</span>
      <h2>{{ recipientName }}</h2>
      <h3>{{ message.title || 'Sebuah catatan kecil untukmu' }}</h3>
      <p>{{ message.body }}</p>
      <blockquote v-if="message.closing">{{ message.closing }}</blockquote>
      <footer><span>Dari teman seperjalananmu,</span><strong>{{ message.sender.name }}</strong></footer>
      <Waves :size="24" />
    </div>
    <div class="opened-private-letter__buttons">
      <button class="opened-private-letter__focus" type="button" @click="emit('focus', message)"><Maximize2 :size="14" /> Mode baca fokus</button>
      <button class="opened-private-letter__reply" type="button" @click="emit('reply', message)"><Reply :size="15" /> Balas surat ini <ArrowRight :size="15" /></button>
    </div>
  </article>
</template>
