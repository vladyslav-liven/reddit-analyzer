<template>
  <div class="results-tab">
    <div class="results-toolbar">
      <el-radio-group v-model="sortBy" @change="loadPosts">
        <el-radio-button label="score">By Score</el-radio-button>
        <el-radio-button label="ratio">By Upvote %</el-radio-button>
        <el-radio-button label="comments">By Comments</el-radio-button>
      </el-radio-group>
      <el-checkbox v-model="viralOnly" label="Viral only 🔥" @change="loadPosts" />
      <span class="post-count">{{ totalPosts }} posts found</span>
    </div>

    <div v-if="loading" class="loading">
      <el-skeleton v-for="i in 3" :key="i" :rows="3" animated style="margin-bottom: 12px" />
    </div>

    <div v-else-if="posts.length === 0" class="empty">
      <el-empty description="No posts found. Run parsing first." />
    </div>

    <div v-else>
      <PostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        :session-id="sessionId"
      />
      <el-pagination
        v-if="totalPosts > pageSize"
        v-model:current-page="page"
        :page-size="pageSize"
        :total="totalPosts"
        layout="prev, pager, next"
        style="margin-top: 16px; justify-content: center"
        @current-change="loadPosts"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRedditStore } from '../../stores/reddit'
import PostCard from './PostCard.vue'

const props = defineProps<{ sessionId: string }>()
const redditStore = useRedditStore()
const posts = computed(() => redditStore.posts)
const totalPosts = computed(() => redditStore.totalPosts)
const loading = computed(() => redditStore.loading)

const sortBy = ref('score')
const viralOnly = ref(false)
const page = ref(1)
const pageSize = 20

async function loadPosts() {
  await redditStore.fetchPosts(props.sessionId, {
    sort: sortBy.value,
    viral: viralOnly.value || undefined,
    page: page.value,
    limit: pageSize,
  })
}

onMounted(loadPosts)
watch(() => redditStore.parseStatus, (s) => { if (s === 'done') loadPosts() })
</script>

<style scoped>
.results-tab { padding: 8px 0; }
.results-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.post-count { color: #888; font-size: 0.85rem; margin-left: auto; }
.loading, .empty { padding: 16px 0; }
</style>
