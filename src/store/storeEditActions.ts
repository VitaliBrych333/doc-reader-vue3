import { reactive } from 'vue'

export const storeEditActions = reactive({
  copyPageIds: [] as string[],
  cutPageIds: [] as string[],
  copyDocIds: [] as string[],
  cutDocIds: [] as string[],

  addCopyPageId(pageId: string) {
    this.copyPageIds = [...this.copyPageIds].concat(pageId)
  },

  clearCopyPageIds() {
    this.copyPageIds = []
  },

  addCutPageId(pageId: string) {
    this.cutPageIds = [...this.cutPageIds].concat(pageId)
  },

  clearCutPageIds() {
    this.cutPageIds = []
  },

  addCopyDocId(docId: string) {
    this.copyDocIds = [...this.copyDocIds].concat(docId)
  },

  clearCopyDocIds() {
    this.copyDocIds = []
  },

  addCutDocId(docId: string) {
    this.cutDocIds = [...this.cutDocIds].concat(docId)
  },

  clearCutDocIds() {
    this.cutDocIds = []
  },

  getEditedPageIds() {
    return [...this.cutPageIds].concat([...this.copyPageIds])
  },

  getEditedDocIds() {
    return [...this.cutDocIds].concat([...this.copyDocIds])
  },
})
