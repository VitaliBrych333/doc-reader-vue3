<script lang="ts">
import { ref } from 'vue'
import * as PDFJS from 'pdfjs-dist'
import ControlsEdit from './ControlsEdit.vue'
import DocumentPanel from './DocumentPanel.vue'
import ThumbnailPanel from './ThumbnailPanel.vue'
import DialogWindow from './shared/DialogWindow.vue'
import MessageWindow from './shared/MessageWindow.vue'
import { ActionName, SortType } from '../shared/actionNames.enum'
import { PresetsZoomSize, ActionBtn } from '../shared/controls.enum'
import { storeDocument } from '../store/storeDocument'
import { useRequestInit } from '../composables/useRequestInit'
import { IFileDocument, IPage, IReqSaveDocuments } from '../shared/document.interface'
import { Document, Page, Prefixes, getNewDocId } from '../utils/utils'
import { CONFIG } from '../config/config'

export default {
  props: [
    'scale',
    'activeRotate',
    'isEditMode',
    'isCompareView',
    'isWrappedView',
    'isFirstViewer',
    'isSecondViewer',
    'indexActiveFirstPageId',
    'countSelectedPages',
    'countSelectedDocs',
    'activePageId',
  ],

  emits: [
    'refresh',
    'zoom',
    'selectZoom',
    'rotate',
    'showAnnotations',
    'changeIndexActiveFirstPageId',
    'setActivePageId',
  ],

  components: {
    MessageWindow,
    DialogWindow,
    ThumbnailPanel,
    DocumentPanel,
    ControlsEdit,
  },

  data() {
    return {
      storeDocument,
      SortType,
      leftPanel: false,
      rightPanel: false,
      thumbnailPanel: false,
      showCreateNewDoc: false,
      messageTitle: '',
      messageText: '',
      showBtnCancel: false,
      visibleMessage: false,
      dialogBtnOk: ActionName.CREATE,
      presetsZoom: [...Object.values(PresetsZoomSize)],
      pathSelectorSelect: `${this.isCompareView ? (this.isFirstViewer ? '.first' : '.second') : ''}.zoom-select-wrapper .select`,
      showZoomOptions: false,
      actionBtn: null,
      selectedSortType: SortType.NONE,
      sortItems: [
        {
          title: SortType.NONE,
          icon: '',
        },
        {
          title: SortType.ASC,
          icon: 'mdi-sort-alphabetical-ascending',
        },
        {
          title: SortType.DESC,
          icon: 'mdi-sort-alphabetical-descending',
        },
      ],
      activeDoc: storeDocument.documents[0],
    }
  },

  mounted() {
    if (this.isCompareView) {
      this.selectZoom(PresetsZoomSize.HEIGHT)
      return
    }

    this.setValueZoomInSelect(`${this.scale}%`, this.scale)
  },

  watch: {
    activePageId(newPageId, oldPageId) {
      if (newPageId) {
        this.activeDoc = storeDocument.documents.find((doc) =>
          doc.pages.map((page) => page.pageId).includes(newPageId),
        )
      }
    },

    'storeDocument.documents'() {
      this.activeDoc =
        storeDocument.documents.find((doc) => doc.id === this.activeDoc?.id) ??
        storeDocument.documents[0]

      if (this.activeDoc) {
        this.setActivePageId(this.activeDoc.pages[0].pageId)
      }
    },
  },

  computed: {
    newDocuments() {
      return storeDocument.documents.filter((doc) => doc.id.startsWith(Prefixes.NEW_DOC))
    },

    saveActive() {
      return (
        storeDocument.rotatePages.length ||
        storeDocument.editActions.length ||
        this.newDocuments.length
      )
    },

    inProgress() {
      return storeDocument.inProgress
    },
  },

  methods: {
    clickDocument(id: string) {
      const pageId = storeDocument.documents.find((doc) => doc.id === id).pages[0].pageId
      this.setActivePageId(pageId)
    },

    setActivePageId(pageId: string) {
      this.$emit('setActivePageId', pageId)
    },

    toggleSelectMenu(): void {
      document
        .querySelectorAll(this.pathSelectorSelect)
        .forEach((elem) => elem.classList.toggle('open'))

      this.showZoomOptions = !this.showZoomOptions
    },

    selectZoom(zoomPreset: string) {
      if (this.selectedZoomPreset !== zoomPreset) {
        this.$emit('selectZoom', zoomPreset)
      }
    },

    setValueZoomInSelect(preset: string, valueZoom: number): void {
      this.selectedZoomPreset = preset

      document
        .querySelectorAll(this.pathSelectorSelect + ' .custom-options span.selected')
        .forEach((elem) => elem.classList.remove('selected'))

      document
        .querySelectorAll(this.pathSelectorSelect + ` .custom-options span[data-value='${preset}']`)
        .forEach((elem) => elem.classList.add('selected'))

      document
        .querySelectorAll(this.pathSelectorSelect + ' .select-current .select-current-value')
        .forEach((elem) => (elem.textContent = `${valueZoom}%`))
    },

    showDialogCreateNewDocument() {
      this.showCreateNewDoc = true
    },

    closeCreateNewDoc() {
      this.showCreateNewDoc = false
    },

    async createNewDoc(value: { docName: string; docText: string }) {
      const { docName, docText } = value

      const body = {
        paper: 'A4',
        padding: {
          width: 30,
        },
        pages: {
          1: {
            content: {
              text: [
                {
                  value: 'New text for doc',
                  pos: [10, 800],
                  font: {
                    name: 'Helvetica',
                    size: 16,
                  },
                },
              ],
            },
          },
          2: {
            content: {
              text: [
                {
                  value: docText, // need value in other case will be issue
                  anchor: 'left',
                  font: {
                    name: 'Helvetica',
                    size: 30,
                  },
                },
              ],
            },
          },
        },
      }

      try {
        const response = await fetch(
          `${CONFIG.BASE_URL}/documents/create`,
          useRequestInit('POST', body, true),
        )
        const data = await response.blob()
        const url = URL.createObjectURL(data)
        const loadingTask = PDFJS.getDocument(url)

        await loadingTask.promise.then((res: PDFJS.PDFDocumentProxy) => {
          const numPages = res.numPages
          const url = ref()
          url.value = loadingTask

          const pages = []
          const newDocId = getNewDocId()

          for (let i = 0; i < numPages; i++) {
            const numPage = i + 1
            const page = new Page(numPage, newDocId, numPage, url)
            pages.push(page)
          }

          const doc = new Document(`${docName}.pdf`, pages, newDocId)
          const positionIndex = storeDocument.documents.length

          storeDocument.addDocument(doc, positionIndex)
        })
      } catch (err) {
        this.showMessage('Some failed', 'Could not create new document!', true)
      }

      this.closeCreateNewDoc()
    },

    showMessage(title: string, text: string, show: boolean, showBtnCancel = false) {
      this.messageTitle = title
      this.messageText = text
      this.visibleMessage = show
      this.showBtnCancel = showBtnCancel
    },

    closeMessage() {
      this.visibleMessage = false
    },

    clickOkMessage() {
      this.visibleMessage = false

      if (this.actionBtn === ActionBtn.EXIT) {
        this.closeMode()
        return
      }

      if (this.actionBtn === ActionBtn.REFRESH) {
        this.actionBtn = null
        this.$emit('refresh')
      }
    },

    getNewDocuments(): Promise<IFileDocument[]> {
      return new Promise((resolve, reject) => {
        const documents = []
        const countNewDocuments = this.newDocuments.length

        if (countNewDocuments) {
          this.newDocuments.forEach(async (newDoc) => {
            try {
              const doc = {} as IFileDocument
              const pdfDocumentProxy = await newDoc.pages[0].url.promise
              const arrayBuffer = await pdfDocumentProxy.getData()
              const uint8Array = new Uint8Array(arrayBuffer)
              const file = uint8Array.reduce(
                (acc, i) => (acc += String.fromCharCode.apply(null, [i])),
                '',
              )

              doc.id = newDoc.id
              doc.name = newDoc.name
              doc.file = btoa(file)
              doc.pages = newDoc.pages.map((page) => (({ url, ...rest }) => rest)(page) as IPage)
              doc.info = newDoc.info

              documents.push(doc)

              if (documents.length === countNewDocuments) {
                resolve(documents)
              }
            } catch (err) {
              reject(err)
            }
          })
        } else {
          resolve([])
        }
      })
    },

    async save() {
      try {
        storeDocument.setInProgress(true)

        const newDocuments = this.isEditMode ? []: await this.getNewDocuments()
        const objUser = localStorage.getItem(document.location.origin)
        const userId = JSON.parse(objUser).user_Id
        const data: IReqSaveDocuments = {
          userId,
          newDocuments,
          rotate: storeDocument.rotatePages,
          editActions: storeDocument.editActions,
        }

        const response = await fetch(
          `${CONFIG.BASE_URL}/documents/saveDocuments`,
          useRequestInit('POST', data, true),
        )

        storeDocument.setInProgress(false)

        if (response.ok) {
          this.$emit('refresh')
        } else {
          this.showMessage('Some failed', 'Could not save the documents!', true)
        }
      } catch (err) {
        this.showMessage('Some failed', 'Could not save the documents!', true)
      }
    },

    exit() {
      if (this.saveActive) {
        this.actionBtn = ActionBtn.EXIT
        this.showMessage('Warning', 'There are some unsaved changes. Are you sure ?', true, true)
        return
      }

      this.closeMode()
    },

    closeMode() {
      this.actionBtn = null

      if (this.isWrappedView || this.isEditMode) {
        this.$router.push({ name: 'docReader' })
        return
      }

      storeDocument.clearDocumentsStack()
      localStorage.removeItem(document.location.origin)
      this.$router.push({ name: 'login' })
    },

    async handleFileChange(event) {
      const files = Array.from(event.target.files)
      let countError = 0

      const docsLoadingTask = []

      files.forEach((file: File) => {
        if (file.type !== 'application/pdf') {
          countError++
        } else {
          const url = URL.createObjectURL(file)
          const loadingTask = PDFJS.getDocument(url)
          docsLoadingTask.push({ name: file.name, loadingTask })
        }
      })

      await Promise.allSettled(
        docsLoadingTask.map((docLoading) => docLoading.loadingTask.promise),
      ).then((results) => {
        results.filter((result) => result.status === 'rejected').forEach(() => countError++)

        results
          .filter((result) => result.status === 'fulfilled')
          .forEach((result: PromiseFulfilledResult<PDFJS.PDFDocumentProxy>, index: number) => {
            const docLoading = docsLoadingTask[index]
            const numPages = result.value.numPages
            const url = ref()
            url.value = docLoading.loadingTask

            const pages = []
            const newDocId = getNewDocId()
            const { name } = docLoading

            for (let i = 0; i < numPages; i++) {
              const numPage = i + 1
              const page = new Page(numPage, newDocId, numPage, url)
              pages.push(page)
            }

            const doc = new Document(name, pages, newDocId)
            const positionIndex = storeDocument.documents.length + index

            storeDocument.setDocument(doc, positionIndex)
          })
      })

      if (countError) {
        this.showMessage('Some failed', `${countError} document(s) could not be loaded!`, true)
      }
    },

    clickOutSideSelectZoom(event: PointerEvent) {
      if (this.showZoomOptions) {
        this.toggleSelectMenu()
      }
    },

    refresh() {
      if (this.saveActive) {
        this.actionBtn = ActionBtn.REFRESH
        this.showMessage('Warning', 'There are some unsaved changes. Are you sure ?', true, true)
        return
      }

      this.actionBtn = null
      this.selectedSortType = SortType.NONE
      this.$emit('refresh')
    },

    download() {
      storeDocument.selectedDocIds.forEach(async (docId) => {
        try {
          // for uploaded but not yet saved in DB docs
          if (docId.startsWith(Prefixes.NEW_DOC)) {
            const doc = storeDocument.documents.find((doc) => doc.id === docId)
            const pdfDocumentProxy = await doc.pages[0].url.promise

            pdfDocumentProxy
              .getData()
              .then((arrayBuffer: Uint8Array) => this.downloadDocument(arrayBuffer, doc.name))
          } else {
            // for saved in DB docs
            const response = await fetch(
              `${CONFIG.BASE_URL}/documents/${docId}`,
              useRequestInit('GET'),
            )

            if (response.status === 200) {
              const data = await response.json()
              const binaryFile = atob(data.file)
              const length = binaryFile.length
              const arrayBuffer = new Uint8Array(length)

              for (let i = 0; i < length; i++) {
                arrayBuffer[i] = binaryFile.charCodeAt(i)
              }

              this.downloadDocument(arrayBuffer, data.name)
            } else {
              throw new Error(response.statusText)
            }
          }
        } catch (error) {
          console.error('Error download file:', error)
        }
      })
    },

    downloadDocument(arrayBuffer: Uint8Array, name: string) {
      const url = URL.createObjectURL(new Blob([arrayBuffer], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },

    print() {
      storeDocument.selectedDocIds.forEach(async (docId) => {
        try {
          // for uploaded but not yet saved in DB docs
          if (docId.startsWith(Prefixes.NEW_DOC)) {
            const doc = storeDocument.documents.find((doc) => doc.id === docId)
            const pdfDocumentProxy = await doc.pages[0].url.promise

            pdfDocumentProxy
              .getData()
              .then((arrayBuffer: Uint8Array) => this.printDocument(arrayBuffer, doc.name))
          } else {
            // for saved in DB docs
            const response = await fetch(
              `${CONFIG.BASE_URL}/documents/${docId}`,
              useRequestInit('GET'),
            )

            if (response.status === 200) {
              const data = await response.json()
              const binaryFile = atob(data.file)
              const length = binaryFile.length
              const arrayBuffer = new Uint8Array(length)

              for (let i = 0; i < length; i++) {
                arrayBuffer[i] = binaryFile.charCodeAt(i)
              }

              this.printDocument(arrayBuffer, data.name)
            } else {
              throw new Error(response.statusText)
            }
          }
        } catch (error) {
          console.error('Error print file:', error)
        }
      })
    },

    printDocument(arrayBuffer: Uint8Array, name: string) {
      const url = URL.createObjectURL(new Blob([arrayBuffer], { type: 'application/pdf' }))
      const w = window.open(url, name, 'width=800, height=800')

      try {
        w.addEventListener('beforeunload', () => URL.revokeObjectURL(url), { once: true })
        w.print()
      } catch (err) {
        URL.revokeObjectURL(url)
      }
    },

    sort(type: string) {
      this.selectedSortType = type
      storeDocument.sortDocuments(type)
    },
  },
}
</script>
<template>
  <MessageWindow
    :showMessage="visibleMessage"
    :title="messageTitle"
    :text="messageText"
    :showBtnCancel="showBtnCancel"
    @clickCancel="closeMessage"
    @clickOk="clickOkMessage"
  />

  <DialogWindow
    v-if="showCreateNewDoc"
    :modelValue="showCreateNewDoc"
    :title="'Create new document'"
    :actionNameOk="dialogBtnOk"
    :showText="true"
    @cancel="closeCreateNewDoc"
    @ok="createNewDoc"
  />

  <v-card
    class="card"
    :class="{
      'left-panel': leftPanel && !rightPanel && !thumbnailPanel,
      'right-panel': rightPanel && !leftPanel && !thumbnailPanel,
      'mixed-panel': rightPanel && leftPanel && !thumbnailPanel,
      'left-panel-thumbnail': leftPanel && !rightPanel && thumbnailPanel,
      'right-panel-thumbnail': rightPanel && !leftPanel && thumbnailPanel,
      'mixed-panel-thumbnail': rightPanel && leftPanel && thumbnailPanel,
      'panel-thumbnail': !leftPanel && !rightPanel && thumbnailPanel,
      'compare-view': isCompareView,
      second: isSecondViewer,
    }"
  >
    <v-layout>
      <v-app-bar
        :class="{ 'edit-mode': isEditMode }"
        :color="isEditMode ? 'light-green-lighten-1' : 'primary'"
        prominent
      >
        <v-btn
          v-if="isCompareView && isSecondViewer"
          icon
          class="mr-1 btn-wrapped-view"
          size="small"
          variant="outlined"
          :disabled="inProgress"
          @click="$router.push({ name: 'wrappedView' })"
        >
          <v-icon>mdi-table-headers-eye</v-icon>
          <v-tooltip activator="parent" location="bottom">Wrapped View</v-tooltip>
        </v-btn>

        <v-app-bar-nav-icon
          variant="text"
          @click.stop="leftPanel = !leftPanel"
        ></v-app-bar-nav-icon>

        <v-btn
          v-if="!isCompareView"
          icon
          class="mx-1 btn-thumbnail-view"
          size="small"
          :variant="isEditMode ? 'elevated' : 'outlined'"
          :color="isEditMode ? 'yellow-lighten-1' : ''"
          :disabled="inProgress"
          @click.stop="thumbnailPanel = !thumbnailPanel"
        >
          <v-icon>mdi-table-eye</v-icon>
          <v-tooltip activator="parent" location="bottom">Show thumbnail</v-tooltip>
        </v-btn>

        <v-toolbar-title>
          Document Reader & Editor
          <v-tooltip activator="parent" location="bottom">Document Reader & Editor</v-tooltip>
        </v-toolbar-title>

        <v-spacer>
          <div class="controls">
            <div class="actions-view">
              <v-btn
                v-if="!isSecondViewer"
                icon
                class="mr-1"
                size="small"
                :variant="isEditMode ? 'elevated' : 'outlined'"
                :color="isEditMode ? 'yellow-lighten-1' : ''"
                :disabled="inProgress"
                @click="refresh"
              >
                <v-icon>mdi-refresh</v-icon>
                <v-tooltip activator="parent" location="bottom">Refresh</v-tooltip>
              </v-btn>

              <div class="buttons-navigation">
                <v-btn
                  icon
                  class="mr-1"
                  size="small"
                  :color="isEditMode ? 'yellow-lighten-1' : ''"
                  :variant="isEditMode ? 'elevated' : 'outlined'"
                  :disabled="indexActiveFirstPageId === 0 || inProgress"
                  @click="$emit('changeIndexActiveFirstPageId', -1)"
                >
                  <v-icon>mdi-chevron-left</v-icon>
                  <v-tooltip activator="parent" location="bottom">Previous</v-tooltip>
                </v-btn>

                <div class="doc-counter">
                  {{ storeDocument.documents.length ? indexActiveFirstPageId + 1 : 0 }} /
                  {{ storeDocument.documents.length }}
                </div>

                <v-btn
                  icon
                  class="mr-1"
                  size="small"
                  :color="isEditMode ? 'yellow-lighten-1' : ''"
                  :variant="isEditMode ? 'elevated' : 'outlined'"
                  :disabled="
                    indexActiveFirstPageId + 1 >= storeDocument.documents.length || inProgress
                  "
                  @click="$emit('changeIndexActiveFirstPageId', 1)"
                >
                  <v-icon>mdi-chevron-right</v-icon>
                  <v-tooltip activator="parent" location="bottom">Next</v-tooltip>
                </v-btn>
              </div>

              <div class="buttons-pages">
                <div class="buttons-rotate">
                  <v-badge
                    class="mr-3"
                    :color="countSelectedPages ? 'pink-darken-1' : 'deep-orange-lighten-2'"
                    :model-value="activeRotate"
                    max="99"
                    :content="countSelectedPages || countSelectedDocs"
                  >
                    <v-btn
                      icon
                      size="small"
                      :color="isEditMode ? 'yellow-lighten-1' : ''"
                      :variant="isEditMode ? 'elevated' : 'outlined'"
                      :disabled="!activeRotate || inProgress"
                      @click="$emit('rotate', -90)"
                    >
                      <v-icon>mdi-rotate-left</v-icon>
                      <v-tooltip activator="parent" location="bottom">Rotate left 90°</v-tooltip>
                    </v-btn>
                  </v-badge>

                  <v-badge
                    class="mr-3"
                    :color="countSelectedPages ? 'pink-darken-1' : 'deep-orange-lighten-2'"
                    :model-value="activeRotate"
                    max="99"
                    :content="countSelectedPages || countSelectedDocs"
                  >
                    <v-btn
                      icon
                      size="small"
                      :color="isEditMode ? 'yellow-lighten-1' : ''"
                      :variant="isEditMode ? 'elevated' : 'outlined'"
                      :disabled="!activeRotate || inProgress"
                      @click="$emit('rotate', 90)"
                    >
                      <v-icon>mdi-rotate-right</v-icon>
                      <v-tooltip activator="parent" location="bottom">Rotate right 90°</v-tooltip>
                    </v-btn>
                  </v-badge>
                </div>

                <div class="buttons-zoom">
                  <v-btn
                    icon
                    class="mr-1 btn-zoom"
                    size="small"
                    :color="isEditMode ? 'yellow-lighten-1' : ''"
                    :variant="isEditMode ? 'elevated' : 'outlined'"
                    :disabled="scale <= 30 || inProgress"
                    @click="$emit('zoom', -10)"
                  >
                    <v-icon>mdi-minus</v-icon>
                    <v-tooltip activator="parent" location="bottom">Zoom Out</v-tooltip>
                  </v-btn>

                  <div
                    class="zoom-select-wrapper"
                    :class="isCompareView ? (isFirstViewer ? 'first' : 'second') : ''"
                  >
                    <div class="select">
                      <div class="select-current">
                        <span class="select-current-value"></span>
                      </div>

                      <div class="custom-options">
                        <span
                          v-for="preset in presetsZoom"
                          :key="preset"
                          class="custom-option"
                          :data-value="preset"
                          @click="selectZoom(preset)"
                          >{{ preset }}</span
                        >
                      </div>
                    </div>
                  </div>
                  <v-btn
                    icon
                    class="mr-1 btn-select"
                    size="small"
                    :color="isEditMode ? 'yellow-lighten-1' : ''"
                    :variant="isEditMode ? 'elevated' : 'outlined'"
                    v-click-outside="clickOutSideSelectZoom"
                    :disabled="inProgress"
                    @click.stop="toggleSelectMenu"
                  >
                    <v-icon>{{ showZoomOptions ? 'mdi-menu-up' : 'mdi-menu-down' }}</v-icon>
                    <v-tooltip activator="parent" location="bottom">Select Zoom</v-tooltip>
                  </v-btn>

                  <v-btn
                    icon
                    class="mr-1"
                    size="small"
                    :color="isEditMode ? 'yellow-lighten-1' : ''"
                    :variant="isEditMode ? 'elevated' : 'outlined'"
                    :disabled="scale >= 300 || inProgress"
                    @click="$emit('zoom', 10)"
                  >
                    <v-icon>mdi-plus</v-icon>
                    <v-tooltip activator="parent" location="bottom">Zoom In</v-tooltip>
                  </v-btn>

                  <v-btn
                    icon
                    class="mr-1 btn-annotations"
                    size="small"
                    :color="isEditMode ? 'yellow-lighten-1' : ''"
                    :variant="isEditMode ? 'elevated' : 'outlined'"
                    :disabled="inProgress"
                    @click="$emit('showAnnotations')"
                  >
                    <v-icon>mdi-format-annotation-plus</v-icon>
                    <v-tooltip activator="parent" location="bottom">Annotations</v-tooltip>
                  </v-btn>
                </div>
              </div>
            </div>

            <ControlsEdit v-if="isEditMode" />

            <div v-if="!isCompareView && !isEditMode" class="actions-mode">
              <v-divider vertical thickness="2" inset class="mr-3"></v-divider>

              <div class="types-mode">
                <v-btn
                  v-if="isCompareView || isWrappedView"
                  icon
                  class="mr-1"
                  size="small"
                  variant="outlined"
                  :disabled="inProgress"
                  @click="$router.push({ name: 'docReader' })"
                >
                  <v-icon>mdi-file-eye-outline</v-icon>
                  <v-tooltip activator="parent" location="bottom">View Mode</v-tooltip>
                </v-btn>

                <v-btn
                  v-if="!isWrappedView"
                  icon
                  class="mr-1"
                  size="small"
                  variant="outlined"
                  :disabled="inProgress"
                  @click="$router.push({ name: 'wrappedView' })"
                >
                  <v-icon>mdi-table-headers-eye</v-icon>
                  <v-tooltip activator="parent" location="bottom">Wrapped View</v-tooltip>
                </v-btn>

                <v-btn
                  v-if="!isCompareView"
                  icon
                  class="mr-1"
                  size="small"
                  variant="outlined"
                  :disabled="inProgress"
                  @click="$router.push({ name: 'compareView' })"
                >
                  <v-icon>mdi-file-compare</v-icon>
                  <v-tooltip activator="parent" location="bottom">Compare View</v-tooltip>
                </v-btn>
              </div>

              <v-divider
                v-if="!isCompareView"
                vertical
                thickness="2"
                inset
                class="mx-3"
              ></v-divider>

              <div v-if="!isCompareView" class="actions-files">
                <v-btn
                  icon
                  class="mr-1"
                  size="small"
                  variant="outlined"
                  :disabled="inProgress"
                  @click="$router.push({ name: 'editMode' })"
                >
                  <v-icon>mdi-file-edit-outline</v-icon>
                  <v-tooltip activator="parent" location="bottom">Edit Mode</v-tooltip>
                </v-btn>

                <v-btn
                  icon
                  class="mr-1"
                  size="small"
                  variant="outlined"
                  :disabled="inProgress"
                  @click="showDialogCreateNewDocument"
                >
                  <v-icon>mdi-file-document-plus-outline</v-icon>
                  <v-tooltip activator="parent" location="bottom">Create new</v-tooltip>
                </v-btn>

                <input
                  type="file"
                  ref="file"
                  style="display: none"
                  accept="application/pdf"
                  multiple
                  @change="handleFileChange"
                />

                <v-btn
                  icon
                  class="mr-1"
                  size="small"
                  variant="outlined"
                  :disabled="inProgress"
                  @click="$refs.file.click()"
                >
                  <v-icon>mdi-file-upload-outline</v-icon>
                  <v-tooltip activator="parent" location="bottom">Upload File</v-tooltip>
                </v-btn>

                <v-badge
                  class="mx-3"
                  color="deep-orange-lighten-2"
                  :model-value="!!storeDocument.selectedDocIds.length"
                  max="99"
                  :content="storeDocument.selectedDocIds.length"
                >
                  <v-btn
                    icon
                    size="small"
                    variant="outlined"
                    :disabled="!storeDocument.selectedDocIds.length || inProgress"
                    @click="download"
                  >
                    <v-icon>mdi-file-download-outline</v-icon>
                    <v-tooltip activator="parent" location="bottom">Download</v-tooltip>
                  </v-btn>
                </v-badge>

                <v-badge
                  class="mr-1"
                  color="deep-orange-lighten-2"
                  :model-value="storeDocument.selectedDocIds.length === 1"
                  max="99"
                  :content="storeDocument.selectedDocIds.length"
                >
                  <v-btn
                    icon
                    size="small"
                    variant="outlined"
                    :disabled="storeDocument.selectedDocIds.length !== 1 || inProgress"
                    @click="print"
                  >
                    <v-icon>mdi-printer-outline</v-icon>
                    <v-tooltip activator="parent" location="bottom">Print</v-tooltip>
                  </v-btn>
                </v-badge>
              </div>
            </div>

            <v-divider
              v-if="!isCompareView"
              :color="isEditMode ? 'black' : ''"
              vertical
              thickness="2"
              inset
              class="mx-3"
            ></v-divider>

            <div v-if="!isCompareView" class="action-save">
              <v-btn
                icon
                class="mr-1"
                size="small"
                :variant="isEditMode ? 'elevated' : 'outlined'"
                :color="isEditMode ? 'yellow-lighten-1' : ''"
                :disabled="!saveActive || inProgress"
                @click="save"
              >
                <v-icon>mdi-content-save-all-outline</v-icon>
                <v-tooltip activator="parent" location="bottom">Save</v-tooltip>
              </v-btn>

              <v-btn
                icon
                class="mr-1"
                size="small"
                :variant="isEditMode ? 'elevated' : 'outlined'"
                :color="isEditMode ? 'yellow-lighten-1' : ''"
                :disabled="inProgress"
                @click="exit"
              >
                <v-icon>mdi-location-exit</v-icon>
                <v-tooltip activator="parent" location="bottom">Exit</v-tooltip>
              </v-btn>
            </div>
          </div>
        </v-spacer>

        <v-app-bar-nav-icon
          icon="mdi-dots-vertical"
          variant="text"
          @click.stop="rightPanel = !rightPanel"
        ></v-app-bar-nav-icon>

        <v-btn
          v-if="isCompareView && isFirstViewer"
          icon
          class="btn-view-mode"
          size="small"
          variant="outlined"
          :disabled="inProgress"
          @click="$router.push({ name: 'docReader' })"
        >
          <v-icon>mdi-file-eye-outline</v-icon>
          <v-tooltip activator="parent" location="bottom">View Mode</v-tooltip>
        </v-btn>
      </v-app-bar>

      <v-navigation-drawer
        v-model="leftPanel"
        class="left-list-panel"
        :class="{
          active: leftPanel,
        }"
        :location="$vuetify.display.mobile ? 'top' : undefined"
        temporary
      >
        <div v-if="storeDocument.inProgress" class="spinner">
          <v-progress-circular
            color="deep-orange-lighten-1"
            indeterminate
            size="90"
            width="8"
          ></v-progress-circular>
        </div>

        <div v-if="!storeDocument.inProgress" class="search">
          <v-text-field
            class="mr-1"
            label="Search"
            density="compact"
            hide-details="true"
            clearable
            variant="outlined"
            @update:modelValue="storeDocument.searchDocuments($event)"
          ></v-text-field>

          <v-menu transition="scale-transition">
            <template v-slot:activator="{ props }">
              <v-badge
                dot
                class="mr-3"
                color="deep-orange-lighten-2"
                :model-value="selectedSortType !== SortType.NONE"
              >
                <v-btn v-bind="props" icon variant="text">
                  <v-icon>mdi-sort</v-icon>
                  <v-tooltip activator="parent" location="bottom">{{
                    selectedSortType !== SortType.NONE ? `Sorted by ${selectedSortType}` : 'Sort'
                  }}</v-tooltip>
                </v-btn>
              </v-badge>
            </template>

            <v-list>
              <v-list-item
                v-for="(item, i) in sortItems"
                :key="i"
                :value="item.title"
                :active="item.title === selectedSortType"
                @click="sort(item.title)"
              >
                <v-list-item-title
                  >{{ item.title }} <v-icon>{{ item.icon }}</v-icon></v-list-item-title
                >
              </v-list-item>
            </v-list>
          </v-menu>
        </div>

        <v-list @click:select="clickDocument($event.id)">
          <v-list-item
            v-for="(item, index) in storeDocument.documents.map((doc) => ({
              title: doc.name.replace(/\.[^/.]+$/, ''),
              value: doc.id,
            }))"
            :key="item.value"
            :title="item.title"
            :value="item.value"
            :active="index === indexActiveFirstPageId"
          />
        </v-list>
      </v-navigation-drawer>

      <v-navigation-drawer
        v-if="!isCompareView"
        v-model="thumbnailPanel"
        class="thumbnail-panel"
        :class="{
          active: leftPanel,
          'thumbnail-width': thumbnailPanel && !$vuetify.display.mobile,
          'thumbnail-left-panel': leftPanel,
        }"
        :location="$vuetify.display.mobile ? 'top' : undefined"
        temporary
      >
        <ThumbnailPanel :activePageId="activePageId" @setActivePageId="setActivePageId" />
      </v-navigation-drawer>

      <v-navigation-drawer
        v-model="rightPanel"
        :location="$vuetify.display.mobile ? 'bottom' : 'right'"
        class="right-list-panel"
        :class="{
          active: rightPanel,
          'panel-width': rightPanel && !$vuetify.display.mobile,
          'panel-height': $vuetify.display.mobile,
        }"
        temporary
      >
        <DocumentPanel :activeDoc="activeDoc" :isEditMode="isEditMode" />
      </v-navigation-drawer>
    </v-layout>
  </v-card>
