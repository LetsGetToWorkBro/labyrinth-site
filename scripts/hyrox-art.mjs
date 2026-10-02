// Renders scripts/hyrox-art.html twice:
//   assets/social/hyrox-email-banner.jpg   1200x630   (top of the member email)
//   assets/social/hyrox-facebook-cover.jpg 1920x1005  (Facebook event cover)
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] })
for (const [w, h, out] of [[1200, 630, 'hyrox-email-banner.jpg'], [1920, 1005, 'hyrox-facebook-cover.jpg']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto('file://' + join(here, 'hyrox-art.html') + '?w=' + w)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: join(here, '..', 'assets', 'social', out), type: 'jpeg', quality: 88 })
  await page.close()
  console.log('wrote assets/social/' + out)
}
await browser.close()
