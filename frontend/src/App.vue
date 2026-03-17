<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSessionsStore } from './stores/sessions'

const sessionsStore = useSessionsStore()
onMounted(() => sessionsStore.fetchAll())
</script>

<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
</style>
