// Renders the six slides of scripts/instagram-stream.html to assets/social/stream-N-*.png (1080x1350).
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const names = ['cover', 'live', 'xp', 'badges', 'board', 'signin']
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } })
for (let i = 1; i <= names.length; i++) {
  await page.goto('file://' + join(here, 'instagram-stream.html') + '?slide=' + i)
  await page.waitForLoadState('networkidle')
  const out = join(here, '..', 'assets', 'social', `stream-${i}-${names[i - 1]}.png`)
  await page.screenshot({ path: out })
  console.log('wrote', out)
}
await browser.close()
