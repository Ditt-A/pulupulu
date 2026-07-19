<script setup lang="ts">
import { computed } from 'vue'
import { LockOpen, MailOpen, Sparkles } from '@lucide/vue'
import { members } from '@/data/members'
import type { OpenInboxSummary } from '@/types/messages'

const props = defineProps<{
  message: OpenInboxSummary
  opening?: boolean
}>()

const emit = defineEmits<{ open: [] }>()
const sender = computed(() => members.find((member) => member.id === props.message.sender.memberId))
</script>

<template>
  <section class="focus-envelope-scene" :class="{ 'focus-envelope-scene--opening': opening }">
    <div class="focus-envelope-scene__light" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    <p><Sparkles :size="14" /> Sebuah surat telah menunggumu</p>
    <h1>Buka perlahan,<br /><em>ceritanya sudah siap.</em></h1>

    <div class="focus-envelope-scene__sender"><img :src="sender?.portrait || '/images/kkn-group-hero.png'" :alt="message.sender.name" /><span><small>Ditulis oleh</small><strong>{{ message.sender.name }}</strong><em>{{ message.sender.role }}</em></span></div>

    <button type="button" class="focus-envelope" :aria-busy="opening" :disabled="opening" @click="emit('open')">
      <span class="focus-envelope__shadow" />
      <span class="focus-envelope__back" />
      <span class="focus-envelope__letter"><MailOpen :size="21" /><small>Untukmu</small><strong>Surat yang masih tersegel</strong></span>
      <span class="focus-envelope__flap" />
      <span class="focus-envelope__front" />
      <span class="focus-envelope__seal"><LockOpen :size="20" /></span>
      <i /><i /><i /><i />
    </button>

    <button class="focus-envelope-scene__action" type="button" :disabled="opening" @click="emit('open')">
      <span>{{ opening ? 'Segel sedang terbuka…' : 'Buka surat sekarang' }}</span><MailOpen :size="16" />
    </button>
    <small>Tekan Enter atau ketuk amplop</small>
  </section>
</template>
