import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aiApi } from '../api/ai'

export const useAnalysisStore = defineStore('analysis', () => {
  const analyses = ref<any[]>([])
  const activeAnalysis = ref<any>(null)
  const loading = ref(false)

  async function fetchAnalyses(sessionId: string) {
    const data = await aiApi.getAnalyses(sessionId)
    analyses.value = data
    if (data.length > 0) activeAnalysis.value = data[0]
  }

  async function runAnalysis(sessionId: string, provider: string) {
    loading.value = true
    try {
      const result = await aiApi.analyze(sessionId, provider)
      analyses.value.unshift(result)
      activeAnalysis.value = result
      return result
    } finally {
      loading.value = false
    }
  }

  return { analyses, activeAnalysis, loading, fetchAnalyses, runAnalysis }
})
