<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">Reddit Analyzer</span>
      <el-button size="small" type="primary" @click="showCreate = true">
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>
    <div class="sidebar-list">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: route.params.id === session.id }"
        @click="router.push(`/sessions/${session.id}`)"
      >
        <div class="session-item-name">{{ session.name }}</div>
        <div class="session-item-meta">
          <el-tag :type="statusColor(session.parseStatus)" size="small" style="margin-right:4px">
            {{ session.parseStatus }}
          </el-tag>
          <span class="post-count">{{ session.postCount || 0 }} posts</span>
        </div>
        <el-popconfirm
          title="Delete this session?"
          @confirm="deleteSession(session.id)"
          @click.stop
        >
          <template #reference>
            <el-button
              class="delete-btn"
              size="small"
              type="danger"
              text
              @click.stop
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-popconfirm>
      </div>
      <div v-if="sessions.length === 0 && !loading" class="empty-sidebar">
        No sessions yet.<br>Click + to create one.
      </div>
    </div>
    <CreateSessionModal v-if="showCreate" @close="showCreate = false" @created="onCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSessionsStore } from '../../stores/sessions'
import CreateSessionModal from './CreateSessionModal.vue'

const router = useRouter()
const route = useRoute()
const store = useSessionsStore()
const sessions = computed(() => store.sessions)
const loading = computed(() => store.loading)
const showCreate = ref(false)

function statusColor(status: string) {
  return { idle: 'info', running: 'warning', done: 'success', failed: 'danger' }[status] || 'info'
}

async function deleteSession(id: string) {
  await store.remove(id)
  if (route.params.id === id) router.push('/')
}

function onCreated(session: any) {
  showCreate.value = false
  router.push(`/sessions/${session.id}`)
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  min-width: 260px;
  background: #1a1a2e;
  color: white;
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.sidebar-title {
  font-weight: 700;
  font-size: 1rem;
}
.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.session-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  position: relative;
  transition: background 0.15s;
}
.session-item:hover { background: rgba(255,255,255,0.08); }
.session-item.active { background: rgba(99, 102, 241, 0.3); }
.session-item-name {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}
.session-item-meta {
  display: flex;
  align-items: center;
}
.post-count {
  font-size: 0.75rem;
  color: #aaa;
}
.delete-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.15s;
}
.session-item:hover .delete-btn { opacity: 1; }
.empty-sidebar {
  text-align: center;
  color: #888;
  font-size: 0.85rem;
  margin-top: 32px;
  line-height: 1.6;
}
</style>
