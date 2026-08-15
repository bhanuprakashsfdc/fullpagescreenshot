# QA Test Report — Full Page Screenshot Extension

**Date:** 2026-08-15  
**Build:** `dist/` (post-fix)  
**Tester:** QA  
**Status:** Passed with findings — ready for manual verification after fixes

---

## Summary

The extension builds successfully and the manifest is valid. Static analysis and code review identified **3 critical bugs** and **2 medium-severity limitations** that explain the "stuck on injecting capture script" behavior reported earlier. All critical bugs have been fixed in the current build.

---

## Bugs Found & Fixed

### BUG-1: Capture progress never reaches popup (CRITICAL)
**Root Cause:** The content script sent progress updates via `chrome.runtime.sendMessage`, which in Manifest V3 delivers messages **only to the service worker (background)**, not to extension views like the popup. The service worker had no `chrome.runtime.onMessage` listener, so progress messages were silently dropped. The popup was waiting on a single `chrome.tabs.sendMessage` response that would only arrive when capture finished, making it appear "stuck."

**Fix Applied:**
- Added `chrome.runtime.onMessage` listener in `src/background/service-worker.ts`
- Service worker now rebroadcasts `capture-progress` messages to all extension views
- Popup listens via `chrome.runtime.onMessage.addListener` for progress
- Added `activeTabId` tracking in popup to filter progress for the correct tab

**Files Changed:**
- `src/background/service-worker.ts`
- `src/popup/popup.ts`

**Verification:**
```bash
npm run lint && npm run build
# Check built files:
grep -n "runtime.onMessage" dist/background/service-worker.js
grep -n "capture-progress" dist/popup/popup.js
```

---

### BUG-2: `captureVisibleTab` called with invalid parameter (CRITICAL)
**Root Cause:** `src/utils/scroll-capture.ts` accepted a parameter named `tabId` and passed it directly to `chrome.tabs.captureVisibleTab(tabId, ...)`. However, the Chrome API expects a **windowId**, not a tabId. Additionally, the content script cannot access `chrome.windows.WINDOW_ID_CURRENT` — that constant is undefined in content script context on both macOS and Windows. The original fix attempt using `chrome.windows.WINDOW_ID_CURRENT` would fail with `undefined` on all platforms.

**Fix Applied:**
- Added `windowId` to `ScreenshotSettings` type
- Popup now reads `tab.windowId` from `chrome.tabs.query` and includes it in the `start-capture` message
- Background service worker also passes `tab.windowId` for context menu and keyboard shortcut triggers
- Content script uses `settings.windowId` directly instead of relying on unavailable `chrome.windows` API

**Files Changed:**
- `src/shared/types.ts`
- `src/shared/storage.ts`
- `src/popup/popup.ts`
- `src/background/service-worker.ts`
- `src/content/capture.ts`
- `src/utils/scroll-capture.ts`

**Verification:**
```bash
grep -n "captureVisibleTab" dist/content/capture.js dist/utils/scroll-capture.js
# Should show: chrome.tabs.captureVisibleTab(windowId, { format: "png" })
```

---

### BUG-3: Annotation canvas race condition (MEDIUM)
**Root Cause:** `createAnnotationCanvas` loaded the base screenshot image asynchronously but immediately saved the canvas state to history before the image had rendered. This resulted in an empty/blank initial history entry. If the user drew on the canvas before the image loaded, their annotations would be overwritten when the image finally rendered.

**Fix Applied:**
- Made `createAnnotationCanvas` return a `ready` promise
- Canvas state history is now initialized inside `img.onload`
- Popup defers `setupCanvasEvents()` until the canvas is ready

**Files Changed:**
- `src/utils/annotate.ts`
- `src/popup/popup.ts`

**Verification:**
```bash
grep -n "img.onload" dist/utils/annotate.js
grep -n "ready.then" dist/popup/popup.js
```

---

## Limitations & Risks

### LIM-1: Incomplete annotation tools
The UI exposes 5 tools (Select, Pen, Rectangle, Arrow, Blur), but only **Pen** is fully implemented. Rectangle, Arrow, and Blur are placeholders. The `getImageDataFromHistory` helper was removed during cleanup.

**Impact:** Users selecting Rectangle/Arrow/Blur will see no visual feedback.

**Recommendation:** Either implement the tools or hide them from the toolbar until ready.

### LIM-2: Sticky/fixed headers captured multiple times
The scroll capture algorithm scrolls the page and captures viewports with overlap. Fixed-position elements (sticky headers, navbars) remain in the viewport during scroll, so they appear in multiple captured slices. The stitch algorithm doesn't account for this, potentially causing visual artifacts.

**Impact:** Screenshots of pages with sticky headers may show duplicated headers.

**Recommendation:** Add logic to detect fixed elements and either exclude them during stitching or use a more sophisticated overlap algorithm.

### LIM-3: Long page performance
Pages taller than ~10,000px may cause memory issues because all viewport captures are stored as data URLs in memory before stitching.

**Impact:** Browser tab may crash on very long pages.

**Recommendation:** Implement incremental stitching or use OffscreenCanvas to reduce memory pressure.

---

## Static Validation Results

| Check | Result |
|-------|--------|
| Manifest valid | PASS |
| All referenced files exist | PASS |
| TypeScript compilation | PASS (0 errors) |
| Build completes | PASS |
| Permissions minimal | PASS (`activeTab`, `scripting`, `contextMenus`, `downloads`, `storage`, `commands`) |
| No external network requests | PASS |
| Icons present | PASS |

---

## Manual Testing Checklist

Load the extension in Chrome:
1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" → select `dist/`

| Test | Expected Result | Status |
|------|----------------|--------|
| Extension icon appears | Blue camera icon in toolbar | ☐ |
| Popup opens without errors | Popup shows Capture button | ☐ |
| Capture simple page (`about:blank`) | Progress updates, preview appears | ☐ |
| Capture long page (Wikipedia) | Full page stitched, no gaps | ☐ |
| Context menu capture | Right-click → Capture Full Page Screenshot works | ☐ |
| Keyboard shortcut (`Ctrl+Shift+S`) | Capture initiates | ☐ |
| Pen annotation | Drawing appears on canvas | ☐ |
| Undo/Redo | Works after drawing | ☐ |
| Download | File saves with correct name | ☐ |
| Copy to clipboard | Paste shows screenshot | ☐ |
| Error on `chrome://` URLs | Shows error message, doesn't hang | ☐ |

---

## Recommended Next Steps for Dev

1. **HIGH:** Implement Rectangle, Arrow, and Blur annotation tools, or hide them from the UI
2. **HIGH:** Add error boundaries around `captureVisibleTab` to handle blocked pages gracefully
3. **MEDIUM:** Address sticky header duplication in stitch algorithm
4. **MEDIUM:** Add memory optimization for very long pages
5. **LOW:** Replace `alert()` calls with toast notifications in popup
6. **LOW:** Add loading skeleton/placeholder while annotation canvas initializes
