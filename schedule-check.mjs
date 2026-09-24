/**
 * Does this website still agree with the CRM about the timetable?
 *
 * The week used to be written into index.html by hand four times (a desktop
 * table hidden with display:none, the day cards, the Gi/No-Gi drawers) plus
 * ADULT_CLASSES in booking.js. It is now generated from
 * scripts/schedule_data.py into a single component on the front page and on
 * /schedule, so this reads that component: every class is a button carrying
 * data-day and data-time.
 *
 * Supabase is the source of truth. This compares what is published here
 * against what the academy's own system says, and names every difference.
 *
 *   node schedule-check.mjs
 *
 * Exits non-zero on drift, so it can gate a deploy, but it is deliberately NOT
 * wired into the Cloudflare build by default. A failing check should tell
 * somebody to update the page, not stop the site from deploying at all.
 *
 * It compares CLASSES, counted per day and start time, not just distinct start
 * times. The old check saw Tuesday's two 5:15 PM classes as one slot, so
 * removing one of a pair passed; a count per slot catches that. It does not
 * compare names: the CRM says "Kids Grappling Adv (No-Gi)" where the site says
 * "Kids Grappling", and a name match would be a list of false alarms.
 */

const ENDPOINT = 'https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/public-schedule'
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8')
// The class tables moved to booking.js when the blog started using the
// booking modal too. This reads them wherever they are.
const appjs = readFileSync(new URL('./booking.js', import.meta.url), 'utf8')

let res
try {
  res = await fetch(ENDPOINT)
} catch (err) {
  console.log('Could not reach the CRM schedule endpoint:', err.message)
  console.log('Nothing checked. This is not a failure of the site.')
  process.exit(2)
}
const { classes } = await res.json()
if (!classes?.length) {
  console.log('The CRM returned no classes. Nothing to compare against.')
  process.exit(2)
}

/** "Day H:MM AM" -> how many classes start then, from the CRM. */
const crm = new Map()
for (const c of classes) {
  const k = `${c.dayName} ${c.startLabel}`
  crm.set(k, (crm.get(k) ?? 0) + 1)
}

/** The same, from the schedule component on the front page. */
const site = new Map()
const cardRe = /<button type="button" class="sc__class[^"]*"[^>]*\bdata-day="(\w+)" data-time="([^"]+)"/g
for (const m of html.matchAll(cardRe)) {
  const k = `${m[1]} ${m[2]}`
  site.set(k, (site.get(k) ?? 0) + 1)
}
if (site.size === 0) {
  console.log('Found no schedule component in index.html. Has the SCHEDULE block been removed?')
  process.exit(1)
}

let problems = 0
const report = (msg) => { console.log('  ' + msg); problems++ }

console.log('Comparing labyrinth.vision against the CRM\n')
for (const day of DAYS) {
  const keys = new Set([...crm.keys(), ...site.keys()].filter(k => k.startsWith(day + ' ')))
  const diffs = []
  let n = 0
  for (const k of [...keys].sort()) {
    const a = crm.get(k) ?? 0, b = site.get(k) ?? 0
    n += a
    if (a !== b) diffs.push(`${k.slice(day.length + 1)}: ${a} in the CRM, ${b} on the site`)
  }
  if (!diffs.length) console.log(`  ${day}  ok  (${n} classes)`)
  else {
    console.log(`  ${day}  DRIFT`)
    for (const d of diffs) report(`    ${d}`)
  }
}

// The booking popup is the one that actually costs somebody a class, because a
// visitor books a time that does not exist and turns up to a closed room.
console.log('\nBooking popup (booking.js):')
const popup = new Set(
  [...appjs.matchAll(/\{name:'[^']+', type:'[^']*', day:'(\w+)', time:'([^']+)'\}/g)]
    .map(m => `${m[1]} ${m[2]}`))
const crmPairs = new Set(classes.map(c => `${c.dayName} ${c.startLabel}`))
const bogus = [...popup].filter(p => !crmPairs.has(p))
if (bogus.length) report(`bookable times that are not in the CRM: ${bogus.join(', ')}`)
else console.log('  every bookable time exists in the CRM')

// Every day has its column, and every class sits inside its own day's column.
// The day cards this replaced once had a class land outside its container and
// render above its own heading; a class under the wrong day is the same fault.
console.log('\nSchedule component structure:')
for (const day of DAYS) {
  const open = html.indexOf(`data-sc-col="${day}"`)
  if (open < 0) { report(`${day}: no column`); continue }
  const close = html.indexOf('</section>', open)
  const col = html.slice(open, close)
  const wrong = [...col.matchAll(/data-day="(\w+)"/g)].filter(m => m[1] !== day)
  if (wrong.length) report(`${day}: ${wrong.length} class(es) filed under the wrong day`)
  else console.log(`  ${day} ok`)
}

console.log(problems ? `\n${problems} problem(s): update the page, or the CRM, whichever is wrong.`
                     : '\nThe site and the CRM agree.')
process.exit(problems ? 1 : 0)
