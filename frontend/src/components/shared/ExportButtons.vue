<template>
  <div class="export-buttons">
    <el-button size="small" @click="exportCsv">Export CSV</el-button>
    <el-button size="small" @click="exportPdf">Export PDF</el-button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ sessionId: string }>()

function exportCsv() {
  window.open(`/api/sessions/${props.sessionId}/export/csv`, '_blank')
}
function exportPdf() {
  window.open(`/api/sessions/${props.sessionId}/export/pdf`, '_blank')
}
</script>

<style scoped>
.export-buttons { display: flex; gap: 8px; }
</style>
