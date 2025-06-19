<script lang="ts">
import { storeDocument } from '../store/storeDocument'
import { storeEditActions } from '../store/storeEditActions'
import DialogWindow from './shared/DialogWindow.vue'
import { ActionName } from '../shared/actionNames.enum'
import type { IPage } from '../shared/document.interface'
import { Document, Page, getDocName } from '../utils/utils'

export default {
  components: {
    DialogWindow,
  },

  data() {
    return {
      storeDocument,
      storeEditActions,
      docName: '',
      showDialog: false,
      dialogTitle: '',
      dialogBtnOk: ''
    }
  },

  mounted() {
    storeDocument.addDocumentsStack()
  },

  beforeUnmount() {
    storeDocument.clearDocumentsStack()
  },

  computed: {
    inProgress() {
      return storeDocument.inProgress
    },

    selectedPageIds() {
      return storeDocument.selectedPageIds
    },

    countSelectedPageIds() {
      return this.selectedPageIds.length
    },

    selectedDocIds() {
      return storeDocument.selectedDocIds
    },

    countSelectedDocIds() {
      return this.selectedDocIds.length
    },

    countCutPageIds() {
      return storeEditActions.cutPageIds.length
    },

    countCutDocIds() {
      return storeEditActions.cutDocIds.length
    },

    countCopyPageIds() {
      return storeEditActions.copyPageIds.length
    },

    countCopyDocIds() {
      return storeEditActions.copyDocIds.length
    },

    createActive() {
      return this.countSelectedPageIds || this.countSelectedDocIds > 1
    },

    renameActive() {
      return this.countSelectedDocIds === 1
    },

    splitActive() {
      return (
        this.countSelectedPageIds === 1 &&
        storeDocument.getAllPages().find((page: IPage) => page.pageId === this.selectedPageIds[0])?.numPage !== 1
      )
    },

    copyActive() {
      return this.countSelectedPageIds > 0 || this.countSelectedDocIds > 0
    },

    cutActive() {
      return this.countSelectedPageIds > 0 || this.countSelectedDocIds > 0
    },

    pasteActive() {
      return !!(
        ((this.countCutPageIds || this.countCopyPageIds) && this.countSelectedPageIds) ||
        ((this.countCutDocIds || this.countCopyDocIds) && this.countSelectedDocIds)
      )
    },

    deleteActive() {
      return !!(this.countSelectedPageIds || this.countSelectedDocIds)
    },

    undoActive() {
      return storeDocument.currentIndexDocumentsStack > 1
    },

    redoActive() {
      return storeDocument.currentIndexDocumentsStack < storeDocument.documentsStack.length
    },

    countSelected() {
      return this.countSelectedPageIds
        ? this.countSelectedPageIds
        : this.countSelectedDocIds
          ? this.countSelectedDocIds
          : 0
    },

    countCutOrCopy() {
      return this.countCutPageIds || this.countCopyPageIds
        ? this.countCutPageIds || this.countCopyPageIds
        : this.countCutDocIds || this.countCopyDocIds
          ? this.countCutDocIds || this.countCopyDocIds
          : 0
    },
  },

  methods: {
    showWindowDialog(title: string, nameBtnOk: string, docName = '') {
      this.showDialog = true
      this.dialogTitle = title
      this.docName = docName
      this.dialogBtnOk = nameBtnOk
    },

    closeDialog() {
      this.showDialog = false
    },

    rename() {
      const targetDoc = storeDocument.documents.find((doc) => doc.id === this.selectedDocIds[0])
      this.showWindowDialog('Rename document', ActionName.RENAME, getDocName(targetDoc.name))
    },

    create() {
      this.showWindowDialog('Create new document', ActionName.CREATE)
    },

    split() {
      this.showWindowDialog('Create new document', ActionName.SPLIT)
    },

    copy() {
      this.clearCopyOrCutIds()

      if (this.countSelectedPageIds) {
        this.selectedPageIds.forEach((pageId: string) => storeEditActions.addCopyPageId(pageId))
        storeDocument.clearSelectedPageIds()
        return
      }

      this.selectedDocIds.forEach((docId: string) => storeEditActions.addCopyDocId(docId))
      storeDocument.clearSelectedDocIds()
    },

    cut() {
      this.clearCopyOrCutIds()

      if (this.countSelectedPageIds) {
        this.selectedPageIds.forEach((pageId: string) => storeEditActions.addCutPageId(pageId))
        storeDocument.clearSelectedPageIds()
        return
      }

      this.selectedDocIds.forEach((docId: string) => storeEditActions.addCutDocId(docId))
      storeDocument.clearSelectedDocIds()
    },

    paste() {
      if (this.countCutPageIds) {
        // handler for cut pages
        const pageId = this.selectedPageIds[this.countSelectedPageIds - 1]
        const targetDoc = storeDocument.documents.find((doc) =>
          doc.pages.map((page) => page.pageId).includes(pageId),
        )
        storeDocument.clearSelectedPageIds()

        storeEditActions.cutPageIds.forEach((id: string, index: number) => {
          const page = storeDocument.getAllPages().find((page: IPage) => page.pageId === id)
          storeDocument.removePage(id)
          const numPositionTargetPage =
            storeDocument.documents
              .find((doc) => doc.id === targetDoc.id)
              .pages.findIndex((page) => page.pageId === pageId) +
            index +
            1

          storeDocument.addPage(targetDoc.id, page, numPositionTargetPage)
          storeDocument.addSelectedPageId(page.pageId, true)
        })

        storeEditActions.clearCutPageIds()
      } else if (this.countCopyPageIds) {
        // handler for copied pages
        const pageId = this.selectedPageIds[this.countSelectedPageIds - 1]
        const targetDoc = storeDocument.documents.find((doc) =>
          doc.pages.map((page) => page.pageId).includes(pageId),
        )
        let numPositionTargetPage = targetDoc.pages.findIndex((page) => page.pageId === pageId) + 1
        storeDocument.clearSelectedPageIds()

        storeEditActions.copyPageIds.forEach((id: string) => {
          const targetPage = storeDocument.getAllPages().find((page: IPage) => page.pageId === id)
          const { url, originalNumPage, originalDocumentId, rotate } = targetPage
          const page = new Page(
            numPositionTargetPage + 1,
            originalDocumentId,
            originalNumPage,
            url,
            rotate,
          )

          storeDocument.addPage(targetDoc.id, page, numPositionTargetPage)
          storeDocument.addSelectedPageId(page.pageId, true)

          numPositionTargetPage += 1
        })

        storeEditActions.clearCopyPageIds()
      } else if (this.countCutDocIds) {
        // handler for cut docs
        const docId = this.selectedDocIds[this.countSelectedDocIds - 1]
        storeDocument.clearSelectedDocIds()

        storeEditActions.cutDocIds.forEach((documentId: string, index: number) => {
          const doc = storeDocument.documents.find((doc) => doc.id === documentId)
          storeDocument.removeDocument(doc.id)
          const positionInsert =
            storeDocument.documents.findIndex((doc) => doc.id === docId) + index + 1

          storeDocument.addDocument(doc, positionInsert)
          storeDocument.addSelectedDocId(doc.id, true)
        })

        storeEditActions.clearCutDocIds()
      } else if (this.countCopyDocIds) {
        // handler for copied docs
        const docId = this.selectedDocIds[this.countSelectedDocIds - 1]
        let positionInsert = storeDocument.documents.findIndex((doc) => doc.id === docId)
        storeDocument.clearSelectedDocIds()

        storeEditActions.copyDocIds.forEach((documentId: string) => {
          const targetDoc = storeDocument.documents.find((doc) => doc.id === documentId)
          const { name, pages, info } = targetDoc
          const { comments, author, dateCreated } = info
          const newPages = []

          positionInsert += 1

          pages.forEach((pageDoc) => {
            const { url, originalNumPage, originalDocumentId, rotate } = pageDoc
            const page = new Page(
              newPages.length + 1,
              originalDocumentId,
              originalNumPage,
              url,
              rotate,
            )
            newPages.push(page)
          })

          const doc = new Document(name, newPages, undefined, { comments, author, dateCreated })

          storeDocument.addDocument(doc, positionInsert)
          storeDocument.addSelectedDocId(doc.id, true)
        })

        storeEditActions.clearCopyDocIds()
      }

      storeDocument.addDocumentsStack()
    },

    clearCopyOrCutIds() {
      if (this.countSelectedPageIds) {
        storeEditActions.clearCopyDocIds()
        storeEditActions.clearCutDocIds()
        return
      }

      storeEditActions.clearCopyPageIds()
      storeEditActions.clearCutPageIds()
    },

    remove() {
      if (this.countSelectedPageIds) {
        this.selectedPageIds.forEach((pageId: string) => storeDocument.removePage(pageId))
        storeDocument.clearSelectedPageIds()
      } else if (this.countSelectedDocIds) {
        this.selectedDocIds.forEach((docId: string) => storeDocument.removeDocument(docId))
        storeDocument.clearSelectedDocIds()
      }

      storeDocument.addDocumentsStack()
    },

    undo() {
      storeDocument.undo()
    },

    redo() {
      storeDocument.redo()
    },

    async actionOkDialog(value: { actionNameOk: string; docName: string; docText: string }) {
      const { actionNameOk, docName } = value

      if (actionNameOk === ActionName.RENAME) {
        this.handleRename(docName)
      }

      if (actionNameOk === ActionName.CREATE) {
        this.handleCreate(docName, storeDocument.documents.length)
      }

      if (actionNameOk === ActionName.SPLIT) {
        this.handleSplit(docName)
      }

      this.closeDialog()
    },

    handleRename(newName: string) {
      const docId = this.selectedDocIds[0]
      storeDocument.changeNameDocument(docId, newName)
      storeDocument.addDocumentsStack()
    },

    handleCreate(docName: string, docPositionInsert: number, fromSplit = false) {
      if (this.countSelectedPageIds) {
        const pages = []

        this.selectedPageIds.forEach((id: string, index: number) => {
          const targetPage = storeDocument.getAllPages().find((page: IPage) => page.pageId === id)
          const { url, originalNumPage, originalDocumentId, rotate } = targetPage
          const page = new Page(index + 1, originalDocumentId, originalNumPage, url, rotate)

          pages.push(page)
          storeDocument.removePage(id)
        })

        let comments = '', author = '', dateCreated = ''

        if (fromSplit) {
          const originalDoc = storeDocument.documents[docPositionInsert - 1]
          const { info } = originalDoc
          comments = info.comments
          author = info.author
          dateCreated = info.dateCreated
        }

        const doc = fromSplit
          ? new Document(`${docName}.pdf`, pages, undefined, { comments, author, dateCreated })
          : new Document(`${docName}.pdf`, pages)

        storeDocument.addDocument(doc, docPositionInsert)
        storeDocument.clearSelectedPageIds()
        storeDocument.addSelectedDocId(doc.id)

      } else if (this.countSelectedDocIds) {
        const pages = []
        const allComments = []
        const positionInsert = storeDocument.documents.findIndex(
          (doc) => doc.id === this.selectedDocIds[0],
        )

        this.selectedDocIds.forEach((id: string) => {
          const targetDoc = storeDocument.documents.find((doc) => doc.id === id)
          const targetPages = targetDoc.pages

          allComments.push(targetDoc.info.comments)

          targetPages.forEach((pageDoc) => {
            const { url, originalNumPage, originalDocumentId, rotate } = pageDoc
            const page = new Page(
              pages.length + 1,
              originalDocumentId,
              originalNumPage,
              url,
              rotate,
            )
            pages.push(page)
          })

          storeDocument.removeDocument(id)
        })

        const doc = new Document(`${docName}.pdf`, pages, undefined, { comments: allComments.join(', ') })

        storeDocument.addDocument(doc, positionInsert)
        storeDocument.addSelectedDocId(doc.id)
      }

      storeDocument.addDocumentsStack()
    },

    handleSplit(docName: string) {
      const pageId = this.selectedPageIds[0]
      const targetDoc = storeDocument.documents.find((doc) =>
        doc.pages.map((page) => page.pageId).includes(pageId),
      )
      const indexTargetPage = targetDoc.pages.findIndex((page) => page.pageId === pageId)
      const indexTargetDoc = storeDocument.documents.findIndex((doc) => doc.id === targetDoc.id)

      storeDocument.clearSelectedPageIds()

      targetDoc.pages
        .slice(indexTargetPage)
        .forEach((page) => storeDocument.addSelectedPageId(page.pageId, true))

      this.handleCreate(docName, indexTargetDoc + 1, true)

      storeDocument.addDocumentsStack()
    },
  },
}
</script>
<template>
  <DialogWindow
    v-if="showDialog"
    :modelValue="showDialog"
    :title="dialogTitle"
    :name="docName"
    :actionNameOk="dialogBtnOk"
    :showText="false"
    @cancel="closeDialog"
    @ok="actionOkDialog"
  />

  <div class="actions-mode">
    <v-divider color="black" thickness="2" vertical inset class="mx-3"></v-divider>

    <div class="actions-edit">
      <v-badge
        class="mr-3"
        color="deep-orange-lighten-2"
        :model-value="renameActive"
        max="99"
        :content="countSelectedDocIds"
      >
        <v-btn
          icon
          size="small"
          color="yellow-lighten-1"
          variant="elevated"
          :disabled="!renameActive || inProgress"
          @click="rename"
        >
          <v-icon>mdi-rename-box-outline</v-icon>
          <v-tooltip activator="parent" location="bottom">Rename</v-tooltip>
        </v-btn>
      </v-badge>

      <v-badge
        class="mr-3"
        :color="countSelectedPageIds ? 'pink-darken-1' : 'deep-orange-lighten-2'"
        :model-value="createActive && !!countSelected"
        max="99"
        :content="countSelected"
      >
        <v-btn
          icon
          size="small"
          color="yellow-lighten-1"
          variant="elevated"
          :disabled="!createActive || inProgress"
          @click="create"
        >
          <v-icon>mdi-folder-plus-outline</v-icon>
          <v-tooltip activator="parent" location="bottom">Create</v-tooltip>
        </v-btn>
      </v-badge>

      <v-btn
        icon
        class="mr-3"
        size="small"
        color="yellow-lighten-1"
        variant="elevated"
        :disabled="!splitActive || inProgress"
        @click="split"
      >
        <v-icon>mdi-format-page-split</v-icon>
        <v-tooltip activator="parent" location="bottom">Split</v-tooltip>
      </v-btn>

      <v-badge
        class="mr-3"
        :color="countSelectedPageIds ? 'pink-darken-1' : 'deep-orange-lighten-2'"
        :model-value="copyActive && !!countSelected"
        max="99"
        :content="countSelected"
      >
        <v-btn
          icon
          size="small"
          color="yellow-lighten-1"
          variant="elevated"
          :disabled="!copyActive || inProgress"
          @click="copy"
        >
          <v-icon>mdi-content-copy</v-icon>
          <v-tooltip activator="parent" location="bottom">Copy</v-tooltip>
        </v-btn>
      </v-badge>

      <v-badge
        class="mr-3"
        :color="countSelectedPageIds ? 'pink-darken-1' : 'deep-orange-lighten-2'"
        :model-value="cutActive && !!countSelected"
        max="99"
        :content="countSelected"
      >
        <v-btn
          icon
          size="small"
          color="yellow-lighten-1"
          variant="elevated"
          :disabled="!cutActive || inProgress"
          @click="cut"
        >
          <v-icon>mdi-content-cut</v-icon>
          <v-tooltip activator="parent" location="bottom">Cut</v-tooltip>
        </v-btn>
      </v-badge>

      <v-badge
        class="mr-3"
        :color="countCutPageIds || countCopyPageIds ? 'pink-darken-1' : 'deep-orange-lighten-2'"
        :model-value="pasteActive && !!countCutOrCopy"
        max="99"
        :content="countCutOrCopy"
      >
        <v-btn
          icon
          size="small"
          color="yellow-lighten-1"
          variant="elevated"
          :disabled="!pasteActive || inProgress"
          @click="paste"
        >
          <v-icon>mdi-content-paste</v-icon>
          <v-tooltip activator="parent" location="bottom">Paste</v-tooltip>
        </v-btn>
      </v-badge>

      <v-badge
        class="mr-1"
        :color="countSelectedPageIds ? 'pink-darken-1' : 'deep-orange-lighten-2'"
        :model-value="deleteActive && !!countSelected"
        max="99"
        :content="countSelected"
      >
        <v-btn
          icon
          size="small"
          color="yellow-lighten-1"
          variant="elevated"
          :disabled="!deleteActive || inProgress"
          @click="remove"
        >
          <v-icon>mdi-delete-outline</v-icon>
          <v-tooltip activator="parent" location="bottom">Delete</v-tooltip>
        </v-btn>
      </v-badge>
    </div>

    <v-divider color="black" thickness="2" vertical inset class="mx-3"></v-divider>

    <div class="actions-revert">
      <v-btn
        icon
        class="mr-1"
        size="small"
        color="yellow-lighten-1"
        variant="elevated"
        :disabled="!undoActive || inProgress"
        @click="undo"
      >
        <v-icon>mdi-undo-variant</v-icon>
        <v-tooltip activator="parent" location="bottom">Undo</v-tooltip>
      </v-btn>

      <v-btn
        icon
        class="mr-1"
        size="small"
        color="yellow-lighten-1"
        variant="elevated"
        :disabled="!redoActive || inProgress"
        @click="redo"
      >
        <v-icon>mdi-redo-variant</v-icon>
        <v-tooltip activator="parent" location="bottom">Redo</v-tooltip>
      </v-btn>
    </div>
  </div>
</template>
<style scoped>
.actions-mode {
  display: flex;
  align-items: center;
  height: 64px;
}

.actions-mode button {
  border-radius: 10%;
}

.actions-mode button:hover {
  opacity: 0.7;
}

.actions-edit,
.actions-revert,
.action-save {
  display: flex;
  margin-left: 4px;
}

@media only screen and (max-width: 1590px) {
  .actions-edit .v-badge, .actions-edit button {
    margin-right: 2px !important;
  }

  .v-divider {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
}
</style>
