// Renders scripts/instagram-pink-october.html to assets/social/pink-october-instagram.png (1080x1350).
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
const here = dirname(fileURLToPath(import.meta.url))
mkdirSync(join(here, '..', 'assets', 'social'), { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } })
await page.goto('file://' + join(here, 'instagram-pink-october.html'))
await page.waitForLoadState('networkidle')
await page.screenshot({ path: join(here, '..', 'assets', 'social', 'pink-october-instagram.png'), type: 'png' })
await browser.close()
console.log('wrote assets/social/pink-october-instagram.png')
