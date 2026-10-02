// Renders scripts/seminar-facebook-cover.html to assets/social/seminar-facebook-cover.jpg (1920x1005),
// the cover for the Rolling for Ribbons Facebook event.
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1005 } })
await page.goto('file://' + join(here, 'seminar-facebook-cover.html'))
await page.waitForLoadState('networkidle')
await page.screenshot({ path: join(here, '..', 'assets', 'social', 'seminar-facebook-cover.jpg'), type: 'jpeg', quality: 88 })
await browser.close()
console.log('wrote assets/social/seminar-facebook-cover.jpg')
