<script setup lang="ts">
import { ArrowDownUp } from '@lucide/vue'
import { members as memberProfiles } from '@/data/members'
import type { MessageCompletionMember, MonitoringSort } from '@/types/admin'

defineProps<{ members: MessageCompletionMember[]; sort: MonitoringSort }>()
const emit = defineEmits<{ 'update:sort': [sort: MonitoringSort] }>()
const options: Array<{ value: MonitoringSort; label: string }> = [{ value: 'progress-desc', label: 'Tertinggi' }, { value: 'progress-asc', label: 'Perlu perhatian' }, { value: 'name', label: 'Nama A–Z' }]
function portraitFor(memberId: number) { return memberProfiles.find((member) => member.id === memberId)?.portrait || '/images/kkn-group-hero.png' }
</script>

<template>
  <section class="member-completion-chart">
    <header><div><p>Progres per anggota</p><h2>Siapa sudah menulis untuk siapa</h2></div><label><ArrowDownUp :size="14" /><select :value="sort" aria-label="Urutkan progres anggota" @change="emit('update:sort', ($event.target as HTMLSelectElement).value as MonitoringSort)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select></label></header>
    <div class="member-completion-chart__rows">
      <article v-for="(member, index) in members" :key="member.memberId">
        <span class="member-completion-chart__rank">{{ String(index + 1).padStart(2, '0') }}</span>
        <img :src="portraitFor(member.memberId)" :alt="member.name" />
        <div class="member-completion-chart__identity"><strong>{{ member.name }}</strong><small>{{ member.role }}</small></div>
        <div class="member-completion-chart__bar"><span><i :style="{ width: `${member.progress}%` }" /></span><small>{{ member.completedRecipients }}/{{ member.target }}</small></div>
        <strong class="member-completion-chart__percent">{{ member.progress }}%</strong>
      </article>
    </div>
  </section>
</template>
