/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Central SVG Icon Registry  —  IntelliDocs AI
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HOW TO USE IN TEMPLATE:
 *   <app-icon name="send" size="16" />
 *   <app-icon name="file" size="20" label="Document" />
 *
 * HOW TO ADD A NEW ICON:
 *   1. Add a new key-value entry below (24×24 viewBox, inner SVG only).
 *   2. Use it in any template — TypeScript will pick it up automatically.
 *   3. No imports, no sprite file, no other changes needed.
 *
 * All icons use:  fill="none"  stroke="currentColor"  stroke-width="2"
 *                 stroke-linecap="round"  stroke-linejoin="round"
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const ICONS = {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FILES & DOCUMENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Generic document / file */
  'file': `
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>`,

  /** Document with a plus sign — create / upload new file */
  'file-plus': `
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
    <line x1="9"  y1="14" x2="15" y2="14"/>`,

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHEVRONS & ARROWS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** ∨ — dropdown, expand down */
  'chevron-down': `
    <polyline points="6 9 12 15 18 9"/>`,

  /** ‹ — go back, previous */
  'chevron-left': `
    <polyline points="15 18 9 12 15 6"/>`,

  /** › — go forward, next */
  'chevron-right': `
    <polyline points="9 18 15 12 9 6"/>`,

  /** «‹ — collapse sidebar / panel to the left */
  'chevron-left-double': `
    <polyline points="15 18 9 12 15 6"/>
    <polyline points="9  18 3 12  9  6"/>`,

  /** ›» — expand sidebar / panel to the right */
  'chevron-right-double': `
    <polyline points="9  18 15 12  9  6"/>
    <polyline points="15 18 21 12 15  6"/>`,

  /** › (single, smaller) — inline disclosure, settings row arrow */
  'chevron-right-single': `
    <path d="m9 18 6-6-6-6"/>`,

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTIONS — SEND / EDIT / COPY / REFRESH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Paper-plane — send message */
  'send': `
    <line    x1="22" y1="2"  x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>`,

  /** Two overlapping rectangles — copy to clipboard */
  'copy': `
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`,

  /** Circular arrow — refresh / regenerate */
  'refresh': `
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-4.16"/>`,

  /** Pencil — edit / new chat */
  'pencil': `
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>`,

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTIONS — UPLOAD / DOWNLOAD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Arrow pointing down into tray — download */
  'download': `
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>`,

  /** Cloud with arrow up — upload to cloud / drag-drop zone */
  'upload-cloud': `
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>`,

  /** Paperclip — attach file to message */
  'paperclip': `
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>`,

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTIONS — SYSTEM / MISC
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Door-with-arrow — log out */
  'logout': `
    <path d="M10 17l5-5-5-5"/>
    <path d="M15 12H3"/>
    <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>`,

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // UI CONTROLS — SEARCH / SETTINGS / NAVIGATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Magnifying glass — search input & history items */
  'search': `
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>`,

  /** ⊕ — add / new */
  'plus': `
    <line x1="12" y1="5"  x2="12" y2="19"/>
    <line x1="5"  y1="12" x2="19" y2="12"/>`,

  /** — — remove / zoom out */
  'minus': `
    <line x1="5" y1="12" x2="19" y2="12"/>`,

  /** Three vertical dots — overflow menu */
  'dots-vertical': `
    <circle cx="12" cy="5"  r="1" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>`,

  /** Cog / gear — settings menu */
  'gear': `
    <circle cx="12" cy="12" r="3"/>
    <path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"/>`,

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FEEDBACK & STATUS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Thin checkmark — small inline success indicator */
  'check': `
    <path d="m5 12 4 4L19 6"/>`,

  /** Bold checkmark — upload success banner */
  'check-fat': `
    <polyline points="20 6 9 17 4 12"/>`,

  /** Circle with exclamation — error / alert banner */
  'alert-circle': `
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8"  x2="12"    y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>`,

  /** Thumb pointing up — positive message reaction */
  'thumbs-up': `
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>`,

  /** Thumb pointing down — negative message reaction */
  'thumbs-down': `
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>`,

  /** Radial spokes — animated loading spinner (add CSS class="spin") */
  'spinner': `
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>`,

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMMUNICATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Bell — notifications button in header */
  'bell': `
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,

  /** Chat bubble — scheduled / chats sidebar item */
  'chat-bubble': `
    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8Z"/>`,

  /** Microphone — voice input button */
  'mic': `
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8"  y1="23" x2="16" y2="23"/>`,

  /** Globe — language selector button */
  'globe': `
    <circle cx="12" cy="12" r="10"/>
    <line   x1="2"  y1="12" x2="22" y2="12"/>
    <path   d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NAVIGATION & CONTENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Open book — library sidebar item */
  'book': `
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>
    <path d="M8 7h8M8 11h8"/>`,

  /** Clock face — personalization / history */
  'clock': `
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 2"/>`,

  /** Bullseye / target — help menu item */
  'target': `
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 3v3m0 12v3m9-9h-3M6 12H3"/>`,

  /** Two sparkle stars — upgrade plan / AI feature highlight */
  'sparkle': `
    <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/>
    <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>`,

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // USER / PROFILE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Person inside a circle — profile menu item */
  'person-circle': `
    <circle cx="12" cy="8"  r="3"/>
    <path   d="M5 20a7 7 0 0 1 14 0"/>
    <circle cx="12" cy="12" r="10"/>`,

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BRAND
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** IntelliDocs AI logo mark — sidebar logo + AI chat avatar */
  'ai-logo': `
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 12h8M12 8v8" stroke-linecap="round"/>`,

} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Type export — auto-derived from ICONS keys.
// Use this type on any input that accepts an icon name.
// ─────────────────────────────────────────────────────────────────────────────

/** Union of every valid icon key.  e.g.  "file" | "send" | "mic" | … */
export type IconName = keyof typeof ICONS;
