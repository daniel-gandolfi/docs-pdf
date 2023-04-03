import {joinPdfList} from "./joinPdfList.js"
import pdfjs from "pdfjs"
import fs from "fs";
import path from "path";
import paths from "./paths.js"
/**
* @param {string } fileA
* @param {string} fileB 
* */
function compareGeneratedFileNames(fileA, fileB) {
    if (fileA.length === fileB.length) {
        return fileA.localeCompare(fileB)
    }
    return fileA.length - fileB.length;
}
/**
* @param {string} output 
* @param {string} folderPath
* */
export async function joinGeneratedNumberedPdfFilesInFolder(output= process.env.PDF_PATH, folderPath = paths.tmpOutputFiles) {
    const files = await fs.promises.readdir(folderPath)
    const pdfDocument = joinPdfList(files.sort(compareGeneratedFileNames).map(fileName => path.resolve(paths.tmpOutputFiles, fileName)))
    pdfDocument.pipe(fs.createWriteStream(path.resolve(output)))
    await pdfDocument.end()
}

if (process.env.PDF_PATH && process.env.RUN){
    joinGeneratedNumberedPdfFilesInFolder(process.env.PDF_PATH)
}
