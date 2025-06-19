<script lang='ts'>
import { storeDocument } from '../store/storeDocument';

export default {
  data() {
    return {
      storeDocument,
    };
  },

  beforeUnmount() {
    storeDocument.resetSettingsForCompareMode();
  }
};
</script>

<template>
  <div class="separator">
    <div
      title="Synchronous Scrolling"
      class="lock-scroll-btn"
      :class="{ active: storeDocument.isSynchronousScroll}"
      @click="storeDocument.toggleSynchronous"
    >
      <v-icon :icon="storeDocument.isSynchronousScroll ? 'mdi-attachment-lock' : 'mdi-attachment'"></v-icon>
    </div>
  </div>
</template>

<style scoped>
.separator {
  position: absolute;
  display: flex;
  width: 4px;
  min-width: 4px;
  align-items: center;
  justify-content: center;
  background-color: gray;
  user-select: none;
  height: calc(100vh - 64px);
  top: 64px;
  left: calc((100% - 4px)/2);
  z-index: 1000;
}

.lock-scroll-btn {
  z-index: 1;
  position: absolute;
  display: flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: gray;
  background-color: #fff;
  cursor: pointer;
  box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.05), 0 2px 10px 0 rgba(0, 0, 0, 0.05);
  border: 2px solid transparent;
  transition: border 0.25s ease;
}

.lock-scroll-btn:hover {
  background-color: lightgray;
}

.lock-scroll-btn.active {
  background-color: lightskyblue;
}

</style>
