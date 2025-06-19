<script lang='ts'>
export default {
  props: ['showMessage', 'title', 'text', 'showBtnCancel'],
  emits: ['clickCancel', 'clickOk'],
}
</script>

<template>
  <v-dialog
    :model-value="showMessage"
    width="auto"
  >
    <v-card
      max-width="400"
      prepend-icon="mdi-update"
      :text="text"
      :title="title"
    >
      <template v-slot:actions>
        <v-btn
          v-if="showBtnCancel"
          class="mr-3"
          text="Cancel"
          @click="$emit('clickCancel')"
        ></v-btn>

        <v-btn
          text="Ok"
          @click="$emit('clickOk')"
        ></v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>
