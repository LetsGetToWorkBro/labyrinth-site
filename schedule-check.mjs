/**
 * Does this website still agree with the CRM about the timetable?
 *
 * The schedule is written into this site in four places, the desktop table,
 * the mobile day cards, the Gi/No-Gi drawers on the programme cards, and
 * ADULT_CLASSES in booking.js, which is what the booking popup offers. Keeping four
 * copies in step by hand is how a class ends up advertised on the website months
 * after it stopped running.
 *
 * Supabase is now the source of truth. This compares what is published here
 * against what the academy's own system says, and names every difference.
 *
 *   node schedule-check.mjs
 *
 * Exits non-zero on drift, so it can gate a deploy, but it is deliberately NOT
 * wired into the Cloudflare build by default. A failing check should tell
 * somebody to update the page, not stop the site from deploying at all.
 *
 * WHAT IT DOES NOT CATCH, stated plainly so nobody trusts it further than it
 * deserves: it compares distinct START TIMES per day, not individual classes.
 * Tuesday runs two classes at 5:15 PM (kids and teens) and this sees one
 * slot. So removing one of a pair sharing a time would pass. It catches a
 * whole slot appearing or vanishing, which is the failure that actually sends
 * somebody to a closed room; it is not a full reconciliation.
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

/** day -> Set of "H:MM AM" times, from the CRM. */
const crm = {}
for (const c of classes) (crm[c.dayName] ??= new Set()).add(c.startLabel)

/** A cell with no class in it holds nothing but a dash. It has to be the whole
 *  cell: a real class carries a dash inside its age range ("Kids BJJ (3-6)"),
 *  and a loose match swallows every one of them. */
const EMPTY_CELL = /^(?:&ndash;|[-–])?$/

/** day -> Set of times, as published in the desktop table. */
const table = {}
const rowRe = /<!-- (\d{1,2}:\d{2} [AP]M) -->\s*<tr[^>]*>([\s\S]*?)<\/tr>/g
for (const m of html.matchAll(rowRe)) {
  const cells = [...m[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x => x[1]).slice(1)
  cells.forEach((cell, i) => {
    if (!EMPTY_CELL.test(cell.replace(/<[^>]+>/g, '').trim())) (table[DAYS[i + 1] ?? 'Sun'] ??= new Set()).add(m[1])
  })
}
// The table's columns run Mon..Sun, so the index maths above lands Sunday last.
if (table['Sun'] === undefined) table['Sun'] = new Set()

let problems = 0
const report = (msg) => { console.log('  ' + msg); problems++ }

console.log('Comparing labyrinth.vision against the CRM\n')
for (const day of DAYS) {
  const a = crm[day] ?? new Set()
  const b = table[day] ?? new Set()
  const missing = [...a].filter(t => !b.has(t))
  const extra = [...b].filter(t => !a.has(t))
  if (!missing.length && !extra.length) {
    console.log(`  ${day}  ok  (${a.size} classes)`)
  } else {
    console.log(`  ${day}  DRIFT`)
    if (missing.length) report(`    in the CRM but not on the site: ${missing.join(', ')}`)
    if (extra.length) report(`    on the site but not in the CRM: ${extra.join(', ')}`)
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

// Every class entry must sit inside its day's container AND under a category
// label. Two did not: my insertion anchored on `<div class="schedule-day__class`
// which also matches the container `schedule-day__classes`, so the entry landed
// outside it and rendered above its own heading with no category at all.
console.log('\nDay card structure:')
for (const day of ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) {
  const st = html.indexOf(`schedule-day__header">${day}<`)
  if (st < 0) { report(`${day}: no day card`); continue }
  const ends = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    .map(d => html.indexOf(`schedule-day__header">${d}<`)).filter(x => x > st)
  const blk = html.slice(st, ends.length ? Math.min(...ends) : st + 4000)
  const container = blk.indexOf('schedule-day__classes')
  const orphan = [...blk.matchAll(/<div class="schedule-day__class /g)].filter(m => m.index < container)
  const empty = blk.match(/<div class="schedule-day__class[^"]*"[^>]*>\s*<\/div>/g) || []
  if (orphan.length) report(`${day}: ${orphan.length} class outside the container (renders with no category)`)
  else if (empty.length) report(`${day}: ${empty.length} empty class div`)
  else console.log(`  ${day} ok`)
}

console.log(problems ? `\n${problems} problem(s): update the page, or the CRM, whichever is wrong.`
                     : '\nThe site and the CRM agree.')
process.exit(problems ? 1 : 0)
