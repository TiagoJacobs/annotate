/**
 * Stamp assets - SVG strings and metadata for the stamp tool
 */

export function generateCounterSvg(n) {
  const fontSize = n >= 100 ? 12 : n >= 10 ? 16 : 20
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <circle cx="16" cy="16" r="15" fill="#FF4444" stroke="#CC0000" stroke-width="1"/>
    <text x="16" y="${fontSize >= 20 ? 22 : 21}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#fff">${n}</text>
  </svg>`
}

export const STAMPS = {
  counter: {
    name: 'Counter (auto-increment)',
    svg: generateCounterSvg('N'),
    defaultWidth: 32,
    defaultHeight: 32,
  },
  cursor: {
    name: 'Mouse Cursor',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M2 2 L2 28 L9 21 L16 32 L20 30 L13 19 L22 19 Z" fill="#000" stroke="#fff" stroke-width="1.5"/>
    </svg>`,
    defaultWidth: 24,
    defaultHeight: 36,
  },
  hand: {
    name: 'Hand Pointer',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 36" width="28" height="36">
      <path d="M14 2 C12 2 10 4 10 6 L10 16 C8 15 6 15 5 16 C3 18 4 20 5 22 L9 28 C11 32 14 34 18 34 C22 34 25 31 25 27 L25 12 C25 10 23 8 21 8 C21 8 21 9 21 10 L21 8 C21 6 19 4 17 4 C17 4 17 5 17 6 L17 5 C17 3 15 2 14 2 Z" fill="#FFC107" stroke="#000" stroke-width="1"/>
      <line x1="14" y1="6" x2="14" y2="16" stroke="#000" stroke-width="0.5"/>
      <line x1="17" y1="6" x2="17" y2="16" stroke="#000" stroke-width="0.5"/>
      <line x1="21" y1="10" x2="21" y2="16" stroke="#000" stroke-width="0.5"/>
    </svg>`,
    defaultWidth: 28,
    defaultHeight: 36,
  },
  click: {
    name: 'Click Indicator',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
      <circle cx="20" cy="20" r="8" fill="none" stroke="#FF4444" stroke-width="3"/>
      <circle cx="20" cy="20" r="16" fill="none" stroke="#FF4444" stroke-width="2" stroke-dasharray="4 3"/>
      <circle cx="20" cy="20" r="3" fill="#FF4444"/>
    </svg>`,
    defaultWidth: 40,
    defaultHeight: 40,
  },
}

export const STAMP_IDS = Object.keys(STAMPS)
