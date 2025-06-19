<script lang="ts">
import { ref } from 'vue'
import * as PDFJS from 'pdfjs-dist'
import LoaderSkeleton from '../components/LoaderSkeleton.vue'
import PageView from '../components/PageView.vue'
import HeaderMain from '../components/HeaderMain.vue'
import { storeDocument } from '../store/storeDocument'
import { storeEditActions } from '../store/storeEditActions'
import { useRequestInit } from '../composables/useRequestInit'
import { PresetsZoomSize } from '../shared/controls.enum'
import { IPage, IRespGetDocuments } from '../shared/document.interface'
import { Document, Page } from '../utils/utils'
import { CONFIG } from '../config/config'

export default {
  props: ['isEditMode', 'isWrappedView', 'isCompareView', 'isFirstViewer', 'isSecondViewer'],

  emits: ['allLoaded'],

  components: {
    HeaderMain,
    LoaderSkeleton,
    PageView,
  },

  data() {
    return {
      storeDocument,
      storeEditActions,
      indexActiveFirstPageId: 0,
      scale: this.isWrappedView ? 50 : this.isEditMode ? 35 : 100,
      selectedPageIds: [], // for CompareView
      selectedDocIds: [], // for CompareView
      isLastPageLoaded: false,
      annotations: false,
      scrollTop: {
        firstViewer: this.isCompareView ? 52 : 0,
        secondViewer: this.isCompareView ? 52 : 0,
      },
      pathViewer: this.isCompareView ? (this.isFirstViewer ? '.first' : '.second') : '',
      activePageId: null,
    }
  },

  mounted() {
    if (!storeDocument.isDocumentsLoaded && !this.isSecondViewer) {
      this.loadDocuments(false)
    }
  },

  beforeUnmount() {
    storeDocument.clearSelectedPageIds()
    storeDocument.clearSelectedDocIds()

    if (!this.isCompareView || (this.isCompareView && this.isFirstViewer)) {
      storeDocument.setActivePageId(this.activePageId)
    }
  },

  computed: {
    docName() {
      return (name: string) => name.match(/([^\/]+)(?=\.\w+$)/)?.[0]
    },

    isLatestPageInDoc() {
      return (numPage: number, totalPage: number) => numPage === totalPage
    },

    countDocuments() {
      return storeDocument.documents.length
    },

    activeRotate() {
      if (this.isCompareView) {
        return !!this.selectedPageIds.length || !!this.selectedDocIds.length
      }

      return !!storeDocument.selectedPageIds.length || !!storeDocument.selectedDocIds.length
    },
  },

  methods: {
    async loadDocuments(useProgress: boolean) {
      try {
        const objUser = localStorage.getItem(document.location.origin)
        const userId = JSON.parse(objUser).user_Id

        if (useProgress) {
          storeDocument.setInProgress(true)
        }

        const response = await fetch(
          `${CONFIG.BASE_URL}/documents?userId=${userId}`,
          useRequestInit('GET'),
        )

        const data = (await response.json()) as IRespGetDocuments[]
        const documents = data ?? []

        if (documents.length) {
          const docsLoadingTask = []

          documents.forEach(async (doc) => {
            const binaryFile = atob(doc.file)
            const array = new Uint8Array(binaryFile.length)
            const length = binaryFile.length

            for (let i = 0; i < length; i++) {
              array[i] = binaryFile.charCodeAt(i)
            }

            const url = URL.createObjectURL(new Blob([array], { type: 'application/json' }))
            const loadingTask = PDFJS.getDocument(url)

            docsLoadingTask.push({ doc, loadingTask })
          })

          await Promise.allSettled(
            docsLoadingTask.map((docLoading) => docLoading.loadingTask.promise),
          ).then((results) => {
            if (results.some((result) => result.status === 'rejected')) {
              console.warn('Some documents could not be loaded!')
            }

            results
              .filter((result) => result.status === 'fulfilled')
              .forEach((result: PromiseFulfilledResult<PDFJS.PDFDocumentProxy>, index: number) => {
                const docLoading = docsLoadingTask[index]
                const numPages = result.value.numPages
                const url = ref()
                url.value = docLoading.loadingTask

                const pages = []
                const { documentId, name, info } = docLoading.doc

                for (let i = 0; i < numPages; i++) {
                  const numPage = i + 1
                  const page = new Page(numPage, documentId, numPage, url)
                  pages.push(page)
                }

                const doc = new Document(name, pages, documentId, info)

                storeDocument.setDocument(doc, index)
              })
          })
        }

        if (useProgress) {
          storeDocument.setInProgress(false)
        } else {
          storeDocument.setIsDocumentsLoaded(true)
        }
      } catch (err) {
        if (useProgress) {
          storeDocument.setInProgress(false)
        }

        console.warn('The documents could not be loaded!', err)
        this.$router.push({ name: 'login' })
      }
    },

    refresh() {
      this.indexActiveFirstPageId = 0
      storeDocument.refresh()
      this.loadDocuments(true)
    },

    clickDocument(event: PointerEvent, docId: string) {
      if (this.isCompareView) {
        this.selectedPageIds = []
        this.selectedDocIds = event.ctrlKey
          ? this.selectedDocIds.includes(docId)
            ? [...this.selectedDocIds].filter((id) => id !== docId)
            : [...this.selectedDocIds].concat(docId)
          : [docId]
      } else {
        if (!storeDocument.selectedDocIds.includes(docId)) {
          this.activePageId = storeDocument.documents.find(
            (doc) => doc.id === docId,
          ).pages[0].pageId
        }

        storeDocument.clearSelectedPageIds()
        storeDocument.addSelectedDocId(docId, event.ctrlKey)
      }
    },

    clickPage(event: PointerEvent, pageId: string) {
      if (this.isCompareView) {
        this.selectedDocIds = []
        this.selectedPageIds = event.ctrlKey
          ? this.selectedPageIds.includes(pageId)
            ? [...this.selectedPageIds].filter((id) => id !== pageId)
            : [...this.selectedPageIds].concat(pageId)
          : [pageId]
      } else {
        if (!storeDocument.selectedPageIds.includes(pageId)) {
          this.activePageId = pageId
        }

        storeDocument.clearSelectedDocIds()
        storeDocument.addSelectedPageId(pageId, event.ctrlKey)
      }
    },

    docsLoaded() {
      this.isLastPageLoaded = true

      if (this.isCompareView) {
        this.$emit('allLoaded', true)
      }

      setTimeout(() => this.setActivePageId(storeDocument.activePageId), 300)
    },

    clickWrapper(event: PointerEvent) {
      if (this.isCompareView) {
        this.selectedDocIds = []
        this.selectedPageIds = []
        return
      }

      storeDocument.clearSelectedDocIds()
      storeDocument.clearSelectedPageIds()
    },

    zoom(value: number) {
      this.scale += value
      this.$refs.refControls.setValueZoomInSelect(`${this.scale}%`, this.scale)
    },

    selectZoom(zoomPreset: string) {
      const wrapperDocuments = document.querySelector(
        `${
          this.isCompareView ? (this.isFirstViewer ? '.first' : '.second') : ''
        }.wrapper-documents`,
      )
      const pages = wrapperDocuments.querySelectorAll('.page')
      let scaleIndex = 1

      if (zoomPreset === PresetsZoomSize.HEIGHT) {
        const heigthWrapperDocuments = wrapperDocuments.clientHeight - 10 // add margin 10px
        const maxHeigthPage = Math.max.apply(
          null,
          Array.from(pages).map((page) => page.clientHeight),
        )
        scaleIndex = Math.round((heigthWrapperDocuments / maxHeigthPage) * 100)
        this.scale = Math.round((this.scale * scaleIndex) / 100)
      } else if (zoomPreset === PresetsZoomSize.WIDTH) {
        const withWrapperDocuments = wrapperDocuments.clientWidth - 34 // add margin 12px and padding 5px
        const maxWidthPage = Math.max.apply(
          null,
          Array.from(pages).map((page) => page.clientWidth),
        )
        scaleIndex = Math.round((withWrapperDocuments / maxWidthPage) * 100)
        this.scale = Math.round((this.scale * scaleIndex) / 100)
      } else {
        this.scale = +zoomPreset.slice(0, -1)
      }

      const targetWidth = this.isCompareView
        ? this.isFirstViewer
          ? wrapperDocuments.clientWidth / 2
          : wrapperDocuments.clientWidth * 1.5
        : wrapperDocuments.clientWidth / 2

      const targetElement = document.elementFromPoint(targetWidth, (window.innerHeight - 64) / 2) // 64px - header height

      const middlePage = targetElement.closest('.page') || targetElement.querySelector('.page')

      requestAnimationFrame(() => {
        const targetPage = storeDocument
          .getAllPages()
          .find((page: IPage) => page.pageId === middlePage?.id)
        middlePage?.scrollIntoView({ behavior: 'auto', block: 'start' })
        wrapperDocuments.scrollBy(0, targetPage?.numPage === 1 ? -60 : -5)
      })

      this.$refs.refControls.setValueZoomInSelect(zoomPreset, this.scale)
    },

    rotate(value: number) {
      if (this.isCompareView) {
        if (this.selectedDocIds.length) {
          this.selectedDocIds.forEach((id: string) =>
            storeDocument.documents
              .find((doc) => doc.id === id)
              .pages.forEach((page) =>
                this.$refs.refPage
                  .find((refPage) => refPage.page.pageId === page.pageId)
                  .rotatePage(value),
              ),
          )
        } else {
          this.selectedPageIds.forEach((id: string) =>
            this.$refs.refPage.find((refPage) => refPage.page.pageId === id).rotatePage(value),
          )
        }
      } else {
        if (storeDocument.selectedDocIds.length) {
          storeDocument.selectedDocIds.forEach((id) =>
            storeDocument.documents
              .find((doc) => doc.id === id)
              .pages.forEach((page) => storeDocument.rotate(page.pageId, value)),
          )
        } else {
          storeDocument.selectedPageIds.forEach((id) => storeDocument.rotate(id, value))
        }
      }
    },

    showAnnotations() {
      // TODO:
      this.annotations = !this.annotations
    },

    setActivePageId(pageId: string) {
      if (pageId) {
        this.navigateToPage(pageId)
      }
    },

    changeIndexActiveFirstPageId(value: number) {
      this.indexActiveFirstPageId += value
      this.navigateToPage(storeDocument.documents[this.indexActiveFirstPageId].pages[0].pageId)
    },

    navigateToPage(pageId: string) {
      const element = this.isCompareView
        ? (document
            .querySelector(`.wrapper-documents${this.pathViewer}`)
            .querySelector(`#${pageId}`) as HTMLElement)
        : (document.querySelector(`.wrapper-documents #${pageId}`) as HTMLElement)
      const elementWrapper = element?.closest('.wrapper-documents') as HTMLElement

      const targetPage = storeDocument.getAllPages().find((page: IPage) => page.pageId === pageId)

      element?.scrollIntoView({ behavior: 'auto', block: 'start' })

      if (targetPage.numPage === 1) {
        elementWrapper?.scrollBy(0, -60) // for the first page of docs (to show the name doc)
      } else {
        elementWrapper?.scrollBy(0, -5)
      }
    },

    handleScroll(event: Event) {
      let elementWrapperPage: HTMLElement = null

      if (this.isCompareView) {
        const targetElement = event.target as HTMLElement
        const classTargetViewer = targetElement.classList[0]

        if (storeDocument.isSynchronousScroll) {
          const classNextViewer = classTargetViewer === 'first' ? 'second' : 'first'
          const nextViewer = document.querySelector(
            `.${classNextViewer}.wrapper-documents`,
          ) as HTMLElement

          if (classTargetViewer === 'first' && !storeDocument.firstViewerScrollLock) {
            const scrollY = targetElement.scrollTop - this.scrollTop.firstViewer
            storeDocument.setSecondViewerScrollLock(true)
            nextViewer.scrollBy(0, scrollY)
            this.scrollTop.firstViewer = targetElement.scrollTop

            requestAnimationFrame(() => storeDocument.setSecondViewerScrollLock(false))
          } else if (classTargetViewer === 'second' && !storeDocument.secondViewerScrollLock) {
            const scrollY = targetElement.scrollTop - this.scrollTop.secondViewer
            storeDocument.setFirstViewerScrollLock(true)
            nextViewer.scrollBy(0, scrollY)
            this.scrollTop.secondViewer = targetElement.scrollTop

            requestAnimationFrame(() => storeDocument.setFirstViewerScrollLock(false))
          } else {
            this.setScrollTop(classTargetViewer, targetElement.scrollTop)
          }
        } else {
          this.setScrollTop(classTargetViewer, targetElement.scrollTop)
        }

        const firstWrapperElement = document
          .querySelector('.first.wrapper-documents')
          .closest('.wrapper-view') as HTMLElement
        const secondWrapperElement = document
          .querySelector('.second.wrapper-documents')
          .closest('.wrapper-view') as HTMLElement
        const firsttWidth = firstWrapperElement.clientWidth
        const secondWidth = secondWrapperElement.clientWidth
        const firstPosY = firstWrapperElement.clientHeight / 2
        const secondPosY = secondWrapperElement.clientHeight / 2
        const firstOffsetLeft = firstWrapperElement.offsetLeft
        const secondOffsetLeft =
          secondWrapperElement.offsetLeft + firstWrapperElement.closest('.viewer').clientWidth
        const firstPosX = firsttWidth / 2 + firstOffsetLeft
        const secondPosX = secondWidth / 2 + secondOffsetLeft

        elementWrapperPage = this.isFirstViewer
          ? document.elementFromPoint(firstPosX, firstPosY)?.closest('.wrapper-page')
          : document.elementFromPoint(secondPosX, secondPosY)?.closest('.wrapper-page')

        if (!elementWrapperPage) {
          elementWrapperPage = this.isFirstViewer
            ? document.elementFromPoint(firstOffsetLeft + 1, firstPosY)?.closest('.wrapper-page')
            : document.elementFromPoint(secondOffsetLeft + 2, secondPosY)?.closest('.wrapper-page') // 1px + 1px separator width
        }
      } else {
        const wrapperElement = document.querySelector('.wrapper-view') as HTMLElement
        const wrapperElementOffsetLeft = wrapperElement.offsetLeft
        const posX = wrapperElement.clientWidth / 2 + wrapperElementOffsetLeft
        const posY = wrapperElement.clientHeight / 2

        elementWrapperPage = document.elementFromPoint(posX, posY)?.closest('.wrapper-page')

        if (!elementWrapperPage) {
          elementWrapperPage = document
            .elementFromPoint(wrapperElementOffsetLeft + 1, posY)
            ?.closest('.wrapper-page')
        }
      }

      const pageId = elementWrapperPage?.id

      if (pageId) {
        this.activePageId = pageId
        this.indexActiveFirstPageId = storeDocument.documents.findIndex((doc) =>
          doc.pages.map((page) => page.pageId).includes(pageId),
        )
      }
    },

    setScrollTop(classTargetViewer: string, scrollTop: number) {
      switch (classTargetViewer) {
        case 'first':
          this.scrollTop.firstViewer = scrollTop
          break
        case 'second':
          this.scrollTop.secondViewer = scrollTop
          break
        default:
          return
      }
    },
  },
}
</script>

