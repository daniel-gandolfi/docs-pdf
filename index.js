import 'dotenv/config'
import pdfjs from 'pdfjs'
import puppeteer from 'puppeteer'
import path from "path"
import fs from 'fs'
import {joinGeneratedNumberedPdfFilesInFolder} from "./joinTmpPdfList.js"
import paths from "./paths.js" 

// Create PDF doc

const doc = new pdfjs.Document()
// Go to page
const browser = await puppeteer.launch({ headless: true })
const page = await browser.newPage()
await page.emulateMediaType('print')

const {
  HEADER_PATH,
  FOOTER_PATH,
  PDF_PATH,
  DOCS_URL,
  NEXT_PAGE_SELECTOR,
  EXTRA_LOAD_WAIT_TIME
} = process.env


const headerContent = HEADER_PATH && fs.existsSync(path.resolve(HEADER_PATH)) ? 
  fs.promises.readFile(HEADER_PATH, {
    encoding: "UTF-8"
  })
  : undefined
const footerContent = FOOTER_PATH && fs.existsSync(path.resolve(FOOTER_PATH)) ? 
  fs.promises.readFile(FOOTER_PATH, {
    encoding: "UTF-8"
  })
  : undefined


if (!fs.existsSync(paths.tmpOutputFiles)){
  fs.mkdir(paths.tmpOutputFiles, (err) => {
    if (err)  {
      console.error(err) 
      process.exit(1)
    }
  })
}

const resumeFile = path.resolve("./memory")
const initialData = fs.existsSync(resumeFile) ? JSON.parse(fs.readFileSync(resumeFile,{
    encoding: "UTF-8"
  } )) : {
  page: DOCS_URL,
  count: 0
}
let count = initialData.count;
const firstPageUrl = initialData.page

// Go to page
await page.goto(firstPageUrl)

// Create PDF of page
async function createPDF(page) {
  await page.waitForNetworkIdle()
  const srcpromise = page.pdf({
    path: path.resolve(paths.tmpOutputFiles, count + '.pdf'),
    displayHeaderFooter: headerContent || footerContent,
    headerTemplate: headerContent ? await headerContent(): undefined,
    footerTemplate: footerContent ? await footerContent(): undefined,
    printBackground: true,
    format: 'A4',
    margin: { top: '1.9cm', bottom: '3.67cm', left: '1.9cm', right: '1.9cm' }
  })


  const selector = NEXT_PAGE_SELECTOR


  //This is used to wait page load a bit. It's better than always waiting <x> time
  await page.waitForSelector(selector, {
    timeout: Math.max(EXTRA_LOAD_WAIT_TIME, 1)
  }).catch(() => "")


  const nextLink = await page.evaluate((selector) => {
    const element = document.querySelector(selector)
    if (element) {
      return element.href
    } else {
      return ''
    }
  }, selector)

  const pdf = new pdfjs.ExternalDocument(await srcpromise)
  doc.addPagesOf(pdf)

  if (nextLink) {
    console.log(`Navigating to ${nextLink}...`)
    await page.goto(nextLink, {
      waitUntil: 'networkidle0'
    })

    await page.evaluate(() => {
      // const viewPortHeight = document.documentElement.clientHeight;
      let lastScrollTop = document.scrollingElement.scrollTop

      // Scroll to bottom of page until we can't scroll anymore.
      const scroll = () => {
        document.scrollingElement.scrollTop += 100 //(viewPortHeight / 2);
        if (document.scrollingElement.scrollTop !== lastScrollTop) {
          lastScrollTop = document.scrollingElement.scrollTop
          requestAnimationFrame(scroll)
        }
      }
      scroll()
    })
    console.log(`${nextLink} done!`)
    count++;
    await fs.promises.writeFile(resumeFile, JSON.stringify({
      page: nextLink,
      count
    }), {
      encoding: "UTF-8"
    })
    await createPDF(page)
  } else {
    console.log('Saving pdf...')
    await joinGeneratedNumberedPdfFilesInFolder(PDF_PATH, paths.tmpOutputFiles);
    console.debug("cleanup");
    try {
      await fs.promises.rm(resumeFile)
    } catch (err) {
      console.error("did not find memory file, pretty odd", err)
    }
    await (Promise.all([
      browser.close(),
      fs.promises.rmdir(paths.tmpOutputFiles, {
        recursive: true
      }),
    ])) 
    console.log("Your pdf is ready at ", PDF_PATH)
  }
}

await createPDF(page)
