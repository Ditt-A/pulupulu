<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { LockKeyhole, Sparkles } from '@lucide/vue'
import { members } from '@/data/members'
import type { LockedInboxMessage } from '@/types/messages'

const props = defineProps<{
  message: LockedInboxMessage
  index: number
}>()

const emit = defineEmits<{ locked: [message: LockedInboxMessage] }>()
const denied = ref(false)
let deniedTimer = 0

const sender = computed(() => members.find((member) => member.id === props.message.sender.memberId))
const sentLabel = computed(() => {
  const raw = props.message.sentAt.includes('T') ? props.message.sentAt : `${props.message.sentAt.replace(' ', 'T')}Z`
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(raw))
})

function attemptOpen() {
  denied.value = false
  window.clearTimeout(deniedTimer)
  requestAnimationFrame(() => { denied.value = true })
  deniedTimer = window.setTimeout(() => { denied.value = false }, 720)
  emit('locked', props.message)
}

onBeforeUnmount(() => window.clearTimeout(deniedTimer))
</script>

<template>
  <button
    type="button"
    class="inbox-envelope"
    :class="{ 'inbox-envelope--denied': denied }"
    :style="{ '--envelope-index': index }"
    :aria-label="`Surat terkunci dari ${message.sender.name}`"
    @click="attemptOpen"
  >
    <span class="inbox-envelope__glow" />
    <span class="inbox-envelope__paper">
      <span class="inbox-envelope__back" />
      <span class="inbox-envelope__letter">
        <Sparkles :size="14" />
        <small>Untukmu</small>
        <strong>Sebuah cerita<br />masih beristirahat.</strong>
      </span>
      <span class="inbox-envelope__flap" />
      <span class="inbox-envelope__front" />
      <span class="inbox-envelope__seal"><LockKeyhole :size="16" /></span>
      <i /><i /><i />
    </span>

    <span class="inbox-envelope__meta">
      <span class="inbox-envelope__sender">
        <img :src="sender?.portrait || '/images/kkn-group-hero.png'" :alt="message.sender.name" />
        <span><small>Dikirim oleh</small><strong>{{ message.sender.name }}</strong><em>{{ message.sender.role }}</em></span>
      </span>
      <span class="inbox-envelope__status"><LockKeyhole :size="12" /> Tersegel</span>
    </span>
    <span class="inbox-envelope__date">{{ sentLabel }}</span>
    <span class="inbox-envelope__hint">Ketuk perlahan untuk memeriksa segel</span>
  </button>
</template>

