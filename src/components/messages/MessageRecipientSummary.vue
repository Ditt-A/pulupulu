<script setup lang="ts">
import { ArrowRight, Check, LockKeyhole, MailPlus, RotateCcw } from '@lucide/vue'
import type { Member } from '@/data/members'
import type { MessageRecipientStatus } from '@/types/messages'

defineProps<{
  member: Member | null
  status?: MessageRecipientStatus
  confirmed?: boolean
}>()

const emit = defineEmits<{ confirm: []; clear: []; continue: [] }>()
</script>

<template>
  <aside class="recipient-summary" :class="{ 'recipient-summary--selected': member, 'recipient-summary--ready': confirmed }">
    <template v-if="member">
      <div class="recipient-summary__seal"><Check v-if="confirmed" :size="22" /><MailPlus v-else :size="22" /></div>
      <p>{{ confirmed ? 'Penerima siap' : 'Penerima pilihanmu' }}</p>
      <div class="recipient-summary__member">
        <img :src="member.portrait" :alt="member.name" />
        <span><strong>{{ member.name }}</strong><small>{{ member.role }}</small></span>
      </div>
      <blockquote>“Pesanmu akan menjadi ruang kecil yang hanya dapat dibuka oleh {{ member.name.split(' ')[0] }}.”</blockquote>
      <button v-if="!confirmed" class="recipient-summary__confirm" type="button" @click="emit('confirm')">
        Gunakan sebagai penerima <ArrowRight :size="16" />
      </button>
      <button v-else class="recipient-summary__confirm recipient-summary__confirm--ready" type="button" @click="emit('continue')">
        Lanjut menulis pesan <ArrowRight :size="16" />
      </button>
      <button class="recipient-summary__clear" type="button" @click="emit('clear')"><RotateCcw :size="13" /> {{ confirmed ? 'Ganti penerima' : 'Batalkan pilihan' }}</button>
    </template>

    <template v-else>
      <div class="recipient-summary__empty-icon"><MailPlus :size="24" /></div>
      <p>Belum ada penerima</p>
      <h2>Pilih satu teman untuk menerima pesanmu.</h2>
      <span>Klik salah satu kartu anggota. Kamu masih bisa mengganti pilihan sebelum melanjutkan.</span>
    </template>

    <footer><LockKeyhole :size="13" /> Pesan bersifat privat dan hanya dapat dibaca penerima.</footer>
  </aside>
</template>
