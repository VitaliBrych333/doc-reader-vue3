<script lang='ts'>
import { storeDocument } from '../store/storeDocument'
import DialogWindow from './shared/DialogWindow.vue'
import { ActionName } from '../shared/actionNames.enum'
import { getDocName, getSQLFormatDate } from '../utils/utils'

export default {
  props: [
    'activeDoc',
    'isEditMode'
  ],

  components: {
    DialogWindow
  },

  data() {
    return {
      storeDocument,
      ActionName,
      showRename: false,
      docNameRules: [
        (value: string) => {
          if (value) return true

          return 'Name is required.'
        },
      ],
      dateRules: [
        (value: string) => {
          if (value) return true

          return 'Date is required.'
        },
      ],
      docName: null,
      docId: null,
      comments: null,
      author: null,
      dateCreated: null,
      dateModified: null
    }
  },

  mounted() {
    if (this.activeDoc) {
      this.setDocumentInfo()
    }
  },

  watch: {
    activeDoc(newDoc) {
      if (newDoc) {
        this.setDocumentInfo()
      }
    },
  },

  methods: {
    setDocumentInfo() {
      const { comments, author, dateCreated, dateModified } = this.activeDoc.info
      const id = this.activeDoc.id

      this.docName = getDocName(this.activeDoc.name)
      this.docId = id.startsWith('new-doc') ? id : id.slice(4)
      this.comments = comments
      this.author = author
      this.dateCreated = dateCreated
      this.dateModified = dateModified
    },

    handleRename(value: { actionNameOk: string; docName: string; docText: string }) {
      storeDocument.changeNameDocument(this.activeDoc.id, value.docName)

      if (this.isEditMode) {
        storeDocument.addDocumentsStack()
      }

      this.showRename = false
    },

    updateDate(id: string, newDate: Date) {
      if (newDate) {
        this.updateInfo(id)
      }
    },

    updateInfo(id: string) {
      const { comments, author } = this
      const dateCreated = getSQLFormatDate(new Date(this.dateCreated))
      const dateModified = getSQLFormatDate(new Date(this.dateModified))

      storeDocument.updateDocumentInfo(id, { comments, author, dateCreated, dateModified })
    }
  },
}
</script>
<template>
  <div v-if="storeDocument.inProgress" class="spinner">
    <v-progress-circular
      color="deep-orange-lighten-1"
      indeterminate
      size="90"
      width="8"
    ></v-progress-circular>
  </div>

  <DialogWindow
    v-if="showRename"
    :modelValue="showRename"
    :title="'Rename document'"
    :name="docName"
    :actionNameOk="ActionName.RENAME"
    :showText="false"
    @cancel="showRename = false"
    @ok="handleRename"
  />

  <v-form
    v-if="activeDoc"
    class="wrapper-panel"
    lass="form"
    @submit.prevent
  >
    <div class="doc-name">Document Name: <br><span @click="showRename = true">{{ docName }}</span></div>

    <div class="doc-id">Document Id: <br>{{ docId }}</div>

    <v-text-field
      v-model="comments"
      label="Comments"
      density="compact"
      variant="outlined"
      clearable
      @update:modelValue="updateInfo(activeDoc.id)"
    ></v-text-field>

    <v-text-field
      v-model="author"
      label="Author"
      density="compact"
      variant="outlined"
      clearable
      @update:modelValue="updateInfo(activeDoc.id)"
    ></v-text-field>

    <v-date-input
      v-model="dateCreated"
      :rules="dateRules"
      label="Date Created"
      input-format="dd/mm/yyyy"
      prepend-icon=""
      prepend-inner-icon="$calendar"
      placeholder="dd/mm/yyyy"
      density="compact"
      variant="outlined"
      clearable
      @update:modelValue="updateDate(activeDoc.id, $event)"

    ></v-date-input>

    <v-date-input
      v-model="dateModified"
      :rules="dateRules"
      label="Date Modified"
      input-format="dd/mm/yyyy"
      prepend-icon=""
      prepend-inner-icon="$calendar"
      placeholder="dd/mm/yyyy"
      density="compact"
      variant="outlined"
      clearable
      @update:modelValue="updateDate(activeDoc.id, $event)"
    ></v-date-input>

    <div class="count">Count pages: {{ activeDoc.pages.length }}</div>
  </v-form>
</template>

<style scoped>
.wrapper-panel {
  height: calc(100vh - 64px);
  padding: 20px;
}

.doc-name span {
  text-decoration: underline dotted;
}

.doc-name span:hover {
  cursor: pointer
}

.doc-name, .doc-id, .count {
  font-size: 18px;
  margin-bottom: 20px;
}

.spinner {
  position: absolute;
  z-index: 999;
  width: 100%;
  height: 100%;
}

.spinner div {
  top: calc(50% - 45px);
  left: calc(50% - 45px);
}
</style>
