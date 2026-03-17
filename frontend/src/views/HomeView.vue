<template>
  <div class="home-view">
    <div class="home-content">
      <h1>Reddit Analyzer</h1>
      <p>Parse Reddit by keywords and analyze trends with AI</p>
      <el-button type="primary" size="large" @click="showCreateModal = true">
        <el-icon><Plus /></el-icon>
        New Session
      </el-button>
    </div>
    <CreateSessionModal v-if="showCreateModal" @close="showCreateModal = false" @created="onCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import CreateSessionModal from '../components/layout/CreateSessionModal.vue'

const router = useRouter()
const showCreateModal = ref(false)

function onCreated(session: any) {
  showCreateModal.value = false
  router.push(`/sessions/${session.id}`)
}
</script>

<style scoped>
.home-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.home-content {
  text-align: center;
}
.home-content h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #333;
}
.home-content p {
  color: #666;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}
</style>
