<template>
  <el-dialog title="New Session" v-model="visible" width="400px" @close="emit('close')">
    <el-form @submit.prevent="create">
      <el-form-item label="Session Name" required>
        <el-input
          v-model="name"
          placeholder="e.g. SaaS Pain Points Q1 2025"
          autofocus
          @keyup.enter="create"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('close')">Cancel</el-button>
      <el-button type="primary" :loading="loading" @click="create">Create</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useSessionsStore } from '../../stores/sessions'

const emit = defineEmits<{ close: []; created: [session: any] }>()
const store = useSessionsStore()
const visible = ref(true)
const name = ref('')
const loading = ref(false)

async function create() {
  if (!name.value.trim()) {
    ElMessage.warning('Session name is required')
    return
  }
  loading.value = true
  try {
    const session = await store.create(name.value.trim())
    emit('created', session)
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Failed to create session')
  } finally {
    loading.value = false
  }
}
</script>
