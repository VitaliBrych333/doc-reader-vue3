<script lang='ts'>
import ErrorBoundary from '../components/ErrorBoundary.vue';
import ViewerReader from '../components/ViewerReader.vue';

export default {
  components: {
    ErrorBoundary,
    ViewerReader
  },
};
</script>

<template>
  <ErrorBoundary>
    <div class="viewer">
      <ViewerReader :isEditMode="true" />
    </div>
    <footer></footer>
  </ErrorBoundary>
</template>

<style scoped>
.viewer {
  width: 100%;
  background-color: yellowgreen;
}

</style>
