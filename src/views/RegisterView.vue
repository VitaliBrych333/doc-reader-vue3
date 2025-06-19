<script lang='ts'>
import RegisterForm from '../components/RegisterForm.vue'
import ErrorBoundary from '../components/ErrorBoundary.vue';

export default {
  components: {
    ErrorBoundary,
    RegisterForm,
  },
};
</script>

<template>
  <ErrorBoundary>
    <RegisterForm />
  </ErrorBoundary>
</template>
