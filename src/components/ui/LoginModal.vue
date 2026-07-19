<script setup lang="ts">
import { LockKeyhole, Waves, X } from '@lucide/vue'
import { ref } from 'vue'
import AppButton from './AppButton.vue'
import AppField from './AppField.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; submit: [] }>()
const email = ref('')
const password = ref('')

function submit() {
  if (email.value && password.value) emit('submit')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="login-backdrop" @click.self="emit('close')">
        <form class="login-card" role="dialog" aria-modal="true" aria-label="Formulir login anggota" @submit.prevent="submit">
          <button type="button" class="login-card__close" aria-label="Tutup" @click="emit('close')"><X :size="19" /></button>
          <div class="login-card__brand"><span><Waves :size="22" /></span><b>PULUPULU</b></div>
          <p class="eyebrow"><span /> Ruang anggota</p>
          <h2>Masuk untuk membuka<br /><em>kenangan pribadimu.</em></h2>
          <p class="login-card__copy">Gunakan akun yang sudah dibuat oleh admin. Tidak tersedia pendaftaran publik.</p>
          <AppField id="login-email" v-model="email" type="email" label="Email anggota" placeholder="nama@email.com" />
          <AppField id="login-password" v-model="password" type="password" label="Kata sandi" placeholder="Masukkan kata sandi" />
          <div class="login-card__secure"><LockKeyhole :size="14" /> Akses khusus anggota MMD FILKOM 33</div>
          <AppButton type="submit" icon :disabled="!email || !password">Masuk ke ruang kenangan</AppButton>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>
