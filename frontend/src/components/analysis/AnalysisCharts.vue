<template>
  <div class="analysis-charts">

    <!-- Row 1: Sentiment donut + Sentiment by topic -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :xs="24" :sm="10">
        <el-card>
          <template #header>Overall Sentiment</template>
          <v-chart :option="sentimentDonut" style="height: 220px" autoresize />
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="14">
        <el-card>
          <template #header>Sentiment by Topic</template>
          <v-chart v-if="topicSentimentOption" :option="topicSentimentOption" style="height: 220px" autoresize />
          <el-empty v-else description="No topic data" :image-size="60" style="height:220px" />
        </el-card>
      </el-col>
    </el-row>

    <!-- Row 2: Trending phrases + Top posts -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :xs="24" :sm="12">
        <el-card>
          <template #header>Trending Phrases</template>
          <v-chart :option="phrasesBar" style="height: 260px" autoresize />
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-card>
          <template #header>Top Posts by Score</template>
          <v-chart v-if="topPostsOption" :option="topPostsOption" style="height: 260px" autoresize />
          <el-empty v-else description="No posts data" :image-size="60" style="height:260px" />
        </el-card>
      </el-col>
    </el-row>

    <!-- Row 3: Subreddit distribution + Pain points visual -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :xs="24" :sm="12">
        <el-card>
          <template #header>Subreddit Distribution</template>
          <v-chart v-if="subredditOption" :option="subredditOption" style="height: 260px" autoresize />
          <el-empty v-else description="No posts data" :image-size="60" style="height:260px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-card>
          <template #header>Pain Points</template>
          <div class="pain-cards">
            <div v-for="(point, i) in painPoints" :key="i" class="pain-card">
              <span class="pain-num">{{ i + 1 }}</span>
              <span class="pain-text">{{ point }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Row 4: Comment Insights -->
    <el-card v-if="commentInsights?.length" style="margin-bottom: 16px">
      <template #header>
        <div class="card-header-with-badge">
          💬 Comment Insights
          <el-tag size="small" type="warning">тільки з коментарів</el-tag>
        </div>
      </template>
      <div class="insights-list">
        <div v-for="(item, i) in commentInsights" :key="i" class="insight-item comment-insight-item">
          <div class="insight-main">
            <div class="insight-left">
              <span class="insight-icon">{{ ['🗣️','👥','💭','🎯','🔍'][i % 5] }}</span>
              <span class="insight-text">{{ item.insight }}</span>
            </div>
            <el-button
              v-if="item.examples?.length"
              size="small"
              text
              :type="openCommentEvidence === i ? 'warning' : 'default'"
              @click="openCommentEvidence = openCommentEvidence === i ? null : i"
            >
              {{ openCommentEvidence === i ? 'Сховати приклади' : `Приклади (${item.examples.length})` }}
            </el-button>
          </div>
          <div v-if="openCommentEvidence === i && item.examples?.length" class="evidence-panel">
            <div class="evidence-section">
              <div class="evidence-label">💬 Реальні коментарі</div>
              <div v-for="(ex, ei) in item.examples" :key="ei" class="evidence-quote comment-quote">
                "{{ ex }}"
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- Row 5: Key Insights with evidence toggle -->
    <el-card>
      <template #header>Key Insights</template>
      <div class="insights-list">
        <div v-for="(item, i) in keyInsights" :key="i" class="insight-item">
          <div class="insight-main">
            <div class="insight-left">
              <span class="insight-icon">{{ ['💡','📊','🎯','🔥','⚡','📌','🚀','💬'][i % 8] }}</span>
              <span class="insight-text">{{ typeof item === 'string' ? item : item.insight }}</span>
            </div>
            <el-button
              v-if="getEvidence(item)"
              size="small"
              text
              :type="openEvidence === i ? 'primary' : 'default'"
              @click="openEvidence = openEvidence === i ? null : i"
            >
              {{ openEvidence === i ? 'Hide evidence' : 'Show evidence' }}
            </el-button>
          </div>

          <div v-if="openEvidence === i && getEvidence(item)" class="evidence-panel">
            <div v-if="getEvidence(item).posts?.length" class="evidence-section">
              <div class="evidence-label">📄 Posts</div>
              <div v-for="(p, pi) in getEvidence(item).posts" :key="pi" class="evidence-quote">{{ p }}</div>
            </div>
            <div v-if="getEvidence(item).comments?.length" class="evidence-section">
              <div class="evidence-label">💬 Comments</div>
              <div v-for="(c, ci) in getEvidence(item).comments" :key="ci" class="evidence-quote">{{ c }}</div>
            </div>
            <div v-if="getEvidence(item).phrases?.length" class="evidence-section">
              <div class="evidence-label">🏷 Phrases</div>
              <div class="evidence-phrases">
                <el-tag v-for="(ph, phi) in getEvidence(item).phrases" :key="phi" size="small" style="margin: 2px">{{ ph }}</el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart } from 'echarts/charts'
import {
  TitleComponent, TooltipComponent, LegendComponent, GridComponent,
} from 'echarts/components'

