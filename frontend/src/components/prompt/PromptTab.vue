<template>
  <div class="prompt-tab">
    <div class="prompt-header">
      <h3>System Prompt</h3>
      <el-button size="small" @click="resetToDefault">Reset to Default</el-button>
    </div>
    <p class="prompt-description">
      This prompt guides the AI analysis. It's applied when you run analysis in the Analysis tab.
      Changes are saved automatically.
    </p>
    <el-input
      v-model="prompt"
      type="textarea"
      :rows="14"
      placeholder="Enter your system prompt..."
      @blur="save"
    />
    <div class="prompt-footer">
      <span class="char-count">{{ prompt.length }} characters</span>
      <el-button type="primary" size="small" :loading="saving" @click="save">Save</el-button>
    </div>
    <div v-if="saved" class="saved-indicator">Saved!</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSessionsStore } from '../../stores/sessions'

const props = defineProps<{ session: any }>()
const emit = defineEmits<{ updated: [data: any] }>()
const store = useSessionsStore()

const DEFAULT_PROMPT = `You are a senior marketing analyst specializing in consumer insights from social media.
Analyze the Reddit data provided and extract actionable marketing insights.

Focus on:
1. What problems/pain points do people mention most?
2. What solutions or products do they praise or criticize?
3. What language and terminology do they use (for ad copy)?
4. What are the emerging trends in this space?
5. What opportunities exist for marketing?

Be specific, practical, and data-driven in your analysis.`

const prompt = ref(props.session?.systemPrompt || DEFAULT_PROMPT)
const saving = ref(false)
const saved = ref(false)

watch(() => props.session?.systemPrompt, (val) => {
  if (val !== undefined) prompt.value = val || DEFAULT_PROMPT
})

function resetToDefault() {
  prompt.value = DEFAULT_PROMPT
  save()
}

async function save() {
  saving.value = true
  try {
    const updated = await store.update(props.session.id, { systemPrompt: prompt.value })
    emit('updated', updated)
    saved.value = true
    setTimeout(() => saved.value = false, 2000)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.prompt-tab { padding: 8px 0; max-width: 800px; }
.prompt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.prompt-header h3 { margin: 0; }
.prompt-description { color: #888; font-size: 0.85rem; margin-bottom: 12px; }
.prompt-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.char-count { font-size: 0.8rem; color: #aaa; }
.saved-indicator {
  color: #67c23a;
  font-size: 0.85rem;
  margin-top: 6px;
}
</style>
