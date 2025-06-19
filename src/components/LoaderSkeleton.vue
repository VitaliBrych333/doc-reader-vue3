<template>
  <div class="wrapper">
    <div class="header">
      <div class="skeleton-btn nav"></div>
      <div class="rotate">
        <div class="skeleton-btn rotate-left"></div>
        <div class="skeleton-btn rotate-right"></div>
      </div>
      <div class="skeleton-btn zoom"></div>
      <div class="skeleton-btn annotations"></div>

      <div class="actions">
        <div class="skeleton-btn"></div>
        <div class="skeleton-btn"></div>
        <div class="skeleton-btn"></div>
      </div>
    </div>

    <div class="loading">
      <div class="skeleton"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  display: flex;
  align-items: center;
  flex-direction: column;
  border: 2px solid rgba(109, 129, 95, 0.32);
}

.header {
  width: 100%;
  height: 64px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-bottom: 2px solid rgba(109, 129, 95, 0.32);
}

.rotate, .actions {
  display: flex;
}

.loading {
  display: flex;
  align-items: center;
  flex-direction: column;
  height: 100%;
}

.skeleton {
  width: 210px;
  height: 300px;
  animation: loading 0.9s infinite;
  margin: 15px 0;
}

.skeleton-btn {
  width: 40px;
  height: 40px;
  border-radius: 10%;
  animation: loading 0.9s infinite;
  margin-right: 10px;
}

.nav, .zoom {
  width: 120px;
}

.zoom {
  margin-right: 34px;
}

@keyframes loading {
  0%,
  100% {
    background-color: rgba(109, 129, 95, 0.32);
  }

  50% {
    background-color: rgba(109, 129, 95, 0.2);
  }
}
</style>