use([CanvasRenderer, PieChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const props = defineProps<{
  sentiment: { overall: string; byTopic: Record<string, string> } | null
  trendingPhrases: string[]
  painPoints: string[]
  keyInsights: any[]
  commentInsights: any[]
  posts: Array<{ title: string; score: number; subreddit: string }>
}>()

const openEvidence = ref<number | null>(null)
const openCommentEvidence = ref<number | null>(null)
const getEvidence = (item: any) => (typeof item === 'object' && item.evidence) ? item.evidence : null

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#67c23a',
  negative: '#f56c6c',
  neutral:  '#909399',
  mixed:    '#e6a23c',
}

// 1. Sentiment donut
const sentimentDonut = computed(() => {
  const overall = props.sentiment?.overall || 'neutral'
  const color = SENTIMENT_COLORS[overall] || '#909399'
  return {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      data: [{ value: 1, name: overall, itemStyle: { color } }],
      label: {
        show: true, position: 'center',
        formatter: overall.toUpperCase(),
        fontSize: 18, fontWeight: 'bold', color,
      },
      emphasis: { disabled: true },
    }],
  }
})

// 2. Sentiment by topic
const topicSentimentOption = computed(() => {
  const byTopic = props.sentiment?.byTopic || {}
  const entries = Object.entries(byTopic)
  if (entries.length === 0) return null
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'value', max: 1, show: false },
    yAxis: { type: 'category', data: entries.map(([k]) => k), axisLabel: { fontSize: 12 } },
    series: [{
      type: 'bar',
      data: entries.map(([, v]) => ({
        value: 1,
        itemStyle: { color: SENTIMENT_COLORS[v] || '#909399', borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'insideRight', formatter: v },
      })),
      barMaxWidth: 30,
    }],
  }
})

// 3. Trending phrases bar
const phrasesBar = computed(() => {
  const phrases = [...props.trendingPhrases].reverse()
  const total = phrases.length
  const values = phrases.map((_, i) => total - i)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: phrases, axisLabel: { fontSize: 12 } },
    series: [{
      type: 'bar',
      data: values.map((v, i) => ({
        value: v,
        itemStyle: {
          color: `hsl(${220 + i * 15}, 70%, ${55 + i * 3}%)`,
          borderRadius: [0, 4, 4, 0],
        },
      })),
      barMaxWidth: 28,
      label: { show: false },
    }],
  }
})

// helper
const insightText = (item: any) => typeof item === 'string' ? item : item.insight

// 4. Top posts by score
const topPostsOption = computed(() => {
  const top = [...props.posts].sort((a, b) => b.score - a.score).slice(0, 8)
  if (top.length === 0) return null
  const titles = top.map(p => p.title.length > 35 ? p.title.substring(0, 35) + '…' : p.title).reverse()
  const scores = top.map(p => p.score).reverse()
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '10%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: titles, axisLabel: { fontSize: 11, width: 160, overflow: 'truncate' } },
    series: [{
      type: 'bar',
      data: scores.map(v => ({ value: v, itemStyle: { color: '#5470c6', borderRadius: [0, 4, 4, 0] } })),
      barMaxWidth: 28,
      label: { show: true, position: 'right', formatter: (p: any) => p.value.toLocaleString() },
    }],
  }
})

// 5. Subreddit distribution
const subredditOption = computed(() => {
  if (props.posts.length === 0) return null
  const counts: Record<string, number> = {}
  for (const p of props.posts) counts[p.subreddit] = (counts[p.subreddit] || 0) + 1
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} posts ({d}%)' },
    legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      top: '-10%',
      data: sorted.map(([name, value]) => ({ name, value })),
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' } },
    }],
  }
})
</script>

<style scoped>
.pain-cards { display: flex; flex-direction: column; gap: 8px; padding: 4px 0; }
.pain-card {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 10px 14px; background: #fff5f5; border-radius: 8px;
  border-left: 3px solid #f56c6c;
}
.pain-num {
  font-size: 1rem; font-weight: 700; color: #f56c6c;
  min-width: 20px; padding-top: 1px;
}
.pain-text { font-size: 0.88rem; color: #444; line-height: 1.5; }

.card-header-with-badge { display: flex; align-items: center; gap: 8px; }
.comment-insight-item { border-left-color: #e6a23c; }
.comment-quote { font-style: italic; border-left-color: #e6a23c; }
.insights-list { display: flex; flex-direction: column; gap: 8px; }
.insight-item {
  border-radius: 8px; border-left: 3px solid #5470c6;
  overflow: hidden;
}
.insight-main {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 12px 14px; background: #f0f5ff;
}
.insight-left { display: flex; gap: 12px; align-items: flex-start; flex: 1; }
.insight-icon { font-size: 1.2rem; line-height: 1.4; flex-shrink: 0; }
.insight-text { font-size: 0.88rem; color: #333; line-height: 1.5; }

.evidence-panel {
  padding: 12px 16px; background: #fafafa;
  border-top: 1px solid #e4e7ed;
  display: flex; flex-direction: column; gap: 10px;
}
.evidence-section { display: flex; flex-direction: column; gap: 4px; }
.evidence-label { font-size: 0.78rem; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
.evidence-quote {
  font-size: 0.84rem; color: #444; line-height: 1.5;
  padding: 6px 10px; background: #fff;
  border-radius: 4px; border-left: 2px solid #dcdfe6;
}
.evidence-phrases { display: flex; flex-wrap: wrap; gap: 4px; }
</style>
