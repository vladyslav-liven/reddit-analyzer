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

  let lastLoggedMessage = ''

  function startPolling(sessionId: string) {
    stopPolling()
    pollInterval = setInterval(async () => {
      try {
        // 1. Try to get live progress from the in-memory store
        const { data: progress } = await api.get(`/sessions/${sessionId}/parse/progress`)
        if (progress) {
          parseProgress.value = { pct: progress.pct, posts: progress.posts, comments: progress.comments }
          if (progress.message && progress.message !== lastLoggedMessage) {
            parseMessage.value = progress.message
            addLog(progress.message)
            lastLoggedMessage = progress.message
          }
          return
        }

        // 2. No live progress — check session status (done/failed)
        const { data: session } = await api.get(`/sessions/${sessionId}`)
        if (session.parseStatus === 'done') {
          parseStatus.value = 'done'
          parseProgress.value = { pct: 100, posts: session.postCount || parseProgress.value?.posts || 0, comments: parseProgress.value?.comments || 0 }
          parseMessage.value = 'Готово!'
          addLog('Готово!')
          stopPolling()
        } else if (session.parseStatus === 'failed') {
          parseStatus.value = 'error'
          parseMessage.value = 'Помилка парсингу'
          addLog('Помилка парсингу')
          stopPolling()
        } else if (session.parseStatus === 'running') {
          // Job is alive but no progress yet — still waiting for first Reddit response
          const elapsed = parseStartTime.value ? Math.round((Date.now() - parseStartTime.value) / 1000) : 0
          if (elapsed > 30 && lastLoggedMessage !== 'Чекаємо на Reddit...') {
            parseMessage.value = 'Чекаємо на Reddit...'
            addLog('Чекаємо на Reddit...')
            lastLoggedMessage = 'Чекаємо на Reddit...'
          }
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
    lastLoggedMessage = ''
    addLog('Запускаємо парсинг...')
    await redditApi.startParse(sessionId, config)

    // Start polling immediately — works on Railway where SSE is unreliable
    startPolling(sessionId)

    // Also try SSE — if it works (local dev), it gives real-time updates
    if (eventSource) eventSource.close()
    eventSource = new EventSource(`/api/sessions/${sessionId}/parse/status`)

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'progress') {
        parseProgress.value = { pct: data.pct, posts: data.posts, comments: data.comments }
        if (data.message && data.message !== lastLoggedMessage) {
          parseMessage.value = data.message
          addLog(data.message)
          lastLoggedMessage = data.message
        }
      } else if (data.type === 'done') {
        parseStatus.value = 'done'
        parseProgress.value = { pct: 100, posts: data.posts || 0, comments: data.comments || 0 }
        parseMessage.value = 'Готово!'
        addLog('Готово!')
        stopPolling()
        eventSource?.close()
      } else if (data.type === 'error') {
        parseStatus.value = 'error'
        parseMessage.value = 'Помилка парсингу'
        addLog('Помилка парсингу')
        stopPolling()
        eventSource?.close()
      }
    }

    eventSource.onerror = () => { eventSource?.close() }
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
