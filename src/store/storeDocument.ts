import { reactive } from 'vue'
import type {
  IInfo,
  ICreateDocument,
  ICreatePage,
  IEditAction,
  IDocumentsStack,
  IDocument,
  IPage,
  IPageDetails,
  IRename,
  IUpdate
} from '../shared/document.interface'
import { ActionType, SortType } from '../shared/actionNames.enum'
import { Document, Page, Prefixes } from '../utils/utils'

export const storeDocument = reactive({
  isDocumentsLoaded: false,
  inProgress: false,

  documents: [] as Document[],
  startOrderDocuments: [] as Document[],

  selectedDocIds: [] as string[],
  selectedPageIds: [] as string[],

  // to navigate between modes
  activePageId: '',

  editActions: [] as IEditAction[],
  rotatePages: [] as IPageDetails[],

  documentsStack: [] as IDocumentsStack[],
  indexDocumentsStack: 0,
  currentIndexDocumentsStack: 0,

  // for Compare Mode
  isSynchronousScroll: false,
  firstViewerScrollLock: false,
  secondViewerScrollLock: false,

  setIsDocumentsLoaded(value: boolean) {
    this.isDocumentsLoaded = value
  },

  setInProgress(value: boolean) {
    this.inProgress = value
  },

  setActivePageId(pageId: string) {
    this.activePageId = pageId
  },

  toggleSynchronous() {
    this.isSynchronousScroll = !this.isSynchronousScroll
  },

  setFirstViewerScrollLock(value: boolean) {
    this.firstViewerScrollLock = value
  },

  setSecondViewerScrollLock(value: boolean) {
    this.secondViewerScrollLock = value
  },

  resetSettingsForCompareMode() {
    this.isSynchronousScroll = false
    this.firstViewerScrollLock = false
    this.secondViewerScrollLock = false
  },

  addPage(id: string, page: IPage, positionIndex: number) {
    this.documents = [...this.documents].map((doc) =>
      doc.id === id
        ? {
            ...doc,
            pages: (this.insertValueInArray(doc.pages, page, positionIndex) as Page[]).map(
              (page, index) => ({ ...page, numPage: index + 1 }),
            ),
          }
        : doc,
    )

    if (id.startsWith(Prefixes.NEW_DOC)) {
      this.editActions = [...this.editActions].map((editAction) =>
        editAction.type === ActionType.CREATE_DOCUMENT &&
        (editAction.value as ICreateDocument)?.doc?.id === id
          ? {
              ...editAction,
              value: {
                ...editAction.value,
                doc: {
                  ...(editAction.value as ICreateDocument).doc,
                  pages: (
                    this.insertValueInArray(
                      (editAction.value as ICreateDocument).doc.pages,
                      page,
                      positionIndex,
                    ) as Page[]
                  ).map((page, index) => ({ ...page, numPage: index + 1 })),
                },
              },
            }
          : editAction,
      )
    } else {
      this.editActions = [...this.editActions].concat({
        type: ActionType.CREATE_PAGE,
        value: {
          id,
          positionIndex,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          page: (({ url, ...rest }) => rest)(page) as Page,
        },
      })
    }
  },

  setDocument(doc: IDocument, positionIndex: number) {
    this.documents = this.insertValueInArray(this.documents, doc, positionIndex) as Document[]
    this.startOrderDocuments = [...this.documents]
  },

  addDocument(doc: IDocument, positionIndex: number) {
    this.setDocument(doc, positionIndex)
    this.editActions = [...this.editActions].concat({
      type: ActionType.CREATE_DOCUMENT,
      value: {
        positionIndex,
        doc: {
          ...doc,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          pages: doc.pages.map((page) => (({ url, ...rest }) => rest)(page) as Page),
        },
      },
    })
  },

  changeNameDocument(id: string, newName = '') {
    const name = `${newName}.pdf`

    this.documents = [...this.documents].map((doc) => (doc.id === id ? { ...doc, name } : doc))

    if (id.startsWith(Prefixes.NEW_DOC)) {
      this.editActions = [...this.editActions].map((editAction) =>
        editAction.type === ActionType.CREATE_DOCUMENT &&
        (editAction.value as ICreateDocument)?.doc?.id === id
          ? {
              ...editAction,
              value: {
                ...editAction.value,
                doc: {
                  ...(editAction.value as ICreateDocument).doc,
                  name,
                },
              },
            }
          : editAction,
      )
    } else {
      const startDocumentName = this.startOrderDocuments.find(doc => doc.id === id)?.name

      this.editActions = [...this.editActions]
        .filter((editAction) => !(editAction.type === ActionType.RENAME && (editAction.value as IRename)?.id === id))

      if (startDocumentName !== name) {
        this.editActions = [...this.editActions].concat({
          type: ActionType.RENAME,
          value: { id, name },
        })
      }
    }
  },

  updateDocumentInfo(id: string, info: IInfo) {
    this.documents = [...this.documents].map((doc) => (doc.id === id ? { ...doc, info } : doc))

    if (id.startsWith(Prefixes.NEW_DOC)) {
      this.editActions = [...this.editActions].map((editAction) =>
        editAction.type === ActionType.CREATE_DOCUMENT &&
        (editAction.value as ICreateDocument)?.doc?.id === id
          ? {
              ...editAction,
              value: {
                ...editAction.value,
                doc: {
                  ...(editAction.value as ICreateDocument).doc,
                  info,
                },
              },
            }
          : editAction,
      )
    } else {
      const startDocumentInfo = this.startOrderDocuments.find(doc => doc.id === id)?.info

      this.editActions = [...this.editActions]
        .filter((editAction) => !(editAction.type === ActionType.UPDATE_PROPERTIES && (editAction.value as IUpdate)?.id === id))

      if (!(
            startDocumentInfo?.comments === info.comments &&
            startDocumentInfo?.author === info.author &&
            new Date(startDocumentInfo?.dateCreated).getTime() === new Date(info.dateCreated).getTime() &&
            new Date(startDocumentInfo?.dateModified).getTime() === new Date(info.dateModified).getTime()
          )
        ) {

        this.editActions = [...this.editActions]
          .concat({
            type: ActionType.UPDATE_PROPERTIES,
            value: { id, info },
          })
      }
    }
  },

  removePage(id: string) {
    const targetDoc = this.documents.find(
      (doc) => doc.pages.filter((page) => page.pageId === id).length,
    ) as Document
    const targetPage = targetDoc?.pages.find((page) => page.pageId === id) as Page

    this.documents = [...this.documents].map((doc) =>
      doc.id === targetDoc.id
        ? {
            ...doc,
            pages: doc.pages
              .filter((page) => page.pageId !== targetPage.pageId)
              .map((page, index) => ({ ...page, numPage: index + 1 })),
          }
        : doc,
    )

    if (this.documents.some((doc) => !doc.pages.length)) {
      this.documents = this.documents.filter((doc) => {
        if (!doc.pages.length) {
          this.removeDocument(doc.id)
        }
        return doc.pages.length
      })
    } else if (targetDoc.id.startsWith(Prefixes.NEW_DOC)) {
      this.editActions = [...this.editActions].map((editAction) =>
        editAction.type === ActionType.CREATE_DOCUMENT &&
        (editAction.value as ICreateDocument)?.doc?.id === targetDoc.id
          ? {
              ...editAction,
              value: {
                ...editAction.value,
                doc: {
                  ...(editAction.value as ICreateDocument).doc,
                  pages: (editAction.value as ICreateDocument).doc.pages
                    .filter((page) => page.pageId !== targetPage.pageId)
                    .map((page, index) => ({ ...page, numPage: index + 1 })),
                },
              },
            }
          : editAction,
      )
    } else {
      this.editActions = [...this.editActions].concat({
        type: ActionType.DELETE_PAGE,
        value: {
          id: targetDoc?.id,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          page: (({ url, ...rest }) => rest)(targetPage) as Page,
        },
      })
    }
  },

  removeDocument(id: string) {
    this.documents = [...this.documents].filter((doc) => doc.id !== id)

    if (id.startsWith(Prefixes.NEW_DOC)) {
      this.editActions = [...this.editActions].filter(
        (editAction) =>
          !(
            editAction.type === ActionType.CREATE_DOCUMENT &&
            (editAction.value as ICreateDocument)?.doc?.id === id
          ),
      )
    } else {
      this.editActions = [...this.editActions].concat({
        type: ActionType.DELETE_DOCUMENT,
        value: { id },
      })
    }
  },

  rotate(id: string, value: number) {
    const targetDoc = this.documents.find(
      (doc) => doc.pages.filter((page) => page.pageId === id).length,
    ) as Document
    const targetDocId = targetDoc.id

    this.documents = [...this.documents].map((doc) =>
      doc.id === targetDocId
        ? {
            ...doc,
            pages: doc.pages.map((page) =>
              page.pageId === id
                ? {
                    ...page,
                    rotate: this.getRotateValue(page.rotate, value),
                  }
                : page,
            ),
          }
        : doc,
    )

    const page = this.documents
      .find((doc) => doc.id === targetDocId)?.pages.find((page) => page.pageId === id) as Page

    if (targetDocId.startsWith(Prefixes.NEW_DOC)) {
      this.editActions = [...this.editActions].map((editAction) =>
        editAction.type === ActionType.CREATE_DOCUMENT &&
        (editAction.value as ICreateDocument)?.doc?.id === targetDocId
          ? {
              ...editAction,
              value: {
                ...editAction.value,
                doc: {
                  ...(editAction.value as ICreateDocument).doc,
                  pages: (editAction.value as ICreateDocument).doc.pages.map((page) =>
                    page.pageId === id
                      ? {
                          ...page,
                          rotate: this.getRotateValue(page.rotate, value),
                        }
                      : page,
                  ),
                },
              },
            }
          : editAction,
      )
    } else if (
      this.editActions.filter(
        (editAction) =>
          editAction.type === ActionType.CREATE_PAGE &&
          (editAction.value as ICreatePage).page.pageId === id,
      ).length
    ) {
      this.editActions = [...this.editActions].map((editAction) =>
        editAction.type === ActionType.CREATE_PAGE &&
        (editAction.value as ICreatePage).page.pageId === id
          ? {
              ...editAction,
              value: {
                ...editAction.value,
                page: {
                  ...(editAction.value as ICreatePage).page,
                  rotate: this.getRotateValue((editAction.value as ICreatePage).page.rotate, value),
                },
              },
            }
          : editAction,
      )
    } else {
      this.rotatePages = [...this.rotatePages].filter((rotatePage) => rotatePage.page.pageId !== id)

      if (page.rotate !== 0) {
        this.rotatePages = [...this.rotatePages].concat({
          id: targetDocId,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          page: (({ url, ...rest }) => rest)(page) as Page,
        })
      }
    }
  },

  clearRotatePages() {
    this.rotatePages = []
  },

  addSelectedPageId(pageId: string, multi = false) {
    this.selectedPageIds = multi
      ? this.selectedPageIds.includes(pageId)
        ? [...this.selectedPageIds].filter((id) => id !== pageId)
        : [...this.selectedPageIds].concat(pageId)
      : [pageId]
  },

  clearSelectedPageIds() {
    this.selectedPageIds = []
  },

  addSelectedDocId(docId: string, multi = false) {
    this.selectedDocIds = multi
      ? this.selectedDocIds.includes(docId)
        ? [...this.selectedDocIds].filter((id) => id !== docId)
        : [...this.selectedDocIds].concat(docId)
      : [docId]
  },

  clearSelectedDocIds() {
    this.selectedDocIds = []
  },

  addDocumentsStack() {
    this.indexDocumentsStack += 1
    this.currentIndexDocumentsStack = this.indexDocumentsStack
    this.documentsStack = [...this.documentsStack].concat({
      documents: this.documents,
      editActions: this.editActions,
      index: this.indexDocumentsStack,
    })
  },

  updateDocumentsStack() {
    const { documents, editActions } = this.documentsStack.find(
      (stack) => stack.index === this.currentIndexDocumentsStack,
    ) as IDocumentsStack

    this.documents = documents || []
    this.editActions = editActions || []
  },

  clearDocumentsStack() {
    this.isDocumentsLoaded = false
    this.refresh()
  },

  refresh() {
    this.documents = []
    this.editActions = []
    this.indexDocumentsStack = 0
    this.currentIndexDocumentsStack = 0
    this.documentsStack = []
    this.activePageId = ''
    this.clearRotatePages()
    this.clearSelectedPageIds()
    this.clearSelectedDocIds()
  },

  undo() {
    this.currentIndexDocumentsStack -= 1
    this.updateDocumentsStack()
  },

  redo() {
    this.currentIndexDocumentsStack += 1
    this.updateDocumentsStack()
  },

  searchDocuments(value: string) {
    this.documents = !value || !value.trim()
      ? [...this.startOrderDocuments]
      : [...this.startOrderDocuments]
          .filter(doc => doc.name.match(/([^\/]+)(?=\.\w+$)/)?.[0].toLowerCase()
          .includes(value.trim().toLowerCase()))
  },

  sortDocuments(type: string) {
    this.documents = type === SortType.NONE
      ? [...this.startOrderDocuments]
      : [...this.startOrderDocuments].sort((a, b) => {
          if (a.name.toLowerCase() < b.name.toLowerCase()) return type === SortType.ASC ? -1 : 1;
          if (a.name.toLowerCase() > b.name.toLowerCase()) return type === SortType.ASC ? 1 : -1;
          return 0;
        })
  },

  insertValueInArray<T>(array: T[], value: T, positionIndex: number) {
    return [...array.slice(0, positionIndex), value, ...array.slice(positionIndex)]
  },

  getAllPages() {
    return this.documents.reduce((acc, curr) => acc.concat(curr.pages), [] as Page[]) as Page[]
  },

  getRotateValue(value: number, rotate: number) {
    const newValue = value + rotate
    return newValue > 270 || newValue < -270 ? 0 : newValue
  },
})
