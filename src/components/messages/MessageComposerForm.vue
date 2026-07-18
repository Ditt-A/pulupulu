<script setup lang="ts">
import { Lightbulb, Quote, Sparkles } from '@lucide/vue'

defineProps<{
  title: string
  body: string
  closing: string
  senderName: string
  recipientName: string
  errors: { title?: string; body?: string; closing?: string }
}>()

const emit = defineEmits<{
  'update:title': [value: string]
  'update:body': [value: string]
  'update:closing': [value: string]
  blur: [field: 'title' | 'body' | 'closing']
  prompt: [value: string]
}>()

const prompts = [
  'Momen yang paling kuingat bersamamu adalah…',
  'Hal yang belum sempat kukatakan adalah…',
  'Setelah perjalanan ini, aku berharap…',
]

function inputValue(event: Event) {
  return (event.target as HTMLInputElement | HTMLTextAreaElement).value
}
</script>

<template>
  <section class="composer-paper" aria-labelledby="composer-form-title">
    <header class="composer-paper__head">
      <div><Sparkles :size="14" /><span>Surat pribadi untuk {{ recipientName }}</span></div>
      <small>Hanya kamu dan penerima</small>
    </header>

    <div class="composer-paper__salutation">
      <span>Kepada,</span>
      <h2 id="composer-form-title">{{ recipientName }}</h2>
    </div>

    <label class="composer-field" :class="{ 'composer-field--error': errors.title }">
      <span><b>Judul kecil</b><em>Opsional · {{ title.length }}/60</em></span>
      <input
        :value="title"
        maxlength="61"
        placeholder="Misalnya: Tentang sore di teras posko"
        @input="emit('update:title', inputValue($event))"
        @blur="emit('blur', 'title')"
      />
      <small v-if="errors.title">{{ errors.title }}</small>
    </label>

    <div class="composer-prompts">
      <p><Lightbulb :size="13" /> Butuh titik awal?</p>
      <div><button v-for="item in prompts" :key="item" type="button" @click="emit('prompt', item)">{{ item }}</button></div>
    </div>

    <label class="composer-field composer-field--body" :class="{ 'composer-field--error': errors.body }">
      <span><b>Isi pesan</b><em :class="{ danger: body.length > 1500 }">{{ body.length }}/1.500</em></span>
      <span class="composer-field__textarea">
        <Quote :size="23" />
        <textarea
          id="private-message-body"
          :value="body"
          maxlength="1501"
          rows="12"
          placeholder="Tuliskan apa yang ingin kamu simpan untuknya—kenangan kecil, rasa terima kasih, atau kalimat yang belum sempat terucap…"
          @input="emit('update:body', inputValue($event))"
          @blur="emit('blur', 'body')"
        />
      </span>
      <small v-if="errors.body">{{ errors.body }}</small>
      <i v-else>Minimal 20 karakter agar pesanmu dapat dikirim.</i>
    </label>

    <label class="composer-field" :class="{ 'composer-field--error': errors.closing }">
      <span><b>Kalimat penutup</b><em>Opsional · {{ closing.length }}/80</em></span>
      <input
        :value="closing"
        maxlength="81"
        placeholder="Misalnya: Sampai bertemu di cerita berikutnya."
        @input="emit('update:closing', inputValue($event))"
        @blur="emit('blur', 'closing')"
      />
      <small v-if="errors.closing">{{ errors.closing }}</small>
    </label>

    <footer class="composer-paper__signature">
      <span>Dari teman seperjalananmu,</span>
      <strong>{{ senderName }}</strong>
      <i />
    </footer>
  </section>
</template>
