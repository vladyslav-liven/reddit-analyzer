<template>
  <div class="session-layout">
    <AppSidebar />
    <div class="session-main">
      <div v-if="session" class="session-content">
        <div class="session-header">
          <h2>{{ session.name }}</h2>
          <div class="session-meta">
            <el-tag :type="statusType" size="small">{{ session.parseStatus }}</el-tag>
            <span v-if="session.lastParsedAt" class="last-parsed">
              Last parsed: {{ formatDate(session.lastParsedAt) }}
            </span>
          </div>
        </div>
        <el-tabs v-model="activeTab" class="session-tabs">
          <el-tab-pane label="Parse" name="parse">
            <ParseTab :session="session" @parsed="onParsed" />
          </el-tab-pane>
          <el-tab-pane :label="`Results (${session.postCount || 0})`" name="results">
            <ResultsTab :session-id="session.id" />
          </el-tab-pane>
          <el-tab-pane label="Analysis" name="analysis">
            <AnalysisTab :session-id="session.id" />
          </el-tab-pane>
          <el-tab-pane label="Prompt" name="prompt">
            <PromptTab :session="session" @updated="onSessionUpdated" />
          </el-tab-pane>
        </el-tabs>
      </div>
      <div v-else-if="loading" class="loading-state">
        <el-skeleton :rows="5" animated />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionsStore } from '../stores/sessions'
import AppSidebar from '../components/layout/AppSidebar.vue'
import ParseTab from '../components/parse/ParseTab.vue'
import ResultsTab from '../components/results/ResultsTab.vue'
import AnalysisTab from '../components/analysis/AnalysisTab.vue'
import PromptTab from '../components/prompt/PromptTab.vue'

const route = useRoute()
const sessionsStore = useSessionsStore()
const session = ref<any>(null)
const loading = ref(false)
const activeTab = ref('parse')

const statusType = computed(() => {
  const map: Record<string, string> = { idle: 'info', running: 'warning', done: 'success', failed: 'danger' }
  return map[session.value?.parseStatus] || 'info'
})

function formatDate(d: string) {
  return new Date(d).toLocaleString()
}

async function loadSession() {
  loading.value = true
  try {
    session.value = await sessionsStore.fetchOne(route.params.id as string)
  } finally {
    loading.value = false
  }
}

function onParsed() {
  loadSession()
}

function onSessionUpdated(updated: any) {
  session.value = { ...session.value, ...updated }
}

onMounted(loadSession)
watch(() => route.params.id, loadSession)

import { computed } from 'vue'
</script>

<style scoped>
.session-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.session-main {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #f5f5f5;
}
.session-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.session-header h2 {
  margin: 0;
  font-size: 1.5rem;
}
.session-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.last-parsed {
  font-size: 0.8rem;
  color: #999;
}
.session-tabs {
  background: white;
  border-radius: 8px;
  padding: 16px;
}
.loading-state {
  padding: 24px;
}
</style>
