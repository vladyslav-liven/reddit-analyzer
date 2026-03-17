import { defineStore } from 'pinia'
import { ref } from 'vue'
import { redditApi } from '../api/reddit'
import api from '../api/client'

export const useRedditStore = defineStore('reddit', () => {
  const posts = ref<any[]>([])
  const totalPosts = ref(0)
  const loading = ref(false)
  const parseProgress = ref<{ pct: number; posts: number; comments: number } | null>(null)
  const parseStatus = ref<'idle' | 'running' | 'done' | 'error'>('idle')
  const parseMessage = ref<string>('')
  const parseLogs = ref<{ time: string; text: string }[]>([])
  const parseStartTime = ref<number | null>(null)
  let eventSource: EventSource | null = null
  let pollInterval: ReturnType<typeof setInterval> | null = null

  function addLog(text: string) {
    const now = new Date()
    const time = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    parseLogs.value.push({ time, text })
    if (parseLogs.value.length > 100) parseLogs.value.shift()
  }

  async function fetchPosts(sessionId: string, params?: any) {
    loading.value = true
    try {
      const data = await redditApi.getPosts(sessionId, params)
      posts.value = data.items
      totalPosts.value = data.total
    } finally {
      loading.value = false
    }
  }

  function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
  }

  function startPolling(sessionId: string) {
    stopPolling()
    pollInterval = setInterval(async () => {
      try {
        const { data } = await api.get(`/sessions/${sessionId}`)
        if (data.parseStatus === 'done') {
          parseStatus.value = 'done'
          parseProgress.value = { pct: 100, posts: data.postCount || 0, comments: 0 }
          stopPolling()
          eventSource?.close()
        } else if (data.parseStatus === 'failed') {
          parseStatus.value = 'error'
          stopPolling()
          eventSource?.close()
        }
      } catch {}
    }, 2000)
  }

  async function startParse(sessionId: string, config: any) {
    parseStatus.value = 'running'
    parseProgress.value = { pct: 0, posts: 0, comments: 0 }
    parseMessage.value = 'Запускаємо парсинг...'
    parseLogs.value = []
    parseStartTime.value = Date.now()
    addLog('Запускаємо парсинг...')
    await redditApi.startParse(sessionId, config)

    if (eventSource) eventSource.close()
    eventSource = new EventSource(`/api/sessions/${sessionId}/parse/status`)

    eventSource.onmessage = (e) => {
      stopPolling()
      const data = JSON.parse(e.data)
      if (data.type === 'progress') {
        parseProgress.value = { pct: data.pct, posts: data.posts, comments: data.comments }
        if (data.message) { parseMessage.value = data.message; addLog(data.message) }
      } else if (data.type === 'done') {
        parseStatus.value = 'done'
        parseProgress.value = { pct: 100, posts: data.posts || 0, comments: data.comments || 0 }
        parseMessage.value = 'Готово!'
        addLog('Готово!')
        eventSource?.close()
      } else if (data.type === 'error') {
        parseStatus.value = 'error'
        parseMessage.value = 'Помилка парсингу'
        addLog('Помилка парсингу')
        eventSource?.close()
      }
    }

    eventSource.onerror = () => {
      eventSource?.close()
      // SSE failed — fall back to polling
      if (parseStatus.value === 'running') startPolling(sessionId)
    }

    // Fallback: if no SSE event within 4s, start polling
    setTimeout(() => {
      if (parseStatus.value === 'running' && !pollInterval) startPolling(sessionId)
    }, 4000)
  }

  function resetParse() {
    parseStatus.value = 'idle'
    parseProgress.value = null
    parseMessage.value = ''
    parseLogs.value = []
    parseStartTime.value = null
    stopPolling()
    if (eventSource) { eventSource.close(); eventSource = null }
  }

  return { posts, totalPosts, loading, parseProgress, parseStatus, parseMessage, parseLogs, parseStartTime, fetchPosts, startParse, resetParse }
})
