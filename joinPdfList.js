import fs from 'fs'
import pdfjs from 'pdfjs'
export function joinPdfList(pdfPathList) {
  const doc = new pdfjs.Document()
  for (let pdfPath of pdfPathList) {
    doc.addPagesOf(new pdfjs.ExternalDocument(fs.readFileSync(pdfPath)))
  }
  return doc
}
