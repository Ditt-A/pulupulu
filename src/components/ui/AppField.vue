<script setup lang="ts">
defineProps<{
  id: string
  label: string
  placeholder?: string
  modelValue: string
  type?: 'text' | 'email' | 'password' | 'textarea' | 'select'
  hint?: string
  options?: string[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <label class="field" :for="id">
    <span class="field__label">{{ label }}</span>
    <textarea
      v-if="type === 'textarea'"
      :id="id"
      class="field__control min-h-32 resize-none"
      :placeholder="placeholder"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <select
      v-else-if="type === 'select'"
      :id="id"
      class="field__control"
      :value="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option" :value="option">{{ option }}</option>
    </select>
    <input
      v-else
      :id="id"
      class="field__control"
      :type="type || 'text'"
      :placeholder="placeholder"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="hint" class="field__hint">{{ hint }}</span>
  </label>
</template>