<template>
  <HeaderMain
    v-if="isLastPageLoaded || (storeDocument.isDocumentsLoaded && !countDocuments)"
    ref="refControls"
    :isEditMode="isEditMode"
    :isFirstViewer="isFirstViewer"
    :isSecondViewer="isSecondViewer"
    :isWrappedView="isWrappedView"
    :isCompareView="isCompareView"
    :indexActiveFirstPageId="indexActiveFirstPageId"
    :countSelectedPages="isCompareView ? selectedPageIds.length : storeDocument.selectedPageIds.length"
    :countSelectedDocs="isCompareView ? selectedDocIds.length : storeDocument.selectedDocIds.length"
    :activeRotate="activeRotate"
    :scale="scale"
    :activePageId="activePageId"
    @changeIndexActiveFirstPageId="changeIndexActiveFirstPageId"
    @setActivePageId="setActivePageId"
    @rotate="rotate"
    @zoom="zoom"
    @selectZoom="selectZoom"
    @refresh="refresh"
    @showAnnotations="showAnnotations"
  />

  <div v-if="storeDocument.inProgress" class="spinner">
    <v-progress-circular
      color="deep-orange-lighten-1"
      indeterminate
      size="90"
      width="8"
    ></v-progress-circular>
  </div>

  <LoaderSkeleton
    v-if="!storeDocument.isDocumentsLoaded || (countDocuments && !isLastPageLoaded)"
  />

  <div
    v-if="!storeDocument.inProgress && storeDocument.isDocumentsLoaded && !countDocuments"
    class="empty"
  >
    No documents
  </div>

  <div
    class="wrapper-view"
    :class="storeDocument.inProgress ? 'inProgress' : ''"
    @click="clickWrapper"
  >
    <div
      :class="isCompareView ? (isFirstViewer ? 'first' : 'second') : ''"
      class="wrapper-documents"
      @scroll="handleScroll"
    >
      <div
        v-for="(doc, indexDoc) in storeDocument.documents"
        class="wrapper-document"
        :key="doc"
        :id="`${doc.id}`"
        :class="{
          'wrapped-view-documents': isWrappedView,
          'edit-mode': isEditMode,
          active: isCompareView
            ? selectedDocIds.includes(doc.id)
            : storeDocument.selectedDocIds.includes(doc.id),
          edit: storeEditActions.getEditedDocIds().includes(doc.id),
        }"
      >
        <div
          v-if="isLastPageLoaded"
          class="document-title"
          @click.stop="clickDocument($event, doc.id)"
        >
          <span class="document-number"
            >{{
              storeDocument.documents.map((doc) => doc.id).findIndex((id) => id === doc.id) + 1
            }}.
          </span>
          <span class="document-name">{{ docName(doc.name) }}</span>
        </div>

        <div :class="{ 'wrapped-view-pages': isEditMode || isWrappedView }" class="wrapper-pages">
          <div
            v-for="page in doc.pages"
            :key="page"
            class="wrapper-page-view"
            :class="{
              'active-page': isCompareView
                ? selectedPageIds.includes(page.pageId)
                : storeDocument.selectedPageIds.includes(page.pageId),
              'edit-page': storeEditActions.getEditedPageIds().includes(page.pageId),
            }"
          >
            <PageView
              ref="refPage"
              class="page"
              :isCompareView="isCompareView"
              :annotations="annotations"
              :page="page"
              :scale="scale / 100"
              :isLatestPageAllDocs="
                isLatestPageInDoc(page.numPage, doc.pages.length) && indexDoc + 1 === countDocuments
              "
              :isLastPageAllDocsLoaded="isLastPageLoaded"
              @clickPage="clickPage"
              @docsLoaded="docsLoaded"
            />

            <div class="page-order">{{ page.numPage }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 64px);
  font-size: 26px;
}

