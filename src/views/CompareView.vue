<script lang="ts">
import ErrorBoundary from '../components/ErrorBoundary.vue'
import ViewerReader from '../components/ViewerReader.vue'
import SeparatorViewer from '../components/SeparatorViewer.vue'

export default {
  components: {
    ErrorBoundary,
    ViewerReader,
    SeparatorViewer,
  },

  data() {
    return {
      firstViewerReady: false,
      secondViewerReady: false
    }
  },
}
</script>

<template>
  <ErrorBoundary>
    <div class="wrapper-viewers">
      <div class="viewer">
        <ViewerReader
          :isWrappedView="false"
          :isCompareView="true"
          :isFirstViewer="true"
          :isSecondViewer="false"
          @allLoaded="firstViewerReady = true"
        />
      </div>

      <SeparatorViewer v-if="firstViewerReady && secondViewerReady" />

      <div class="viewer">
        <ViewerReader
          :isWrappedView="false"
          :isCompareView="true"
          :isFirstViewer="false"
          :isSecondViewer="true"
          @allLoaded="secondViewerReady = true"
        />
      </div>
    </div>

    <footer></footer>
  </ErrorBoundary>
</template>

<style scoped>
.wrapper-viewers {
  width: 100%;
  display: flex;
}

.viewer {
  position: relative;
  width: 50%;
  background-color: #8C9EFF;
}

</style>
