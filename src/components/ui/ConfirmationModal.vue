<script setup lang="ts">
import { computed } from 'vue'
import { LoaderCircle, LockKeyhole, Send, Unlock, X } from '@lucide/vue'
import AppButton from './AppButton.vue'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  description?: string
  eyebrow?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'unlock' | 'lock'
  loading?: boolean
}>(), {
  eyebrow: 'Sebelum dikirim',
  confirmLabel: 'Ya, kirim',
  cancelLabel: 'Periksa lagi',
  tone: 'default',
  loading: false,
})
const emit = defineEmits<{ close: []; confirm: [] }>()
const modalIcon = computed(() => props.tone === 'unlock' ? Unlock : props.tone === 'lock' ? LockKeyhole : Send)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-backdrop" role="presentation" @click.self="!loading && emit('close')">
        <section class="modal-card" :class="`modal-card--${tone}`" role="dialog" aria-modal="true" :aria-label="title || 'Konfirmasi'">
          <button class="modal-card__close" :disabled="loading" aria-label="Tutup" @click="emit('close')"><X :size="19" /></button>
          <span class="modal-card__icon"><component :is="modalIcon" :size="25" /></span>
          <p class="eyebrow text-ocean-600">{{ eyebrow }}</p>
          <h3>{{ title || 'Kirim pesan ini?' }}</h3>
          <p>{{ description || 'Pesan akan tersimpan dan hanya dapat dibuka oleh penerimanya.' }}</p>
          <div class="mt-7 flex justify-center gap-3">
            <AppButton variant="secondary" :disabled="loading" @click="emit('close')">{{ cancelLabel }}</AppButton>
            <AppButton :disabled="loading" @click="emit('confirm')"><LoaderCircle v-if="loading" class="confirmation-spinner" :size="16" />{{ loading ? 'Menyimpan…' : confirmLabel }}</AppButton>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