.wrapper-view {
  height: calc(100vh - 64px);
}

.wrapper-view.inProgress {
  opacity: 0.3;
}

.v-layout header {
  position: relative;
}

.left-panel + .wrapper-view {
  margin-left: 255px;
  width: calc(100% - 255px);
}

.right-panel + .wrapper-view {
  width: calc(100% - 400px);
}

.mixed-panel + .wrapper-view {
  margin-left: 255px;
  width: calc(100% - 655px);
}

.left-panel-thumbnail + .wrapper-view {
  margin-left: 460px;
  width: calc(100% - 460px);
}

.right-panel-thumbnail + .wrapper-view {
  margin-left: 205px;
  width: calc(100% - 605px);
}

.mixed-panel-thumbnail + .wrapper-view {
  margin-left: 460px;
  width: calc(100% - 860px);
}

.panel-thumbnail + .wrapper-view {
  margin-left: 205px;
  width: calc(100% - 205px);
}

.wrapper-documents {
  height: 100%;
  overflow-y: auto;
  overflow-x: auto;
  padding-bottom: 50px;
}

.wrapper-document {
  padding: 0 5px;
}

.edit-mode,
.wrapped-view-documents {
  display: flex;
  justify-content: center;
  flex-direction: column;
}

.edit {
  opacity: 0.5;
}

.document-title {
  height: 40px;
  margin-top: 10px;
  text-align: center;
  font-size: 20px;
  color: black;
  background-color: #ff7043;
  border-top: 3px solid transparent;
}

.edit-mode > .document-title {
  text-align: left;
  padding-left: 10px;
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

.wrapped-view-pages {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
}

.wrapper-page-view {
  display: flex;
  align-items: center;
  flex-direction: column;
  width: fit-content;
  margin: 0 auto;
}

.wrapped-view-pages .wrapper-page-view {
  margin: 0;
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
  top: calc(50% - 77px);
  left: calc(50% - 45px);
}
</style>
