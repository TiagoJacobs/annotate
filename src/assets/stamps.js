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
  // --- Annotation stamps ---
  counter: {
    name: 'Counter (auto-increment)',
    category: 'annotation',
    svg: generateCounterSvg('N'),
    defaultWidth: 32,
    defaultHeight: 32,
  },
  cursor: {
    name: 'Mouse Cursor',
    category: 'annotation',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M2 2 L2 28 L9 21 L16 32 L20 30 L13 19 L22 19 Z" fill="#000" stroke="#fff" stroke-width="1.5"/>
    </svg>`,
    defaultWidth: 24,
    defaultHeight: 36,
  },
  hand: {
    name: 'Hand Pointer',
    category: 'annotation',
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
    category: 'annotation',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
      <circle cx="20" cy="20" r="8" fill="none" stroke="#FF4444" stroke-width="3"/>
      <circle cx="20" cy="20" r="16" fill="none" stroke="#FF4444" stroke-width="2" stroke-dasharray="4 3"/>
      <circle cx="20" cy="20" r="3" fill="#FF4444"/>
    </svg>`,
    defaultWidth: 40,
    defaultHeight: 40,
  },

  // --- Diagram symbols ---
  process: {
    name: 'Process',
    category: 'diagram',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" width="120" height="60">
      <rect x="2" y="2" width="116" height="56" rx="4" ry="4" fill="#E3F2FD" stroke="#1976D2" stroke-width="2"/>
    </svg>`,
    defaultWidth: 120,
    defaultHeight: 60,
  },
  decision: {
    name: 'Decision',
    category: 'diagram',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="100" height="80">
      <polygon points="50,2 98,40 50,78 2,40" fill="#FFF3E0" stroke="#E65100" stroke-width="2"/>
    </svg>`,
    defaultWidth: 100,
    defaultHeight: 80,
  },
  terminal: {
    name: 'Start / End',
    category: 'diagram',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 50" width="120" height="50">
      <rect x="2" y="2" width="116" height="46" rx="23" ry="23" fill="#E8F5E9" stroke="#2E7D32" stroke-width="2"/>
    </svg>`,
    defaultWidth: 120,
    defaultHeight: 50,
  },
  data: {
    name: 'Data (I/O)',
    category: 'diagram',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" width="120" height="60">
      <polygon points="20,2 118,2 100,58 2,58" fill="#F3E5F5" stroke="#7B1FA2" stroke-width="2"/>
    </svg>`,
    defaultWidth: 120,
    defaultHeight: 60,
  },
  database: {
    name: 'Database',
    category: 'diagram',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" width="80" height="100">
      <path d="M2,15 C2,7 18,2 40,2 C62,2 78,7 78,15 L78,85 C78,93 62,98 40,98 C18,98 2,93 2,85 Z" fill="#E0F7FA" stroke="#00838F" stroke-width="2"/>
      <ellipse cx="40" cy="15" rx="38" ry="13" fill="#E0F7FA" stroke="#00838F" stroke-width="2"/>
    </svg>`,
    defaultWidth: 80,
    defaultHeight: 100,
  },
  document: {
    name: 'Document',
    category: 'diagram',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="100" height="80">
      <path d="M2,2 L98,2 L98,65 C80,55 60,75 40,65 C20,55 10,70 2,65 Z" fill="#FFF8E1" stroke="#F57F17" stroke-width="2"/>
    </svg>`,
    defaultWidth: 100,
    defaultHeight: 80,
  },
  cloud: {
    name: 'Cloud',
    category: 'diagram',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" width="120" height="80">
      <path d="M30,65 C10,65 2,55 2,45 C2,35 10,27 20,25 C18,15 28,5 42,5 C52,5 60,10 63,18 C68,12 78,10 88,15 C98,20 102,30 98,40 C108,42 118,50 115,60 C112,68 102,72 92,68 C85,75 70,75 60,68 C50,75 40,72 30,65 Z" fill="#ECEFF1" stroke="#546E7A" stroke-width="2"/>
    </svg>`,
    defaultWidth: 120,
    defaultHeight: 80,
  },
  predefined: {
    name: 'Predefined Process',
    category: 'diagram',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" width="120" height="60">
      <rect x="2" y="2" width="116" height="56" fill="#E8EAF6" stroke="#283593" stroke-width="2"/>
      <line x1="14" y1="2" x2="14" y2="58" stroke="#283593" stroke-width="1.5"/>
      <line x1="106" y1="2" x2="106" y2="58" stroke="#283593" stroke-width="1.5"/>
    </svg>`,
    defaultWidth: 120,
    defaultHeight: 60,
  },
}

export const STAMP_IDS = Object.keys(STAMPS)

export const STAMP_CATEGORIES = {
  annotation: { label: 'Annotation', ids: [] },
  diagram: { label: 'Diagram', ids: [] },
}

// Populate category arrays
for (const [id, stamp] of Object.entries(STAMPS)) {
  const cat = stamp.category || 'annotation'
  if (STAMP_CATEGORIES[cat]) {
    STAMP_CATEGORIES[cat].ids.push(id)
  }
}