</template>
<style scoped>
.v-toolbar-title {
  max-width: 250px;
  min-width: 250px;
}

.thumbnail-width {
  width: 205px !important;
}

.thumbnail-left-panel {
  left: 256px !important;
}

.compare-view .v-toolbar-title {
  display: none;
}

.second.compare-view .actions-view {
  margin-right: 65px;
}

.compare-view .actions-view {
  padding-left: 4px;
}

.right-list-panel,
.left-list-panel,
.thumbnail-panel {
  transition: none;
}

:not(.second).compare-view .active.right-list-panel {
  right: 50% !important;
}

.second.compare-view .active.left-list-panel {
  left: 50% !important;
}

.card {
  height: 64px;
  cursor: default;
  z-index: 999;
}

.compare-view .v-layout header {
  width: 50% !important;
  left: auto !important;
}

.panel-width {
  width: 400px !important;
  border: 0;
}

.panel-height {
  max-height: 200px;
}

.search {
  display: flex;
  justify-content: center;
  padding: 10px 10px 0 10px;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
  color: white;
}

.controls button,
.btn-wrapped-view,
.btn-thumbnail-view,
.btn-view-mode {
  border-radius: 10%;
}

.btn-view-mode {
  margin-inline-end: 5px !important;
  margin-left: 4px;
}

