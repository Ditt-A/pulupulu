<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck, UserRound, Waves } from '@lucide/vue'

interface AuthUser {
  username: string
  name: string
  role: string
  accountType: 'member' | 'admin'
  mustChangePassword: boolean
}

interface AuthPayload {
  message?: string
  user?: AuthUser
}

const username = ref('')
const password = ref('')
const remember = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const authenticatedUser = ref<AuthUser | null>(null)

const canSubmit = computed(() => username.value.trim().length > 0 && password.value.length > 0 && !loading.value)
const dashboardDestination = computed(() => authenticatedUser.value?.accountType === 'admin' ? '/admin' : '/dashboard')
const successDescription = computed(() => authenticatedUser.value?.accountType === 'admin'
  ? 'Ruang pengelola dan ringkasan perjalanan sudah siap dibuka.'
  : 'Ruang kenangan pribadimu sudah siap dibuka.')

async function submitLogin() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value.trim(),
        password: password.value,
        remember: remember.value,
      }),
    })
    const responseBody = await response.text()
    let payload: AuthPayload = {}

    if (responseBody) {
      try {
        payload = JSON.parse(responseBody) as AuthPayload
      } catch {
        throw new Error('Server mengirim respons yang tidak dapat dibaca. Silakan coba lagi.')
      }
    }

    if (!response.ok) {
      throw new Error(payload.message || (response.status >= 500
        ? 'Server autentikasi belum dapat dijangkau. Pastikan server API sedang berjalan.'
        : 'Tidak dapat masuk. Silakan coba lagi.'))
    }
    if (!payload.user) throw new Error('Data akun tidak ditemukan dalam respons server.')

    authenticatedUser.value = payload.user
  } catch (cause) {
    error.value = cause instanceof TypeError
      ? 'Server autentikasi belum dapat dijangkau. Pastikan server API sedang berjalan.'
      : cause instanceof Error
        ? cause.message
        : 'Server autentikasi belum dapat dijangkau.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-page__visual" aria-label="Kenangan KKN di tepi pantai">
      <img src="/images/kkn-group-hero.png" alt="Tiga belas anggota KKN berkumpul di pantai" />
      <div class="auth-page__visual-overlay" />
      <div class="auth-page__lights" aria-hidden="true"><i /><i /><i /><i /></div>
      <svg class="auth-page__waves" viewBox="0 0 900 260" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-30 105 C140 20 280 190 455 105 S735 42 940 130" />
        <path d="M-50 155 C130 78 305 232 485 151 S760 98 950 174" />
        <path d="M-45 205 C150 140 320 270 520 201 S790 157 950 216" />
      </svg>

      <a class="auth-page__back" href="/"><ArrowLeft :size="16" /> Kembali ke beranda</a>
      <a class="auth-page__brand" href="/"><span><Waves :size="23" /></span><b>PULU<span>PULU</span><small>MMD FILKOM 33</small></b></a>

      <blockquote>
        <p>“Beberapa tempat tak hanya kita kunjungi—<em>mereka ikut tinggal di dalam diri.</em>”</p>
        <footer><span /> Desa Pesisir Harapan · 2026</footer>
      </blockquote>

      <div class="auth-page__visual-meta">
        <span><strong>13</strong><small>anggota</small></span><i />
        <span><strong>30</strong><small>hari bersama</small></span><i />
        <span><strong>∞</strong><small>cerita dibawa pulang</small></span>
      </div>
    </section>

    <section class="auth-page__panel">
      <a class="auth-page__mobile-brand" href="/"><span><Waves :size="21" /></span><b>PULUPULU</b></a>

      <Transition name="auth-swap" mode="out-in">
        <div v-if="authenticatedUser" key="success" class="auth-success">
          <span class="auth-success__icon"><Check :size="27" /></span>
          <p class="auth-eyebrow">Akses berhasil</p>
          <h1>Selamat datang kembali,<br /><em>{{ authenticatedUser.name }}.</em></h1>
          <p>Kamu masuk sebagai <strong>{{ authenticatedUser.role }}</strong>. {{ successDescription }}</p>
          <div v-if="authenticatedUser.mustChangePassword" class="auth-success__notice"><LockKeyhole :size="16" /> Ganti password awal setelah masuk untuk menjaga keamanan akun.</div>
          <a class="auth-submit auth-submit--link" :href="dashboardDestination"><span>{{ authenticatedUser.accountType === 'admin' ? 'Masuk ke ruang pengelola' : 'Masuk ke ruang kenangan' }}</span><ArrowRight :size="18" /></a>
        </div>

        <div v-else key="form" class="auth-card">
          <header>
            <p class="auth-eyebrow"><span /> Ruang anggota privat</p>
            <h1>Selamat datang<br /><em>kembali.</em></h1>
            <p>Masuk untuk membuka pesan, foto, dan cerita yang hanya dapat dilihat oleh keluarga MMD FILKOM 33.</p>
          </header>

          <form novalidate @submit.prevent="submitLogin">
            <label class="auth-field" for="username">
              <span>Username</span>
              <div :class="{ 'auth-field__control--error': error }">
                <UserRound :size="18" />
                <input id="username" v-model="username" name="username" autocomplete="username" placeholder="contoh: maura.ramadhani" autofocus />
              </div>
            </label>

            <label class="auth-field" for="password">
              <span>Kata sandi</span>
              <div :class="{ 'auth-field__control--error': error }">
                <LockKeyhole :size="18" />
                <input id="password" v-model="password" name="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Masukkan kata sandi" />
                <button type="button" :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'" @click="showPassword = !showPassword">
                  <EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" />
                </button>
              </div>
            </label>

            <Transition name="field-error">
              <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
            </Transition>

            <div class="auth-options">
              <label><input v-model="remember" type="checkbox" /><span><Check :size="12" /></span> Ingat saya</label>
              <button type="button">Lupa kata sandi?</button>
            </div>

            <button class="auth-submit" type="submit" :disabled="!canSubmit">
              <LoaderCircle v-if="loading" class="auth-submit__spinner" :size="18" />
              <span>{{ loading ? 'Memeriksa akun…' : 'Masuk ke Ruang Kenangan' }}</span>
              <ArrowRight v-if="!loading" :size="18" />
            </button>
          </form>

          <footer class="auth-card__footer"><ShieldCheck :size="17" /><p><strong>Tidak ada pendaftaran publik.</strong><br />Seluruh akun dibuat oleh admin melalui database seeder.</p></footer>
        </div>
      </Transition>
    </section>
  </main>
</template>
