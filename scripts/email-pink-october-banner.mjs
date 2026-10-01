// Renders scripts/email-pink-october-banner.html to assets/social/pink-october-email-banner.jpg (1200x630).
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.goto('file://' + join(here, 'email-pink-october-banner.html'))
await page.waitForLoadState('networkidle')
await page.screenshot({ path: join(here, '..', 'assets', 'social', 'pink-october-email-banner.jpg'), type: 'jpeg', quality: 86 })
await browser.close()
console.log('wrote assets/social/pink-october-email-banner.jpg')
