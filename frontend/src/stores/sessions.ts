import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sessionsApi } from '../api/sessions'

export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref<any[]>([])
  const activeSession = ref<any>(null)
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      sessions.value = await sessionsApi.getAll()
    } finally {
      loading.value = false
    }
  }

  async function fetchOne(id: string) {
    activeSession.value = await sessionsApi.getOne(id)
    return activeSession.value
  }

  async function create(name: string) {
    const session = await sessionsApi.create(name)
    sessions.value.unshift(session)
    return session
  }

  async function update(id: string, data: any) {
    const updated = await sessionsApi.update(id, data)
    if (activeSession.value?.id === id) {
      activeSession.value = { ...activeSession.value, ...updated }
    }
    return updated
  }

  async function remove(id: string) {
    await sessionsApi.delete(id)
    sessions.value = sessions.value.filter(s => s.id !== id)
    if (activeSession.value?.id === id) activeSession.value = null
  }

  return { sessions, activeSession, loading, fetchAll, fetchOne, create, update, remove }
})
