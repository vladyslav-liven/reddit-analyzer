<template>
  <div class="parse-tab">
    <el-form label-position="top">
      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item label="Keywords (press Enter to add)">
            <el-select
              v-model="config.keywords"
              multiple
              filterable
              allow-create
              placeholder="e.g. SaaS, B2B software, CRM"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="Subreddits (optional — leave empty to search all Reddit)">
            <el-select
              v-model="config.subreddits"
              multiple
              filterable
              allow-create
              placeholder="e.g. entrepreneur, startups, SaaS"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="Time Range">
            <el-select v-model="config.timeRange" style="width: 100%">
              <el-option label="Past Hour" value="hour" />
              <el-option label="Past Day" value="day" />
              <el-option label="Past Week" value="week" />
              <el-option label="Past Month" value="month" />
              <el-option label="Past Year" value="year" />
              <el-option label="All Time" value="all" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="Sort By">
            <el-select v-model="config.sort" style="width: 100%">
              <el-option label="Relevance" value="relevance" />
              <el-option label="Hot" value="hot" />
              <el-option label="Top" value="top" />
              <el-option label="New" value="new" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="Top Comments per Post">
            <el-input-number v-model="config.topNComments" :min="1" :max="50" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <el-button
      type="primary"
      size="large"
      :loading="parseStatus === 'running'"
      :disabled="config.keywords.length === 0"
      @click="startParse"
    >
      <el-icon v-if="parseStatus !== 'running'"><Search /></el-icon>
      {{ parseStatus === 'running' ? 'Parsing...' : 'Parse Reddit' }}
    </el-button>

    <div v-if="parseStatus === 'running' || parseStatus === 'done'" class="parse-progress">
      <div class="progress-stats">
        <span>Posts: {{ parseProgress?.posts || 0 }}</span>
        <span>Comments: {{ parseProgress?.comments || 0 }}</span>
        <span v-if="parseStatus === 'done'" style="color: #67c23a; font-weight: 600">✓ Done!</span>
      </div>
      <el-progress :percentage="parseProgress?.pct || 0" :status="parseStatus === 'done' ? 'success' : undefined" />
    </div>

    <el-alert v-if="parseStatus === 'error'" title="Parse failed. Check your Reddit API credentials." type="error" style="margin-top: 16px" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRedditStore } from '../../stores/reddit'

const props = defineProps<{ session: any }>()
const emit = defineEmits<{ parsed: [] }>()
const redditStore = useRedditStore()

const parseStatus = computed(() => redditStore.parseStatus)
const parseProgress = computed(() => redditStore.parseProgress)

const config = ref({
  keywords: [] as string[],
  subreddits: [] as string[],
  timeRange: 'week',
  sort: 'relevance',
  topNComments: 10,
})

onMounted(() => {
  if (props.session) {
    config.value.keywords = props.session.keywords || []
    config.value.subreddits = props.session.subreddits || []
    config.value.timeRange = props.session.timeRange || 'week'
    config.value.sort = props.session.sort || 'relevance'
    config.value.topNComments = props.session.topNComments || 10
  }
})

async function startParse() {
  if (config.value.keywords.length === 0) {
    ElMessage.warning('Add at least one keyword')
    return
  }
  try {
    await redditStore.startParse(props.session.id, config.value)
    // Watch for done
    const interval = setInterval(() => {
      if (redditStore.parseStatus === 'done') {
        clearInterval(interval)
        emit('parsed')
      }
    }, 1000)
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Failed to start parsing')
  }
}

import { computed } from 'vue'
</script>

<style scoped>
.parse-tab { padding: 8px 0; }
.parse-progress {
  margin-top: 20px;
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
}
.progress-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: #555;
}
</style>
