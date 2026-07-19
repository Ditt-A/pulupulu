<script setup lang="ts">
import { computed } from 'vue'
import { Mail, MailOpen } from '@lucide/vue'
import { members } from '@/data/members'
import type { OpenInboxSummary } from '@/types/messages'

const props = defineProps<{
  message: OpenInboxSummary
}>()

const emit = defineEmits<{ select: [message: OpenInboxSummary] }>()
const sender = computed(() => members.find((member) => member.id === props.message.sender.memberId))
const date = computed(() => {
  const raw = props.message.sentAt.includes('T') ? props.message.sentAt : `${props.message.sentAt.replace(' ', 'T')}Z`
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(raw))
})
</script>

<template>
  <button type="button" class="open-inbox-item" :class="{ 'open-inbox-item--unread': !message.isRead }" @click="emit('select', message)">
    <span class="open-inbox-item__portrait"><img :src="sender?.portrait || '/images/kkn-group-hero.png'" :alt="message.sender.name" /><i v-if="!message.isRead" /></span>
    <span class="open-inbox-item__copy">
      <span><strong>{{ message.sender.name }}</strong><time>{{ date }}</time></span>
      <b>{{ message.isRead ? 'Surat yang pernah kamu buka' : 'Sebuah amplop tertutup untukmu' }}</b>
      <small>{{ message.isRead ? 'Ketuk untuk membuka dan membacanya kembali.' : 'Isinya tetap tersegel sampai kamu mengetuk amplop.' }}</small>
    </span>
    <span class="open-inbox-item__state"><MailOpen v-if="message.isRead" :size="14" /><Mail v-else :size="14" />{{ message.isRead ? 'Pernah dibuka' : 'Amplop tertutup' }}</span>
  </button>
</template>
