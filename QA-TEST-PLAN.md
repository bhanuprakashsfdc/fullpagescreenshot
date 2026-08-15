# QA Test Plan — Full Page Screenshot Extension

## Environment
- Chrome/Chromium: latest stable
- Extension build: `dist/`
- Load via `chrome://extensions` → Developer mode → Load unpacked

## Test Cases

### TC-1: Install & Basic Load
- Load unpacked extension from `dist/`
- Verify no manifest errors
- Verify icon appears in toolbar
- Verify popup opens without console errors

### TC-2: Capture Flow — Simple Page
- Open `about:blank` or a simple HTML page
- Click extension icon → Capture Page
- Verify progress bar updates (0% → 90%)
- Verify preview appears
- Verify no "stuck" state

### TC-3: Capture Flow — Long Page
- Open a long page (e.g., Wikipedia article)
- Capture and verify full page is stitched
- Verify no blank/gaps between sections

### TC-4: Capture via Context Menu
- Right-click on page → "Capture Full Page Screenshot"
- Verify capture initiates
- Verify preview appears in popup

### TC-5: Annotation Tools
- Draw with pen tool
- Draw rectangle
- Verify annotations appear on canvas
- Verify undo/redo works

### TC-6: Export
- Click Download → verify file saves with correct name
- Click Copy → paste in image editor, verify content

### TC-7: Edge Cases
- Try on `chrome://` URLs (should fail gracefully)
- Try on PDF viewer
- Try on pages with fixed/sticky headers

## Known Risks / Hypotheses
1. Content script `scrollCapture(0, ...)` uses tabId=0; `captureVisibleTab` may reject
2. `chrome.runtime.sendMessage` from content script reaches service worker only; popup may not receive progress updates unless service worker forwards
3. `createAnnotationCanvas` may save blank state if image hasn't loaded yet
