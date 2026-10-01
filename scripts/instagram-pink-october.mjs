// Renders scripts/instagram-pink-october.html to three 1080x1350 PNGs in assets/social/.
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', 'assets', 'social')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] })
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } })
await page.goto('file://' + join(here, 'instagram-pink-october.html'))
await page.waitForLoadState('networkidle')
for (const [id, name] of [['s1', 'pink-october-1-photo'], ['s2', 'pink-october-2-offers'], ['s3', 'pink-october-3-event']]) {
  await page.locator('#' + id).screenshot({ path: join(out, name + '.png'), type: 'png' })
  console.log('wrote assets/social/' + name + '.png')
}
await browser.close()
