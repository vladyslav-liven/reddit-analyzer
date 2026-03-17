<template>
  <div class="analysis-tab">
    <div class="analysis-controls">
      <div class="provider-selector">
        <span class="label">AI Provider:</span>
        <el-radio-group v-model="selectedProvider">
          <el-radio-button label="claude">Claude Sonnet</el-radio-button>
          <el-radio-button label="openai">GPT-4o</el-radio-button>
          <el-radio-button label="gemini">Gemini Pro</el-radio-button>
        </el-radio-group>
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
          :label="`${a.provider} — ${formatDate(a.createdAt)}`"
          :value="a.id"
        />
      </el-select>
    </div>

    <div v-if="loading" class="loading-analysis">
      <el-skeleton :rows="8" animated />
      <p style="text-align: center; color: #888; margin-top: 12px">AI is analyzing {{ postCount }} posts...</p>
    </div>

    <div v-else-if="activeAnalysis" class="analysis-result">
      <el-card class="summary-card">
        <template #header>
          <div class="card-header">
            <span>Summary</span>
            <el-tag size="small">{{ activeAnalysis.provider }} · {{ activeAnalysis.model }}</el-tag>
          </div>
        </template>
        <p class="summary-text">{{ activeAnalysis.summary }}</p>
      </el-card>

      <el-row :gutter="16" style="margin-top: 16px">
        <el-col :span="12">
          <el-card>
            <template #header>Key Insights</template>
            <ul class="insight-list">
              <li v-for="(insight, i) in activeAnalysis.keyInsights" :key="i">{{ insight }}</li>
            </ul>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <template #header>Pain Points</template>
            <ul class="pain-list">
              <li v-for="(point, i) in activeAnalysis.painPoints" :key="i">{{ point }}</li>
            </ul>
          </el-card>
        </el-col>
      </el-row>

      <el-card style="margin-top: 16px">
        <template #header>Sentiment</template>
        <div class="sentiment-overview">
          <el-tag :type="sentimentType(activeAnalysis.sentiment?.overall)" size="large">
            Overall: {{ activeAnalysis.sentiment?.overall }}
          </el-tag>
        </div>
        <div class="topic-sentiments">
          <div v-for="(val, topic) in (activeAnalysis.sentiment?.byTopic || {})" :key="topic" class="topic-row">
            <span class="topic-name">{{ topic }}</span>
            <el-tag :type="sentimentType(val)" size="small">{{ val }}</el-tag>
          </div>
        </div>
      </el-card>

      <el-card style="margin-top: 16px">
        <template #header>Trending Phrases</template>
        <div class="trending-phrases">
          <el-tag
            v-for="phrase in activeAnalysis.trendingPhrases"
            :key="phrase"
            style="margin: 4px"
          >{{ phrase }}</el-tag>
        </div>
      </el-card>

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

const props = defineProps<{ sessionId: string }>()
const analysisStore = useAnalysisStore()
const redditStore = useRedditStore()

const selectedProvider = ref('claude')
const selectedAnalysisId = ref<string | null>(null)

const loading = computed(() => analysisStore.loading)
const activeAnalysis = computed(() => analysisStore.activeAnalysis)
const analyses = computed(() => analysisStore.analyses)
const postCount = computed(() => redditStore.totalPosts)

const renderedReport = computed(() => {
  if (!activeAnalysis.value?.structuredReport) return ''
  return marked(activeAnalysis.value.structuredReport)
})

function formatDate(d: string) { return new Date(d).toLocaleString() }

function sentimentType(s: string) {
  return { positive: 'success', negative: 'danger', neutral: 'info', mixed: 'warning' }[s] || 'info'
}

async function runAnalysis() {
  try {
    await analysisStore.runAnalysis(props.sessionId, selectedProvider.value)
    ElMessage.success('Analysis complete!')
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Analysis failed')
  }
}

async function loadAnalysis() {
  if (selectedAnalysisId.value) {
    const a = analyses.value.find(x => x.id === selectedAnalysisId.value)
    if (a) analysisStore.activeAnalysis = a
  }
}

onMounted(() => analysisStore.fetchAnalyses(props.sessionId))
</script>

<style scoped>
.analysis-tab { padding: 8px 0; }
.analysis-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.provider-selector { display: flex; align-items: center; gap: 10px; }
.label { font-size: 0.9rem; color: #555; }
.analysis-history { margin-bottom: 16px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.summary-text { line-height: 1.7; color: #444; }
.insight-list, .pain-list { margin: 0; padding-left: 20px; }
.insight-list li, .pain-list li { margin-bottom: 6px; color: #444; line-height: 1.5; }
.sentiment-overview { margin-bottom: 12px; }
.topic-sentiments { display: flex; flex-wrap: wrap; gap: 8px; }
.topic-row { display: flex; align-items: center; gap: 6px; }
.topic-name { font-size: 0.85rem; color: #555; }
.trending-phrases { }
.loading-analysis { padding: 16px 0; }
.markdown-report { line-height: 1.7; color: #333; }
.markdown-report :deep(h2) { color: #1a1a2e; border-bottom: 1px solid #eee; padding-bottom: 6px; }
.markdown-report :deep(h3) { color: #333; }
.markdown-report :deep(ul) { padding-left: 20px; }
.markdown-report :deep(li) { margin-bottom: 4px; }
</style>
