<script setup lang="ts">
import { ref, watch } from 'vue'
import { Check, Copy, KeyRound, ShieldAlert, X } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'

const props = defineProps<{ open: boolean; memberName: string; username: string; password: string }>()
const emit = defineEmits<{ close: [] }>()
const copied = ref(false)

async function copyPassword() {
  await navigator.clipboard.writeText(props.password)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 2200)
}
watch(() => props.open, () => { copied.value = false })
</script>

<template>
  <Teleport to="body"><Transition name="modal"><div v-if="open" class="modal-backdrop"><section class="temporary-password-modal" role="dialog" aria-modal="true" aria-label="Kata sandi sementara"><button class="temporary-password-modal__close" aria-label="Tutup" @click="emit('close')"><X :size="18" /></button><span class="temporary-password-modal__icon"><KeyRound :size="25" /></span><p>Kata sandi berhasil direset</p><h2>Sampaikan dengan aman<br />kepada {{ memberName.split(' ')[0] }}.</h2><div class="temporary-password-modal__credential"><span><small>Username</small><strong>{{ username }}</strong></span><i /><span><small>Password sementara</small><strong>{{ password }}</strong></span><button :class="{ copied }" @click="copyPassword"><Check v-if="copied" :size="16" /><Copy v-else :size="16" />{{ copied ? 'Tersalin' : 'Salin' }}</button></div><aside><ShieldAlert :size="17" /><span><strong>Password ini hanya ditampilkan sekali.</strong>Anggota wajib menggantinya setelah masuk. Jangan mengirim melalui grup publik.</span></aside><AppButton @click="emit('close')">Saya sudah menyimpannya</AppButton></section></div></Transition></Teleport>
</template>
