<script lang='ts'>
export default {
  data() {
    return {
      error: null as unknown,
      errorMessage: '',
    };
  },

  errorCaptured(error, vm, info) {
    this.error = error;
    this.errorMessage = info;
    return false; // Prevents the error from propagating further
  },
};
</script>

<template>
  <div v-if="error"></div>
  <div v-else><slot></slot></div>
</template>
