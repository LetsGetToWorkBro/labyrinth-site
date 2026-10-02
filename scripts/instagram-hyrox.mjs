// Renders scripts/instagram-hyrox.html to assets/social/hyrox-instagram.png (1080x1350).
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] })
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } })
await page.goto('file://' + join(here, 'instagram-hyrox.html'))
await page.waitForLoadState('networkidle')
await page.screenshot({ path: join(here, '..', 'assets', 'social', 'hyrox-instagram.png') })
await browser.close()
console.log('wrote assets/social/hyrox-instagram.png')
