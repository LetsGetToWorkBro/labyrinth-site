// Renders scripts/ad-pink-october-50.html to assets/social/pink-october-ad-feed.png and -story.png.
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', 'assets', 'social')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] })
const page = await browser.newPage({ viewport: { width: 1080, height: 3400 } })
await page.goto('file://' + join(here, 'ad-pink-october-50.html'))
await page.waitForLoadState('networkidle')
for (const [id, name] of [['feed', 'pink-october-ad-feed'], ['story', 'pink-october-ad-story']]) {
  await page.locator('#' + id).screenshot({ path: join(out, name + '.png'), type: 'png' })
  console.log('wrote assets/social/' + name + '.png')
}
await browser.close()
