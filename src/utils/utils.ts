import * as PDFJS from 'pdfjs-dist'
import { v4 as uuid } from 'uuid'
import type { IInfo, IPage } from '../shared/document.interface'

export enum Prefixes {
  NEW_DOC = 'new-doc',
  PAGE = 'page',
}

export function getDocName(name: string) {
  return name?.match(/([^\/]+)(?=\.\w+$)/)?.[0] as string
}

export function getNewDocId() {
  return `${Prefixes.NEW_DOC}-${uuid()}`
}

// Timestamp SQL format
export function getSQLFormatDate(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` + ' ' + date.toTimeString().split(' ')[0]
}

export class Page {
  pageId: string
  numPage: number
  rotate: number
  originalDocumentId: string
  originalNumPage: number
  url: PDFJS.PDFDocumentLoadingTask

  constructor(
    numPage: number,
    originalDocumentId: string,
    originalNumPage: number,
    url: PDFJS.PDFDocumentLoadingTask,
    rotate = 0,
  ) {
    this.pageId = `${Prefixes.PAGE}-${uuid()}`
    this.numPage = numPage
    this.rotate = rotate
    this.originalDocumentId = originalDocumentId
    this.originalNumPage = originalNumPage
    this.url = url
  }
}

export class Document {
  id: string
  name: string
  pages: IPage[]
  info: IInfo

  constructor(
    name: string,
    pages: IPage[],
    id = getNewDocId(),
    info = {}
  ) {
    const objUser = localStorage.getItem(document.location.origin)
    const userEmail = objUser ? JSON.parse(objUser).user_Email : null
    const formatSQLDateTime = getSQLFormatDate(new Date())

    this.id = id
    this.name = name
    this.pages = pages
    this.info = Object.assign({
      comments: '',
      author: userEmail,
      dateCreated: formatSQLDateTime,
      dateModified: formatSQLDateTime
    }, info)
  }
}
