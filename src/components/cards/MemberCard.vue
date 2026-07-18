<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import type { Member } from '@/data/members'
defineProps<{ member: Member; featured?: boolean }>()
</script>

<template>
  <article class="member-card" :class="{ 'member-card--featured': featured }">
    <img :src="member.portrait" :alt="`Foto placeholder ${member.name}`" loading="lazy" />
    <div class="member-card__veil" />
    <span class="member-card__number">{{ String(member.id).padStart(2, '0') }}</span>
    <button class="member-card__open" :aria-label="`Lihat cerita ${member.name}`"><ArrowUpRight :size="17" /></button>
    <div class="member-card__content">
      <p>{{ member.role }}</p><h3>{{ member.name }}</h3><span>{{ member.memory }}</span>
    </div>
  </article>
</template>

