<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LoaderCircle, LockKeyhole, Send, Trash2, Unlock, X } from '@lucide/vue'
import AppButton from './AppButton.vue'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  description?: string
  eyebrow?: string
  confirmLabel?: string
  cancelLabel?: string
  loadingLabel?: string
  tone?: 'default' | 'unlock' | 'lock' | 'danger'
  loading?: boolean
  confirmationPhrase?: string
}>(), {
  eyebrow: 'Sebelum dikirim',
  confirmLabel: 'Ya, kirim',
  cancelLabel: 'Periksa lagi',
  loadingLabel: 'Menyimpan…',
  tone: 'default',
  loading: false,
  confirmationPhrase: '',
})
const emit = defineEmits<{ close: []; confirm: [] }>()
const confirmationInput = ref('')
const modalIcon = computed(() => props.tone === 'unlock' ? Unlock : props.tone === 'lock' ? LockKeyhole : props.tone === 'danger' ? Trash2 : Send)
const phraseMatches = computed(() => !props.confirmationPhrase || confirmationInput.value.trim() === props.confirmationPhrase)

watch(() => props.open, () => { confirmationInput.value = '' })

function confirm() {
  if (!props.loading && phraseMatches.value) emit('confirm')
}
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
          <label v-if="confirmationPhrase" class="confirmation-phrase" for="destructive-confirmation">
            <span>Ketik <strong>{{ confirmationPhrase }}</strong> untuk melanjutkan.</span>
            <input id="destructive-confirmation" v-model="confirmationInput" type="text" autocomplete="off" :disabled="loading" :placeholder="confirmationPhrase" :aria-invalid="Boolean(confirmationInput) && !phraseMatches" @keydown.enter.prevent="confirm" />
            <small v-if="confirmationInput && !phraseMatches">Frasa konfirmasi belum cocok.</small>
          </label>
          <div class="mt-7 flex justify-center gap-3">
            <AppButton variant="secondary" :disabled="loading" @click="emit('close')">{{ cancelLabel }}</AppButton>
            <AppButton :disabled="loading || !phraseMatches" @click="confirm"><LoaderCircle v-if="loading" class="confirmation-spinner" :size="16" />{{ loading ? loadingLabel : confirmLabel }}</AppButton>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-card--danger .modal-card__icon {
  color: #a34235;
  background: #f8dfd8;
}

.modal-card--danger :deep(.app-button--primary) {
  background: #a34235;
  box-shadow: 0 13px 30px rgba(132, 48, 38, .18);
}

.modal-card--danger :deep(.app-button--primary:hover) { background: #87362d; }

.confirmation-phrase {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
  color: #7d6b66;
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
}

.confirmation-phrase strong {
  color: #87362d;
  letter-spacing: .04em;
}

.confirmation-phrase input {
  width: 100%;
  min-height: 44px;
  padding: 0 13px;
  color: #553d38;
  border: 1px solid rgba(163, 66, 53, .22);
  border-radius: 11px;
  outline: none;
  background: rgba(255, 255, 255, .82);
  font: 700 13px 'DM Sans', sans-serif;
  letter-spacing: .04em;
}

.confirmation-phrase input:focus {
  border-color: #a34235;
  box-shadow: 0 0 0 3px rgba(163, 66, 53, .1);
}

.confirmation-phrase input:disabled { opacity: .55; }
.confirmation-phrase small { color: #a34235; }
</style>
