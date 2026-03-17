<template>
  <div class="post-card" :class="{ viral: post.isViral }">
    <div class="post-header">
      <div class="post-meta">
        <el-tag v-if="post.isViral" type="danger" size="small" style="margin-right: 6px">🔥 VIRAL</el-tag>
        <el-tag size="small" style="margin-right: 6px">r/{{ post.subreddit }}</el-tag>
        <span class="post-score">▲ {{ post.score.toLocaleString() }}</span>
        <span class="post-ratio">{{ Math.round(post.upvoteRatio * 100) }}% upvoted</span>
        <span class="post-comments">💬 {{ post.numComments.toLocaleString() }}</span>
      </div>
      <a :href="post.url" target="_blank" class="post-link">
        <el-icon><Link /></el-icon>
      </a>
    </div>
    <div class="post-title" @click="toggleExpand">{{ post.title }}</div>
    <div v-if="expanded">
      <div v-if="post.selftext" class="post-body">{{ post.selftext }}</div>
      <div class="comments-section">
        <div v-if="loadingComments" class="loading-comments">
          <el-skeleton :rows="2" animated />
        </div>
        <div v-else-if="comments.length > 0">
          <div class="comments-title">Top Comments</div>
          <div v-for="comment in comments" :key="comment.id" class="comment">
            <div class="comment-meta">
              <span class="comment-author">u/{{ comment.author }}</span>
              <span class="comment-score">▲ {{ comment.score }}</span>
            </div>
            <div class="comment-body">{{ comment.body }}</div>
          </div>
        </div>
        <div v-else class="no-comments">No comments fetched</div>
      </div>
    </div>
    <div class="post-footer">
      <span class="post-author">by u/{{ post.author }}</span>
      <el-button text size="small" @click="toggleExpand">
        {{ expanded ? 'Collapse' : 'Show comments' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { redditApi } from '../../api/reddit'

const props = defineProps<{ post: any; sessionId: string }>()
const expanded = ref(false)
const comments = ref<any[]>([])
const loadingComments = ref(false)

async function toggleExpand() {
  expanded.value = !expanded.value
  if (expanded.value && comments.value.length === 0) {
    loadingComments.value = true
    try {
      comments.value = await redditApi.getComments(props.sessionId, props.post.id)
    } finally {
      loadingComments.value = false
    }
  }
}
</script>

<style scoped>
.post-card {
  background: white;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 10px;
  border: 1px solid #eee;
  transition: border-color 0.15s;
}
.post-card:hover { border-color: #c0c4cc; }
.post-card.viral { border-left: 4px solid #f56c6c; }
.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.post-meta { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #666; flex-wrap: wrap; }
.post-score { color: #ff6314; font-weight: 600; }
.post-ratio { color: #888; }
.post-comments { color: #888; }
.post-link { color: #409eff; }
.post-title {
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  color: #1a1a2e;
  margin-bottom: 8px;
  line-height: 1.4;
}
.post-title:hover { color: #409eff; }
.post-body {
  font-size: 0.85rem;
  color: #555;
  background: #f8f9fa;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 10px;
  white-space: pre-wrap;
}
.post-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.post-author { font-size: 0.75rem; color: #aaa; }
.comments-section { margin-top: 10px; }
.comments-title { font-size: 0.8rem; font-weight: 600; color: #666; margin-bottom: 8px; }
.comment {
  border-left: 3px solid #e8e8e8;
  padding-left: 12px;
  margin-bottom: 10px;
}
.comment-meta { display: flex; gap: 12px; font-size: 0.75rem; color: #888; margin-bottom: 4px; }
.comment-author { font-weight: 600; }
.comment-score { color: #ff6314; }
.comment-body { font-size: 0.85rem; color: #444; line-height: 1.5; }
.no-comments { font-size: 0.8rem; color: #aaa; }
</style>
