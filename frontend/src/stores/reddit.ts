import { defineStore } from 'pinia'
import { ref } from 'vue'
import { redditApi } from '../api/reddit'

export const useRedditStore = defineStore('reddit', () => {
  const posts = ref<any[]>([])
  const totalPosts = ref(0)
  const loading = ref(false)
  const parseProgress = ref<{ pct: number; posts: number; comments: number } | null>(null)
  const parseStatus = ref<'idle' | 'running' | 'done' | 'error'>('idle')
  let eventSource: EventSource | null = null

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

  async function startParse(sessionId: string, config: any) {
    parseStatus.value = 'running'
    parseProgress.value = { pct: 0, posts: 0, comments: 0 }
    await redditApi.startParse(sessionId, config)

    if (eventSource) eventSource.close()
    eventSource = new EventSource(`/api/sessions/${sessionId}/parse/status`)

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'progress') {
        parseProgress.value = { pct: data.pct, posts: data.posts, comments: data.comments }
      } else if (data.type === 'done') {
        parseStatus.value = 'done'
        parseProgress.value = { pct: 100, posts: data.posts || 0, comments: data.comments || 0 }
        eventSource?.close()
      } else if (data.type === 'error') {
        parseStatus.value = 'error'
        eventSource?.close()
      }
    }
    eventSource.onerror = () => {
      if (parseStatus.value === 'running') parseStatus.value = 'error'
      eventSource?.close()
    }
  }

  function resetParse() {
    parseStatus.value = 'idle'
    parseProgress.value = null
    if (eventSource) { eventSource.close(); eventSource = null }
  }

  return { posts, totalPosts, loading, parseProgress, parseStatus, fetchPosts, startParse, resetParse }
})
