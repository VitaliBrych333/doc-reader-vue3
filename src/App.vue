<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
.v-toolbar__content {
  overflow: visible;
}

.compare-view .v-layout header {
  width: 50%;
}

.v-badge__badge {
  z-index: 999;
}

</style>
