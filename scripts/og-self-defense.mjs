// Renders scripts/og-self-defense.html to assets/og-self-defense.jpg (1200x630).
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.goto('file://' + join(here, 'og-self-defense.html'))
await page.waitForLoadState('networkidle')
await page.screenshot({ path: join(here, '..', 'assets', 'og-self-defense.jpg'), type: 'jpeg', quality: 88 })
await browser.close()
console.log('wrote assets/og-self-defense.jpg')
