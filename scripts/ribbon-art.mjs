// The folded awareness ribbon as an SVG string, shared by the t-shirt art and the seminar ads.
/**
 * The awareness ribbon, drawn as a real folded ribbon rather than a line icon: two strands of one width that
 * cross at the waist (the right-hand strand passes over, with a thin gap cut out of the one underneath), a
 * round loop at the top, and tails cut with a swallowtail notch. One colour, so it prints as one screen.
 * viewBox 0 0 200 300. With `emblem`, the Labyrinth maze sits inside the loop (the page script fills <img class="emblem">).
 */
export function ribbonSVG(color, { emblem = false, uid = 'r' } = {}) {
  const W = 30                                    // ribbon width
  const GAP = 5                                   // the cut-out around the strand that passes over
  const segs = [[[42, 286], [62, 248], [84, 206], [100, 176]], [[100, 176], [124, 134], [152, 120], [152, 84]], [[152, 84], [152, 44], [128, 22], [100, 22]]]
  const R = 'M 42 286 C 62 248 84 206 100 176 C 124 134 152 120 152 84 C 152 44 128 22 100 22'
  const L = 'M 158 286 C 138 248 116 206 100 176 C 76 134 48 120 48 84 C 48 44 72 22 100 22'
  // Everything below is vector clipping (not SVG masks, which the browser rasterises at screen size and softens at print size).
  const big = 'M -20 -20 H 220 V 320 H -20 Z'
  const bez = ([p0, p1, p2, p3], t) => {
    const u = 1 - t
    const pt = [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k])
    const d = [0, 1].map(k => 3 * u * u * (p1[k] - p0[k]) + 6 * u * t * (p2[k] - p1[k]) + 3 * t * t * (p3[k] - p2[k]))
    const m = Math.hypot(d[0], d[1])
    return { pt, n: [-d[1] / m, d[0] / m] }
  }
  // swallowtail notch at each tail end: a polygon biting into the end of the strand, overshooting the end so no sliver is left
  const notch = (ex, ey, dx, dy) => {
    const m = Math.hypot(dx, dy), ux = dx / m, uy = dy / m, nx = -uy, ny = ux, hw = W / 2 + 3, back = 8
    const P = [[ex + nx * hw - ux * back, ey + ny * hw - uy * back], [ex + nx * hw, ey + ny * hw], [ex + ux * W * 0.95, ey + uy * W * 0.95], [ex - nx * hw, ey - ny * hw], [ex - nx * hw - ux * back, ey - ny * hw - uy * back]]
    return 'M ' + P.map(q => q.map(v => v.toFixed(2)).join(' ')).join(' L ') + ' Z'
  }
  const notches = notch(42, 286, 20, -38) + ' ' + notch(158, 286, -20, -38)
  // the band around the over-strand, near the crossing, expanded by GAP: cut out of the under-strand
  const left = [], right = []
  for (const sg of segs.slice(0, 2)) for (let k = 0; k <= 60; k++) {
    const { pt, n } = bez(sg, k / 60)
    if (Math.hypot(pt[0] - 100, pt[1] - 176) > 46) continue
    const h = W / 2 + GAP
    left.push([pt[0] + n[0] * h, pt[1] + n[1] * h]); right.push([pt[0] - n[0] * h, pt[1] - n[1] * h])
  }
  const band = 'M ' + left.concat(right.reverse()).map(q => q.map(v => v.toFixed(2)).join(' ')).join(' L ') + ' Z'
  const img = emblem ? '<image class="emblem-slot" x="68" y="48" width="64" height="64"/>' : ''
  return `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${color}">
  <defs>
    <clipPath id="${uid}r" clip-rule="evenodd"><path clip-rule="evenodd" d="${big} ${notches}"/></clipPath>
    <clipPath id="${uid}l" clip-rule="evenodd"><path clip-rule="evenodd" d="${big} ${notches} ${band}"/></clipPath>
  </defs>
  <g stroke-width="${W}" stroke-linecap="butt" stroke-linejoin="round">
    <path d="${L}" clip-path="url(#${uid}l)"/>
    <path d="${R}" clip-path="url(#${uid}r)"/>
    <path d="M 93 22 H 107"/>
  </g>${img}
</svg>`
}
