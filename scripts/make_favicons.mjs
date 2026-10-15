// Renders favicon.png (32x32) and favicon.ico (16, 32 and 48 px) from favicon.svg, so every icon is the same mark.
//
//   node scripts/make_favicons.mjs          (needs playwright-core, resolved from the CRM repo when it is not installed here)
//
// favicon.svg is the source: the Labyrinth maze logo, black on a white rounded tile (the same black-on-white logo as apple-touch-icon.png).
// It was traced from assets/logo-maze-480.png (potrace); change the SVG, run this, and commit the three files.
// wharton-site/ keeps its own copies of favicon.* (python3 scripts/wharton_sync.py copies them there).
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }

const svg = readFileSync(join(root, 'favicon.svg'), 'utf8')
const uri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
const render = async px => {
  const pg = await browser.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 })
  await pg.setContent(`<!doctype html><body style="margin:0;background:transparent"><img src="${uri}" width="${px}" height="${px}" style="display:block">`)
  await pg.evaluate(() => Promise.all([...document.images].map(i => i.decode())))
  const png = await pg.screenshot({ omitBackground: true, type: 'png' })
  await pg.close()
  return png
}
const sizes = [16, 32, 48]
const pngs = {}
for (const px of sizes) pngs[px] = await render(px)
await browser.close()

writeFileSync(join(root, 'favicon.png'), pngs[32])

// An .ico is a small directory of images; modern browsers read PNG-compressed entries.
const head = Buffer.alloc(6)
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4)
let offset = 6 + 16 * sizes.length
const dir = [], data = []
for (const px of sizes) {
  const e = Buffer.alloc(16)
  e.writeUInt8(px, 0); e.writeUInt8(px, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3)
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(pngs[px].length, 8); e.writeUInt32LE(offset, 12)
  dir.push(e); data.push(pngs[px]); offset += pngs[px].length
}
writeFileSync(join(root, 'favicon.ico'), Buffer.concat([head, ...dir, ...data]))
console.log('favicon.png 32x32 (%d bytes), favicon.ico %s (%d bytes)', pngs[32].length, sizes.join('/'), offset)
