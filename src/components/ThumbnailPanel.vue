<script lang="ts">
import { storeDocument } from '../store/storeDocument'
import { storeEditActions } from '../store/storeEditActions'
import PageView from './PageView.vue'

export default {
   props: [
    'activePageId'
  ],

  emits: [
    'setActivePageId',
  ],

  components: {
    PageView,
  },

  data() {
    return {
      storeDocument,
      storeEditActions,
      isThumbnail: true,
      scale: 20,
      annotations: false,
      selectAll: false
    }
  },

  computed: {
    docName() {
      return (name: string) => name.match(/([^\/]+)(?=\.\w+$)/)?.[0]
    },
  },

  watch: {
    activePageId(newPageId) {
      if (newPageId) {
        this.navigateToPage(newPageId)
      }
    },
  },

  methods: {
    clickDocument(event: MouseEvent, docId: string) {
      if (!storeDocument.selectedDocIds.includes(docId)) {
        const pageId = storeDocument.documents.find(doc => doc.id === docId)?.pages[0]?.pageId
        this.$emit('setActivePageId', pageId)
      }

      storeDocument.clearSelectedPageIds()
      storeDocument.addSelectedDocId(docId, event.ctrlKey)

      this.selectAll = storeDocument.selectedDocIds.length === storeDocument.documents.length
    },

    clickPage(event: PointerEvent, pageId: string) {
      if (!storeDocument.selectedPageIds.includes(pageId)) {
        this.$emit('setActivePageId', pageId)
      }

      storeDocument.clearSelectedDocIds()
      storeDocument.addSelectedPageId(pageId, event.ctrlKey)

      this.selectAll = storeDocument.selectedPageIds.length === storeDocument.getAllPages().length
    },

    clickWrapper() {
      storeDocument.clearSelectedDocIds()
      storeDocument.clearSelectedPageIds()
      this.selectAll = false
    },

    async showAnnotations() {
      this.annotations = !this.annotations
    },

    navigateToPage(pageId: string) {
      const element = (document.querySelector(`.thumbnail-wrapper-documents #thumbnail-${pageId}`) as HTMLElement)
      element?.scrollIntoView({ behavior: 'auto', block: 'center' })
    },
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

  <div class="thumbnail-wrapper-view" :class="storeDocument.inProgress ? 'inProgress' : ''" @click="clickWrapper">
    <div class="thumbnail-wrapper-documents">
      <div
        v-for="doc in storeDocument.documents"
        class="thumbnail-wrapper-document"
        :key="doc.id"
        :id="`thumbnail-${doc.id}`"
        :class="{
          active: storeDocument.selectedDocIds.includes(doc.id),
          edit: storeEditActions.getEditedDocIds().includes(doc.id),
        }"
      >
        <div
          class="document-title"
          @click.stop="clickDocument($event, doc.id)"
        >
          <span class="document-number">
            {{ storeDocument.documents.map((doc) => doc.id).findIndex((id) => id === doc.id) + 1 }}.
          </span>
          <span class="document-name">{{ docName(doc.name) }}</span>
        </div>

        <div class="wrapper-pages">
          <div
            v-for="page in doc.pages"
            :key="page.pageId"
            class="wrapper-page-view"
            :class="{
              'active-page': storeDocument.selectedPageIds.includes(page.pageId),
              'edit-page': storeEditActions.getEditedPageIds().includes(page.pageId),
            }"
          >
            <PageView
              class="page"
              :annotations="annotations"
              :page="page"
              :scale="scale / 100"
              :isThumbnail="isThumbnail"
              @clickPage="clickPage"
            />

            <div class="page-order">{{ page.numPage }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="storeDocument.documents.length" class="select-all">
    <v-checkbox
      v-model="selectAll"
      disabled
    ></v-checkbox>
    <span>Selected all pages (documents)</span>
  </div>

</template>

<style scoped>
.thumbnail-wrapper-view {
  height: calc(100% - 55px);
  background-color: #CFD8DC;
}

.thumbnail-wrapper-view.inProgress {
  height: 100%;
}

.select-all {
  position: absolute;
  width: 100%;
  background-color: #CFD8DC;
  padding: 0 10px;
}

.select-all span {
  position: absolute;
  width: 135px;
  top: 4px;
  left: 50px;
  font-size: 16px;
  line-height: 22px;
  text-align: center;
}

.thumbnail-wrapper-documents {
  height: 100%;
  overflow-y: auto;
  overflow-x: auto;
}

.thumbnail-wrapper-document {
  padding: 0 5px;
}

.edit {
  opacity: 0.5;
}

.document-title {
  height: 27px;
  margin-top: 5px;
  text-align: center;
  font-size: 14px;
  color: black;
  background-color: #ff7043;
  border-top: 3px solid transparent;
}

.document-title:hover {
  cursor: pointer;
  opacity: 0.7;
  box-shadow:
    0px -7px 18px -4px rgba(0, 0, 0, 0.2),
    0 -8px 20px 0 rgba(0, 0, 0, 0.19);
}

.document-title:hover ~ .wrapper-pages {
  opacity: 0.7;
  box-shadow:
    0 10px 16px 0 rgba(0, 0, 0, 0.2),
    0 6px 20px 0 rgba(0, 0, 0, 0.19);
}

.document-title,
.wrapper-pages {
  border-right: 3px solid transparent;
  border-left: 3px solid transparent;
}

.wrapper-pages {
  border-bottom: 3px solid transparent;
}

.active > .document-title,
.active > .document-title ~ .wrapper-pages {
  border-right: 3px solid #e53935;
  border-left: 3px solid #e53935;
}

.active > .document-title {
  border-top: 3px solid #e53935;
  box-shadow:
    0px -7px 18px -4px rgba(0, 0, 0, 0.2),
    0 -8px 20px 0 rgba(0, 0, 0, 0.19);
}

.active > .document-title ~ .wrapper-pages {
  border-bottom: 3px solid #e53935;
  box-shadow:
    0 10px 16px 0 rgba(0, 0, 0, 0.2),
    0 6px 20px 0 rgba(0, 0, 0, 0.19);
}

.wrapper-page-view {
  display: flex;
  align-items: center;
  flex-direction: column;
  width: fit-content;
  margin: 0 auto;
}

.page {
  position: relative;
  display: block;
  margin: 7px;
  border: 3px solid transparent;
}

.page:hover {
  cursor: pointer;
}

.page-order {
  font-size: 16px;
}

.active-page .page-order {
  background-color: #e53935;
  border-radius: 15px;
  padding: 0 10px;
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
