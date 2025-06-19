<script lang="ts">
export default {
  props: ['modelValue', 'title', 'name', 'showText', 'text', 'actionNameOk'],
  emits: ['cancel', 'ok'],

  data() {
    return {
      docName: this.name ?? '',
      docNameRules: [
        (value: string) => {
          if (value) return true

          return 'Name is required.'
        },
      ],
      docText: this.text ?? '',
    }
  },
}
</script>

<template>
  <v-dialog :model-value="modelValue" persistent>
    <v-card class="mx-auto pa-12 pb-8" elevation="8" width="500" rounded="lg" :title="title">
      <div class="text-subtitle-1 text-medium-emphasis">Name Document</div>
      <v-text-field
        v-model.trim="docName"
        :rules="docNameRules"
        density="compact"
        placeholder="Name Document"
        prepend-inner-icon="mdi-account-badge-outline"
        variant="outlined"
        clearable
      ></v-text-field>

      <div v-if="showText" class="text-subtitle-1 text-medium-emphasis">Text</div>
      <v-text-field
        v-if="showText"
        v-model.trim="docText"
        density="compact"
        placeholder="Text"
        prepend-inner-icon="mdi-account-badge-outline"
        variant="outlined"
        clearable
      ></v-text-field>

      <v-btn
        class="mb-8"
        color="blue"
        size="large"
        variant="tonal"
        block
        @click="$emit('cancel')"
      >
        Cancel
      </v-btn>

      <v-btn
        class="mb-8"
        color="blue"
        size="large"
        variant="tonal"
        :disabled="!docName"
        block
        @click="$emit('ok', { actionNameOk, docName, docText })"
      >
        {{ actionNameOk }}
      </v-btn>
    </v-card>
  </v-dialog>
</template>

<style scoped>

</style>
