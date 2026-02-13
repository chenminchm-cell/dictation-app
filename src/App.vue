<template>
  <div class="app-container">
    <router-view v-slot="{ Component }">
      <keep-alive include="TaskList">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup>
</script>

<style scoped>
.app-container {
  width: 100%;
  min-height: 100vh;
  background: #f7f8fa;
}
</style>
