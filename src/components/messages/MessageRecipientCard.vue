<script setup lang="ts">
import { Check, FilePenLine, MailCheck, Send } from '@lucide/vue'
import type { Member } from '@/data/members'
import type { MessageRecipientStatus } from '@/types/messages'

defineProps<{
  member: Member
  division: string
  status: MessageRecipientStatus
  selected?: boolean
}>()

const emit = defineEmits<{ select: [member: Member] }>()

const statusMeta = {
  available: { label: 'Belum dikirimi', icon: Send },
  draft: { label: 'Draf tersimpan', icon: FilePenLine },
  sent: { label: 'Sudah dikirimi', icon: MailCheck },
}
</script>

<template>
  <button
    type="button"
    class="recipient-card"
    :class="[`recipient-card--${status}`, { 'recipient-card--selected': selected }]"
    :aria-pressed="selected"
    :aria-label="`Pilih ${member.name} sebagai penerima`"
    @click="emit('select', member)"
  >
    <span class="recipient-card__portrait">
      <img :src="member.portrait" :alt="member.name" />
      <i v-if="selected"><Check :size="15" stroke-width="2.6" /></i>
      <svg viewBox="0 0 160 42" preserveAspectRatio="none" aria-hidden="true"><path d="M-8 23 C27 3 53 41 86 20 S133 9 170 27" /></svg>
    </span>

    <span class="recipient-card__copy">
      <span class="recipient-card__eyebrow">{{ division }}</span>
      <strong>{{ member.name }}</strong>
      <small>{{ member.role }}</small>
      <q>{{ member.memory }}</q>
    </span>

    <span class="recipient-card__footer">
      <span :class="`message-status message-status--${status}`">
        <component :is="statusMeta[status].icon" :size="13" />
        {{ statusMeta[status].label }}
      </span>
      <b>{{ selected ? 'Dipilih' : status === 'draft' ? 'Lanjutkan' : status === 'sent' ? 'Kirim lagi' : 'Pilih' }}</b>
    </span>
  </button>
</template>

