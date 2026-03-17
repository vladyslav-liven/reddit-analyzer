<template>
  <div class="analysis-tab">
    <div class="analysis-controls">
      <div class="model-selector">
        <span class="label">Model:</span>
        <el-select v-model="selectedModel" placeholder="Select model" style="width: 280px">
          <el-option-group v-for="group in groupedModels" :key="group.provider" :label="group.provider">
            <el-option
              v-for="m in group.models"
              :key="m.id"
              :label="m.name"
              :value="m.id"
            />
          </el-option-group>
        </el-select>
      </div>
      <el-button type="primary" :loading="loading" @click="runAnalysis">
        <el-icon v-if="!loading"><MagicStick /></el-icon>
        {{ loading ? 'Analyzing...' : 'Run Analysis' }}
      </el-button>
    </div>

    <div v-if="analyses.length > 1" class="analysis-history">
      <el-select v-model="selectedAnalysisId" placeholder="Select analysis" @change="loadAnalysis">
        <el-option
          v-for="a in analyses"
          :key="a.id"
          :label="`${a.model} — ${formatDate(a.createdAt)}`"
          :value="a.id"
        />
      </el-select>
    </div>

    <div v-if="loading" class="loading-analysis">
      <el-skeleton :rows="10" animated />
      <p style="text-align: center; color: #888; margin-top: 12px">AI is analyzing {{ postCount }} posts...</p>
    </div>

    <div v-else-if="activeAnalysis" class="analysis-result">

      <!-- Header: model + tokens + cost -->
      <el-card class="summary-card" style="margin-bottom: 16px">
        <template #header>
          <div class="card-header">
            <span>Summary</span>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
              <el-tag size="small" type="info">{{ activeAnalysis.model }}</el-tag>
              <el-tooltip
                v-if="activeAnalysis.tokensUsed"
                :content="`Input: ${activeAnalysis.inputTokens?.toLocaleString() || '?'} · Output: ${activeAnalysis.outputTokens?.toLocaleString() || '?'}`"
              >
                <el-tag size="small" type="warning">
                  {{ activeAnalysis.tokensUsed?.toLocaleString() }} tokens
                </el-tag>
              </el-tooltip>
              <el-tag v-if="activeAnalysis.costUsd != null" size="small" type="success">
                ${{ Number(activeAnalysis.costUsd).toFixed(4) }}
              </el-tag>
            </div>
          </div>
        </template>
        <p class="summary-text">{{ activeAnalysis.summary }}</p>
      </el-card>

      <!-- Charts -->
      <AnalysisCharts
        :sentiment="activeAnalysis.sentiment"
        :trending-phrases="activeAnalysis.trendingPhrases || []"
        :pain-points="activeAnalysis.painPoints || []"
        :key-insights="activeAnalysis.keyInsights || []"
        :comment-insights="activeAnalysis.commentInsights || []"
        :posts="redditStore.posts"
      />

      <!-- Full Report -->
      <el-card style="margin-top: 16px">
        <template #header>
          <div class="card-header">
            <span>Full Report</span>
            <ExportButtons :session-id="sessionId" />
          </div>
        </template>
        <div class="markdown-report" v-html="renderedReport" />
      </el-card>
    </div>

    <div v-else class="empty-analysis">
      <el-empty description="No analysis yet. Run analysis after parsing Reddit." />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { marked } from 'marked'
import { ElMessage } from 'element-plus'
import { useAnalysisStore } from '../../stores/analysis'
import { useRedditStore } from '../../stores/reddit'
import ExportButtons from '../shared/ExportButtons.vue'
import AnalysisCharts from './AnalysisCharts.vue'
import api from '../../api/client'

const props = defineProps<{ sessionId: string }>()
const analysisStore = useAnalysisStore()
const redditStore = useRedditStore()

const selectedModel = ref('anthropic/claude-sonnet-4-5')
const selectedAnalysisId = ref<string | null>(null)
const models = ref<{ id: string; name: string; provider: string }[]>([])

const loading = computed(() => analysisStore.loading)
const activeAnalysis = computed(() => analysisStore.activeAnalysis)
const analyses = computed(() => analysisStore.analyses)
const postCount = computed(() => redditStore.totalPosts)

const groupedModels = computed(() => {
  const map: Record<string, typeof models.value> = {}
  for (const m of models.value) {
    if (!map[m.provider]) map[m.provider] = []
    map[m.provider].push(m)
  }
  return Object.entries(map).map(([provider, ms]) => ({ provider, models: ms }))
})

const renderedReport = computed(() => {
  if (!activeAnalysis.value?.structuredReport) return ''
  return marked(activeAnalysis.value.structuredReport)
})

function formatDate(d: string) { return new Date(d).toLocaleString() }

async function runAnalysis() {
  try {
    await analysisStore.runAnalysis(props.sessionId, selectedModel.value)
    ElMessage.success('Analysis complete!')
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Analysis failed')
  }
}

function loadAnalysis() {
  if (selectedAnalysisId.value) {
    const a = analyses.value.find(x => x.id === selectedAnalysisId.value)
    if (a) analysisStore.activeAnalysis = a
  }
}

onMounted(async () => {
  analysisStore.fetchAnalyses(props.sessionId)
  const { data } = await api.get('/models')
  models.value = data
})
</script>

<style scoped>
.analysis-tab { padding: 8px 0; }
.analysis-controls {
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 16px; flex-wrap: wrap;
}
.model-selector { display: flex; align-items: center; gap: 10px; }
.label { font-size: 0.9rem; color: #555; }
.analysis-history { margin-bottom: 16px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.summary-text { line-height: 1.7; color: #444; }
.loading-analysis { padding: 16px 0; }
.markdown-report { line-height: 1.7; color: #333; }
.markdown-report :deep(h2) { color: #1a1a2e; border-bottom: 1px solid #eee; padding-bottom: 6px; }
.markdown-report :deep(h3) { color: #333; }
.markdown-report :deep(ul) { padding-left: 20px; }
.markdown-report :deep(li) { margin-bottom: 4px; }
</style>
