<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck, X } from '@lucide/vue'
import type { PasswordChangePayload } from '@/types/auth'

const props = withDefaults(defineProps<{
  username: string
  loading?: boolean
  serverError?: string
  resetKey?: number
}>(), {
  loading: false,
  serverError: '',
  resetKey: 0,
})

const emit = defineEmits<{
  submit: [payload: PasswordChangePayload]
  'clear-error': []
}>()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
const submitted = ref(false)

const usernameParts = computed(() => props.username.toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length >= 3))
const rules = computed(() => [
  { label: 'Minimal 10 karakter', pass: newPassword.value.length >= 10 },
  { label: 'Huruf besar dan kecil', pass: /[a-z]/.test(newPassword.value) && /[A-Z]/.test(newPassword.value) },
  { label: 'Sedikitnya satu angka', pass: /\d/.test(newPassword.value) },
  { label: 'Sedikitnya satu simbol', pass: /[^A-Za-z0-9]/.test(newPassword.value) },
  { label: 'Tidak memuat username', pass: Boolean(newPassword.value) && !usernameParts.value.some((part) => newPassword.value.toLowerCase().includes(part)) },
])
const strength = computed(() => Math.round((rules.value.filter((rule) => rule.pass).length / rules.value.length) * 100))
const strengthLabel = computed(() => {
  if (!newPassword.value) return 'Belum dinilai'
  if (strength.value <= 40) return 'Lemah'
  if (strength.value <= 60) return 'Cukup'
  if (strength.value < 100) return 'Kuat'
  return 'Sangat kuat'
})

const currentError = computed(() => submitted.value && !currentPassword.value ? 'Masukkan kata sandi yang sedang dipakai.' : '')
const newError = computed(() => {
  if (!submitted.value) return ''
  if (!newPassword.value) return 'Masukkan kata sandi baru.'
  if (newPassword.value.length > 128) return 'Maksimal 128 karakter.'
  if (rules.value.some((rule) => !rule.pass)) return 'Penuhi seluruh ketentuan kata sandi.'
  if (newPassword.value === currentPassword.value) return 'Kata sandi baru harus berbeda.'
  return ''
})
const confirmError = computed(() => {
  if (!submitted.value) return ''
  if (!confirmPassword.value) return 'Ulangi kata sandi baru.'
  if (confirmPassword.value !== newPassword.value) return 'Konfirmasi kata sandi belum sama.'
  return ''
})
const isValid = computed(() => Boolean(
  currentPassword.value
  && newPassword.value
  && newPassword.value.length <= 128
  && rules.value.every((rule) => rule.pass)
  && newPassword.value !== currentPassword.value
  && confirmPassword.value === newPassword.value,
))

function handleInput() {
  if (props.serverError) emit('clear-error')
}

function submit() {
  submitted.value = true
  if (!isValid.value || props.loading) return
  emit('submit', {
    currentPassword: currentPassword.value,
    newPassword: newPassword.value,
    confirmPassword: confirmPassword.value,
  })
}

watch(() => props.resetKey, () => {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  submitted.value = false
  showCurrent.value = false
  showNew.value = false
  showConfirm.value = false
})
</script>

<template>
  <form class="password-form" novalidate @submit.prevent="submit">
    <header class="password-form__head">
      <span><KeyRound :size="20" /></span>
      <div><p>Keamanan akun</p><h2>Ganti kata sandi</h2><small>Gunakan kata sandi yang hanya kamu kenal dan belum pernah dipakai di tempat lain.</small></div>
    </header>

    <div v-if="serverError" class="password-form__server-error" role="alert"><X :size="16" /> {{ serverError }}</div>

    <label class="password-field" :class="{ 'password-field--error': currentError }">
      <span>Kata sandi saat ini</span>
      <div>
        <KeyRound :size="16" />
        <input v-model="currentPassword" :type="showCurrent ? 'text' : 'password'" autocomplete="current-password" placeholder="Masukkan kata sandi saat ini" maxlength="128" @input="handleInput" />
        <button type="button" :aria-label="showCurrent ? 'Sembunyikan kata sandi saat ini' : 'Tampilkan kata sandi saat ini'" @click="showCurrent = !showCurrent"><EyeOff v-if="showCurrent" :size="17" /><Eye v-else :size="17" /></button>
      </div>
      <small v-if="currentError">{{ currentError }}</small>
    </label>

    <div class="password-form__new-grid">
      <label class="password-field" :class="{ 'password-field--error': newError }">
        <span>Kata sandi baru</span>
        <div>
          <ShieldCheck :size="16" />
          <input v-model="newPassword" :type="showNew ? 'text' : 'password'" autocomplete="new-password" placeholder="Buat kata sandi baru" maxlength="128" @input="handleInput" />
          <button type="button" :aria-label="showNew ? 'Sembunyikan kata sandi baru' : 'Tampilkan kata sandi baru'" @click="showNew = !showNew"><EyeOff v-if="showNew" :size="17" /><Eye v-else :size="17" /></button>
        </div>
        <small v-if="newError">{{ newError }}</small>
      </label>

      <label class="password-field" :class="{ 'password-field--error': confirmError }">
        <span>Ulangi kata sandi baru</span>
        <div>
          <ShieldCheck :size="16" />
          <input v-model="confirmPassword" :type="showConfirm ? 'text' : 'password'" autocomplete="new-password" placeholder="Ketik ulang kata sandi baru" maxlength="128" @input="handleInput" />
          <button type="button" :aria-label="showConfirm ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'" @click="showConfirm = !showConfirm"><EyeOff v-if="showConfirm" :size="17" /><Eye v-else :size="17" /></button>
        </div>
        <small v-if="confirmError">{{ confirmError }}</small>
      </label>
    </div>

    <section class="password-strength" :class="`password-strength--${strength}`">
      <div class="password-strength__title"><span>Kekuatan kata sandi</span><strong>{{ strengthLabel }}</strong></div>
      <div class="password-strength__track" aria-hidden="true"><i :style="{ width: `${strength}%` }" /></div>
      <div class="password-strength__rules">
        <span v-for="rule in rules" :key="rule.label" :class="{ pass: rule.pass }"><Check v-if="rule.pass" :size="13" /><X v-else :size="13" /> {{ rule.label }}</span>
      </div>
    </section>

    <footer class="password-form__footer">
      <p><ShieldCheck :size="15" /><span><strong>Sesi lain akan dikeluarkan.</strong> Perangkat ini tetap masuk setelah kata sandi diperbarui.</span></p>
      <button type="submit" :disabled="loading"><LoaderCircle v-if="loading" class="spin" :size="16" /><ShieldCheck v-else :size="16" />{{ loading ? 'Menyimpan…' : 'Perbarui kata sandi' }}</button>
    </footer>
  </form>
</template>
