<template>
  <div class="parse-tab">
    <el-form label-position="top">
      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item>
            <template #label>
              Ключові слова (необов'язково)
              <el-tooltip placement="top" :show-after="200" content="Слова або фрази за якими буде шукатись контент на Reddit. Натисни Enter після кожного слова щоб додати. Можна залишити порожнім якщо вказані сабредіти — тоді зберуться топ пости з цих спільнот без фільтра по словах.">
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-select
              v-model="config.keywords"
              multiple
              filterable
              allow-create
              placeholder="Напр. SaaS, B2B software, CRM — натисни Enter щоб додати"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item>
            <template #label>
              Subreddits (необов'язково)
              <el-tooltip placement="top" :show-after="200" content="Обмеж пошук конкретними спільнотами Reddit. Якщо залишити порожнім — пошук відбувається по всьому Reddit. Вводь тільки назву без «r/». Наприклад: «entrepreneur», «startups», «marketing».">
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-select
              v-model="config.subreddits"
              multiple
              filterable
              allow-create
              placeholder="Напр. entrepreneur, startups, SaaS — або залиш порожнім для пошуку по всьому Reddit"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>

        <el-col :span="6">
          <el-form-item>
            <template #label>
              Часовий діапазон
              <el-tooltip placement="top" :show-after="200" content="За який період шукати пости. «Тиждень» — оптимально для свіжих трендів. «Місяць» або «Рік» — для глибшого аналізу довготривалих тем. «Все» — максимальне охоплення але менше актуальності.">
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-select v-model="config.timeRange" style="width: 100%">
              <el-option label="Остання година" value="hour" />
              <el-option label="Останній день" value="day" />
              <el-option label="Останній тиждень" value="week" />
              <el-option label="Останній місяць" value="month" />
              <el-option label="Останній рік" value="year" />
              <el-option label="Весь час" value="all" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="6">
          <el-form-item>
            <template #label>
              Сортування
              <el-tooltip placement="top" :show-after="200" content="Як впорядкувати результати. «Релевантність» — найбільш відповідні до ключових слів. «Гарячі» — зараз активно обговорюються. «Топ» — найбільше лайків за вибраний період. «Нові» — найсвіжіші пости.">
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-select v-model="config.sort" style="width: 100%">
              <el-option label="Релевантність" value="relevance" />
              <el-option label="Гарячі" value="hot" />
              <el-option label="Топ" value="top" />
              <el-option label="Нові" value="new" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="6">
          <el-form-item>
            <template #label>
              Топ коментарів на пост
              <el-tooltip placement="top" :show-after="200" content="Скільки найкращих коментарів збирати для кожного поста. Коментарі — головне джерело думок людей. 10 — швидко і достатньо. 30–50 — глибший аналіз думок, але парсинг займе більше часу.">
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input-number v-model="config.topNComments" :min="1" :max="50" style="width: 100%" />
          </el-form-item>
        </el-col>

        <el-col :span="6">
          <el-form-item>
            <template #label>
              Макс. кількість постів
              <el-tooltip placement="top" :show-after="200" content="Максимальна кількість постів для збору. 100 — оптимально для більшості задач і займає ~1 хв. 200–300 — для глибшого аналізу, але парсинг займе 2–4 хв. Більше постів = точніший аналіз, але вищий час і вартість AI.">
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input-number v-model="config.maxPosts" :min="10" :max="500" :step="25" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <el-button
      type="primary"
      size="large"
      :loading="parseStatus === 'running'"
      :disabled="config.keywords.length === 0 && config.subreddits.length === 0"
      @click="startParse"
    >
      <el-icon v-if="parseStatus !== 'running'"><Search /></el-icon>
      {{ parseStatus === 'running' ? 'Парсинг...' : 'Запустити парсинг' }}
    </el-button>

    <div v-if="parseStatus === 'running' || parseStatus === 'done'" class="parse-progress">
      <div class="progress-stats">
        <span>Пости: {{ parseProgress?.posts || 0 }}</span>
        <span>Коментарі: {{ parseProgress?.comments || 0 }}</span>
        <span class="elapsed">⏱ {{ elapsedStr }}</span>
        <span v-if="parseStatus === 'done'" style="color: #67c23a; font-weight: 600">✓ Готово!</span>
      </div>
      <el-progress :percentage="parseProgress?.pct || 0" :status="parseStatus === 'done' ? 'success' : undefined" />
      <div v-if="parseMessage" class="parse-message">{{ parseMessage }}</div>
      <div v-if="parseLogs.length" class="parse-log" ref="logEl">
        <div v-for="(entry, i) in parseLogs" :key="i" class="log-entry">
          <span class="log-time">{{ entry.time }}</span>
          <span class="log-text">{{ entry.text }}</span>
        </div>
      </div>
    </div>

    <el-alert v-if="parseStatus === 'error'" title="Помилка парсингу. Перевір підключення до інтернету." type="error" style="margin-top: 16px" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useRedditStore } from '../../stores/reddit'

const props = defineProps<{ session: any }>()
const emit = defineEmits<{ parsed: [] }>()
const redditStore = useRedditStore()

const parseStatus = computed(() => redditStore.parseStatus)
const parseProgress = computed(() => redditStore.parseProgress)
const parseMessage = computed(() => redditStore.parseMessage)
const parseLogs = computed(() => redditStore.parseLogs)

const logEl = ref<HTMLElement | null>(null)
let elapsedInterval: ReturnType<typeof setInterval> | null = null
const elapsedSec = ref(0)

const elapsedStr = computed(() => {
  const s = elapsedSec.value
  if (s < 60) return `${s}с`
  return `${Math.floor(s / 60)}хв ${s % 60}с`
})

watch(parseStatus, (val) => {
  if (val === 'running') {
    elapsedSec.value = 0
    elapsedInterval = setInterval(() => elapsedSec.value++, 1000)
  } else {
    if (elapsedInterval) { clearInterval(elapsedInterval); elapsedInterval = null }
  }
})

watch(parseLogs, async () => {
  await nextTick()
  if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
}, { deep: true })

const config = ref({
  keywords: [] as string[],
  subreddits: [] as string[],
  timeRange: 'week',
  sort: 'relevance',
  topNComments: 10,
  maxPosts: 100,
})

onMounted(() => {
  if (props.session) {
    config.value.keywords = props.session.keywords || []
    config.value.subreddits = props.session.subreddits || []
    config.value.timeRange = props.session.timeRange || 'week'
    config.value.sort = props.session.sort || 'relevance'
    config.value.topNComments = props.session.topNComments || 10
    config.value.maxPosts = props.session.maxPosts || 100
  }
})

async function startParse() {
  if (config.value.keywords.length === 0 && config.value.subreddits.length === 0) {
    ElMessage.warning('Додай хоча б одне ключове слово або сабредіт')
    return
  }
  try {
    await redditStore.startParse(props.session.id, config.value)
    const interval = setInterval(() => {
      if (redditStore.parseStatus === 'done') {
        clearInterval(interval)
        emit('parsed')
      }
    }, 1000)
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Не вдалося запустити парсинг')
  }
}
</script>

<style scoped>
.parse-tab { padding: 8px 0; }
.info-icon {
  margin-left: 4px;
  color: #909399;
  cursor: help;
  vertical-align: middle;
  font-size: 14px;
}
.info-icon:hover { color: #409eff; }
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
  flex-wrap: wrap;
  align-items: center;
}
.elapsed { color: #909399; font-size: 0.85rem; }
.parse-message {
  margin-top: 10px;
  font-size: 0.88rem;
  color: #409eff;
  font-style: italic;
}
.parse-log {
  margin-top: 10px;
  max-height: 180px;
  overflow-y: auto;
  background: #1e1e2e;
  border-radius: 6px;
  padding: 8px 12px;
  font-family: monospace;
  font-size: 0.78rem;
}
.log-entry { display: flex; gap: 10px; padding: 1px 0; color: #cdd6f4; }
.log-time { color: #6c7086; flex-shrink: 0; }
.log-text { color: #cdd6f4; }
</style>