.controls button:hover {
  opacity: 0.7;
}

.controls .btn-select {
  border-radius: 0 10% 10% 0;
}

.actions-view {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.actions-mode {
  display: flex;
  align-items: center;
  height: 64px;
}

.buttons-navigation,
.buttons-rotate,
.buttons-zoom {
  display: flex;
}

.doc-counter {
  width: 70px;
  height: 40px;
  text-align: center;
  align-content: center;
  background: white;
  color: black;
  margin-right: 4px;
  border-radius: 10%;
  line-height: 20px;
  cursor: default;
}

.buttons-pages {
  display: flex;
  width: 100%;
  justify-content: center;
  margin-left: -90px;
}

.compare-view .buttons-pages {
  margin-left: -165px;
}

.edit-mode .buttons-pages {
  margin-left: 75px;
}

.btn-zoom {
  margin-left: 32px;
}

.btn-annotations {
  margin-left: 40px;
}

.compare-view .btn-zoom {
  margin-left: 14px;
}

.compare-view .btn-annotations {
  margin-left: 20px;
}

.types-mode,
.actions-files,
.action-save {
  display: flex;
  margin-left: 4px;
}

.zoom-select-wrapper {
  width: 60px;
  display: inline-block;
}

.select {
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 2px 5px 0 rgba(0, 0, 0, 0.05),
    0 2px 10px 0 rgba(0, 0, 0, 0.05);
}

.select-current {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  height: 40px;
  line-height: 56px;
  color: black;
  background-color: white;
  cursor: default;
  border: 1px solid white;
  border-right: none;
  border-radius: 10% 0 0 10%;
}

.doc-counter,
.select-current-value {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10 and IE 11 */
  user-select: none; /* Standard syntax */
}

.custom-options {
  width: 100px;
  position: absolute;
  display: block;
  top: 100%;
  box-shadow:
    0 2px 2px 0 rgb(0 0 0 / 14%),
    0 1px 5px 0 rgb(0 0 0 / 12%),
    0 3px 1px -2px rgb(0 0 0 / 20%);
  background: white;
  transition: all 0.2s;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  z-index: 999;
}

.select.open .custom-options {
  opacity: 1;
  visibility: visible;
  pointer-events: all;
}

.custom-option {
  position: relative;
  display: block;
  padding-left: 7px;
  font-size: 14px;
  font-weight: 400;
  color: rgba(2, 21, 44, 0.88);
  line-height: 19px;
  transition: all 0.5s;
}

.custom-option:hover {
  cursor: pointer;
  background-color: gray;
}

.custom-option.selected {
  color: white;
  background-color: #1867c0;
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

@media only screen and (max-width: 1830px) {
  .compare-view .buttons-pages {
    justify-content: flex-start;
    margin: 0;
  }
}

@media only screen and (max-width: 1768px) {
  .edit-mode .btn-zoom,
  .edit-mode .btn-annotations {
    margin-left: 0;
  }
}

@media only screen and (max-width: 1670px) {
  .compare-view {
    margin-left: 0;
  }

  .compare-view .btn-zoom,
  .compare-view .btn-annotations {
    margin-left: 0;
  }

  .second.compare-view .actions-view {
    margin-right: 0;
  }

  .edit-mode .buttons-pages {
    margin-left: 0;
  }
}

@media only screen and (max-width: 1620px) {
  .buttons-pages {
    margin-left: 0;
  }
}

@media only screen and (max-width: 1590px) {
  .edit-mode .v-toolbar__content > .v-toolbar-title {
    margin-inline-start: 2px;
  }
}

@media only screen and (max-width: 1550px) {
  .btn-zoom,
  .btn-annotations {
    margin-left: 0;
  }

  .compare-view .buttons-pages {
    padding-right: 0;
  }
}

@media only screen and (max-width: 1500px) {
  .v-divider {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
}

@media only screen and (max-width: 1472px) {
  .edit-mode .v-toolbar-title {
    min-width: calc(100% - 1180px);
  }

  .edit-mode .buttons-rotate .v-badge,
  .edit-mode .actions-files .v-badge {
    margin-left: 0px !important;
    margin-right: 4px !important;
  }
}

@media only screen and (max-width: 1395px) {
  .v-toolbar-title {
    min-width: calc(100% - 1115px);
  }

  .buttons-rotate .v-badge,
  .actions-files .v-badge {
    margin-left: 0px !important;
    margin-right: 4px !important;
  }
}

@media only screen and (max-width: 1150px) {
  .buttons-pages {
    padding-right: 0;
  }

  .v-toolbar__content > .v-toolbar-title {
    margin-inline-start: 2px;
  }
}
</style>
