<script setup lang="ts">
import { computed } from 'vue'
import type { MessageCompletionMember, MessageCompletionOverview } from '@/types/admin'

const props = defineProps<{ members: MessageCompletionMember[]; pairs: MessageCompletionOverview['pairs'] }>()
const pairMap = computed(() => new Map(props.pairs.map((pair) => [`${pair.senderMemberId}:${pair.recipientMemberId}`, pair])))
function initials(name: string) { return name.split(' ').filter((part) => /[A-Za-z]/.test(part)).slice(0, 2).map((part) => part[0]).join('').toUpperCase() }
function pairFor(senderId: number, recipientId: number) { return pairMap.value.get(`${senderId}:${recipientId}`) }
</script>

<template>
  <section class="completion-matrix-card">
    <header><div><p>Peta hubungan</p><h2>Matriks perjalanan surat</h2></div><div><span><i class="sent" /> Terkirim</span><span><i class="read" /> Dibaca</span><span><i class="empty" /> Belum</span></div></header>
    <div class="completion-matrix-scroll">
      <div class="completion-matrix" :style="{ '--matrix-columns': members.length + 1 }">
        <span class="completion-matrix__corner">Dari<br/>ke</span>
        <span v-for="recipient in members" :key="`recipient-${recipient.memberId}`" class="completion-matrix__head" :title="recipient.name">{{ initials(recipient.name) }}</span>
        <template v-for="sender in members" :key="`sender-${sender.memberId}`">
          <span class="completion-matrix__side" :title="sender.name">{{ initials(sender.name) }}</span>
          <span v-for="recipient in members" :key="`${sender.memberId}-${recipient.memberId}`" class="completion-matrix__cell" :class="{ self: sender.memberId === recipient.memberId, sent: pairFor(sender.memberId, recipient.memberId) && !pairFor(sender.memberId, recipient.memberId)?.isRead, read: pairFor(sender.memberId, recipient.memberId)?.isRead }" :title="sender.memberId === recipient.memberId ? `${sender.name} tidak mengirim kepada diri sendiri` : pairFor(sender.memberId, recipient.memberId) ? `${sender.name} → ${recipient.name}: ${pairFor(sender.memberId, recipient.memberId)?.isRead ? 'sudah dibaca' : 'terkirim'}` : `${sender.name} → ${recipient.name}: belum ada surat`"><i /></span>
        </template>
      </div>
    </div>
    <footer>Baris menunjukkan pengirim, kolom menunjukkan penerima. Isi surat tidak pernah ditampilkan.</footer>
  </section>
</template>
