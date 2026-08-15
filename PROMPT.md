# Full Page Screenshot Chrome Extension Generator Prompt

You are a senior Chrome extension architect with 20 years of combined experience in browser technologies, JavaScript/TypeScript engineering, and Manifest V3 extension development. You have shipped dozens of high-rated extensions to the Chrome Web Store and understand every nuance of cross-browser compatibility, performance optimization, security hardening, and user experience design.

## Project Context

Build a **Full Page Screenshot** Chrome extension for `/Users/bhanu/Bhanu/websites/fullpagescreenshot`.

**Core principle:** No login. No signup. No accounts. No tracking. Install → Use → Done. The extension must be completely frictionless and privacy-respecting.

---

## Functional Requirements

1. **Full Page Capture**
   - Capture the entire scrollable page in a single image
   - Support PNG, JPEG, and WebP output formats
   - Automatically stitch visible viewport + off-screen content using `chrome.tabs.captureVisibleTab` combined with programmatic scrolling and canvas compositing

2. **Capture Triggers**
   - Browser action (toolbar icon) click → capture current tab
   - Context menu option: "Capture Full Page Screenshot"
   - Optional keyboard shortcut (user-configurable via `commands` API)

3. **Preview & Edit**
   - Popup window showing captured image preview
   - Basic editing: crop, annotate (text, arrows, rectangles, blur/highlight sensitive areas)
   - Undo/redo for annotations

4. **Export & Share**
   - Download to local filesystem with custom filename
   - Copy to clipboard
   - Direct share to Google Drive / Dropbox (OAuth-less via share links or user-selectable local export only — avoid mandatory auth)

5. **Settings (all local, no cloud sync)**
   - Output format (PNG/JPEG/WebP)
   - JPEG quality slider (1-100)
   - Filename template (e.g., `screenshot-{date}-{title}`)
   - Auto-scroll delay adjustment
   - Dark/light popup theme
   - All settings stored in `chrome.storage.local`

---

## Technical Constraints & Best Practices

### Manifest V3 (Strict Compliance)
- Use `manifest_version: 3`
- Service Worker for background script (no persistent background pages)
- Declare **only** the permissions actually needed:
  - `activeTab` (for capturing the current tab when user invokes)
  - `scripting` (for injecting content scripts to capture full page)
  - `contextMenus` (for right-click menu)
  - `downloads` (for saving files)
  - `storage` (for local settings)
  - `commands` (for keyboard shortcuts)
- Use `host_permissions` only when absolutely necessary; prefer `activeTab` grant model
- No `externally_connectable` unless explicitly required
- Define `web_accessible_resources` minimally and explicitly

### Security
- Content Security Policy (CSP) with strict directives; no `unsafe-eval`, no `unsafe-inline` for scripts
- Sanitize all user inputs in annotations and filenames
- Secure message passing between popup, background (service worker), and content scripts using typed message handlers
- Never log or transmit user data externally

### Architecture
```
src/
├── manifest.json
├── background/
│   └── service-worker.ts
├── popup/
│   ├── popup.html
│   ├── popup.ts
│   └── popup.css
├── content/
│   └── capture.ts
├── shared/
│   ├── types.ts
│   ├── messaging.ts
│   └── storage.ts
├── utils/
│   ├── scroll-capture.ts
│   ├── stitch.ts
│   ├── annotate.ts
│   └── export.ts
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Code Quality
- TypeScript with strict mode enabled
- Functional programming patterns; avoid classes where closures suffice
- Descriptive variable names (`isCapturing`, `hasPermission`, `captureProgress`)
- Comprehensive error handling with try/catch and user-friendly fallback messages
- JSDoc comments on all public functions
- Modular, testable units with clear separation of concerns

### Performance
- Lazy-load annotation tools in popup
- Debounce scroll events during capture
- Use OffscreenCanvas if available; fallback to in-memory canvas
- Clean up content script injections after capture completes
- Stream large captures to canvas in chunks to prevent memory spikes

### User Experience
- Material Design-inspired popup with responsive layout
- Clear loading states and progress indicators during capture
- Keyboard-accessible popup (Tab navigation, Enter to confirm, Escape to close)
- ARIA labels on all interactive elements
- Smooth animations (respect `prefers-reduced-motion`)
- Toast notifications for success/error states
- Zero-configuration experience: works immediately after install

---

## Deliverables

Generate the complete, production-ready extension source code including:

1. `manifest.json` — fully compliant MV3 manifest
2. Background service worker with message routing and context menu setup
3. Content script for full-page capture with lazy image/video handling
4. Popup UI with preview, annotation toolbar, and export controls
5. Shared types and messaging utilities
6. Canvas stitching algorithm for seamless full-page composition
7. Annotation engine (pen, text, arrow, rectangle, blur)
8. Export utilities (download, clipboard copy)
9. Local storage schema and migration strategy
10. `_locales/en/messages.json` for i18n structure (English only is acceptable, but scaffold the structure)

---

## Validation Checklist

Before finalizing, ensure:
- [ ] Extension loads without errors in `chrome://extensions` developer mode
- [ ] No permission warnings in console during normal operation
- [ ] Full-page capture works on: plain HTML, SPAs (React/Vue/Angular), lazy-loaded content, fixed/sticky headers
- [ ] Annotations render crisply at original capture resolution
- [ ] Downloaded files match expected format and quality settings
- [ ] Popup is responsive from 250px to 600px width
- [ ] All interactive elements have focus states and ARIA labels
- [ ] Zero network requests to external servers (fully offline after install)

---

## Tone & Output Format

- Output clean, copy-paste-ready code files
- Use TypeScript for all logic files
- Use modern CSS (flexbox/grid, custom properties) in popup styles
- Provide a brief `README.md` with install instructions and feature overview
- Do not include any analytics, telemetry, or external CDN dependencies
