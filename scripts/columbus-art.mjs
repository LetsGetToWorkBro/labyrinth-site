// The art the Columbus Day pieces share: the colours, a compass rose, a caravel under sail and a star.
// Used by scripts/post-columbus-day-mat.mjs (the Facebook, Instagram and story pictures) and scripts/email-columbus-day-banner.mjs (the email banner),
// so the post and the email are the same picture's family.
export const NAVY = '#0A1530', NAVY_LIT = '#17306A', GOLD = '#C8A24C', CREAM = '#F4F1E8', RED = '#C8283A', MUTED = '#B4BCD0'

// A compass rose: rings and ticks, an eight-point star, and the N. Drawn in the colour it is given, so it can sit faint behind the words or solid on top.
export function compass(ring, star, sw) {
  const ticks = [...Array(24)].map((_, i) => {
    const a = i * 15 * Math.PI / 180, r1 = i % 6 === 0 ? 82 : 89, r2 = 97
    return `<line x1="${(r1 * Math.sin(a)).toFixed(1)}" y1="${(-r1 * Math.cos(a)).toFixed(1)}" x2="${(r2 * Math.sin(a)).toFixed(1)}" y2="${(-r2 * Math.cos(a)).toFixed(1)}"/>`
  }).join('')
  const pt = (len, w, rot) => `<polygon transform="rotate(${rot})" points="0,${-len} ${w},${-w} 0,0 ${-w},${-w}"/>`
  return `<svg viewBox="-104 -112 208 216" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="${ring}" stroke-width="${sw}" stroke-linecap="round"><circle r="97"/><circle r="78"/><circle r="50"/>${ticks}</g>
    <g fill="${star}">${[45, 135, 225, 315].map(r => pt(62, 7, r)).join('')}${[0, 90, 180, 270].map(r => pt(93, 11, r)).join('')}<circle r="5"/></g>
  </svg>`
}

// A caravel under sail: gold hull and rigging, cream sails, red pennants, and the sea under it.
export function ship() {
  const wave = 'M-10,214 ' + 'q 12.5,-13 25,0 '.repeat(1) + 't 25,0 '.repeat(12)
  const reef = (x1, x2, y) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`
  return `<svg viewBox="-14 0 318 232" xmlns="http://www.w3.org/2000/svg">
    <path d="${wave}" fill="none" stroke="${CREAM}" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>
    <path d="M18,150 L286,150 L270,192 Q152,216 58,194 Z" fill="${GOLD}"/>
    <path d="M236,116 L288,116 L286,150 L236,150 Z" fill="${GOLD}"/>
    <path d="M18,133 L58,133 L58,150 L18,150 Z" fill="${GOLD}"/>
    <path d="M60,176 Q152,198 262,174" fill="none" stroke="${NAVY}" stroke-opacity=".35" stroke-width="3"/>
    <g stroke="${GOLD}" stroke-width="5" stroke-linecap="round"><line x1="70" y1="150" x2="70" y2="40"/><line x1="156" y1="150" x2="156" y2="12"/><line x1="244" y1="116" x2="244" y2="62"/><line x1="22" y1="138" x2="-8" y2="112"/></g>
    <g stroke="${GOLD}" stroke-width="4" stroke-linecap="round"><line x1="36" y1="56" x2="104" y2="56"/><line x1="112" y1="26" x2="200" y2="26"/></g>
    <path d="M40,58 Q70,68 100,58 L102,112 Q70,126 38,112 Z" fill="${CREAM}"/>
    <path d="M116,28 Q156,40 196,28 L204,106 Q156,124 108,106 Z" fill="${CREAM}"/>
    <path d="M244,64 L290,114 L208,114 Z" fill="${CREAM}"/>
    <g stroke="${NAVY}" stroke-opacity=".22" stroke-width="2">${reef(42, 100, 78)}${reef(40, 102, 96)}${reef(118, 194, 54)}${reef(114, 198, 76)}${reef(110, 202, 94)}</g>
    <path d="M156,12 L194,21 L156,30 Z" fill="${RED}"/><path d="M70,40 L98,47 L70,54 Z" fill="${RED}"/><path d="M244,62 L272,69 L244,76 Z" fill="${RED}"/>
  </svg>`
}

// A five-point star, for the canton on the stripes at the foot of the picture.
export const star = (cx, cy, R) => `<polygon fill="${CREAM}" points="${[...Array(10)].map((_, i) => { const a = i * Math.PI / 5, r = i % 2 ? R * 0.382 : R; return `${(cx + r * Math.sin(a)).toFixed(1)},${(cy - r * Math.cos(a)).toFixed(1)}` }).join(' ')}"/>`
