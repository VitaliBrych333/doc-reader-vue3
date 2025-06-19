import * as PDFJS from 'pdfjs-dist'

export interface IDocumentId {
  id: string;
}

export interface IInfo {
  comments: string;
  author: string;
  dateCreated: string;
  dateModified: string;
}

export interface IDocument extends IDocumentId {
  name: string;
  info: IInfo;
  pages: IPage[];
}

export interface IFileDocument extends IDocument {
  file: string;
}

export interface IPage {
  pageId: string;
  numPage: number;
  rotate: number;
  originalDocumentId: string;
  originalNumPage: number;
  url: PDFJS.PDFDocumentLoadingTask;
}

export interface IDocumentsStack {
  documents: IDocument[];
  editActions: IEditAction[];
  index: number;
}

export interface IPageDetails extends IDocumentId {
  page: IPage;
}

export interface ICreateDocument {
  doc: IDocument;
  positionIndex: number;
}

export interface ICreatePage extends IPageDetails {
  positionIndex: number;
}

export interface IRename extends IDocumentId {
  name: string;
}

export interface IUpdate extends IRename {
  info: IInfo;
}

export interface IEditAction {
  type: string;
  value: IDocumentId | IPageDetails | ICreateDocument | ICreatePage | IRename | IUpdate
}

export interface IReqSaveDocuments {
  userId: string;
  rotate: IPageDetails[];
  editActions: IEditAction[];
  newDocuments: IDocument[];
}

export interface IRespGetDocuments extends IFileDocument {
  userId: string;
  documentId: string;
  name: string;
  info: IInfo;
}
