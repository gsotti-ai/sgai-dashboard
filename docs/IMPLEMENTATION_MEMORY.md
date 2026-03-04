# Dashboard Implementation Memory (Handoff)

Updated: 2026-03-04

## Scope
Improve the Task modal image upload selector UI (`ImageSelector`) without changing backend behavior.

## Architecture Notes
- Frontend: React + TSX, bundled to `dashboard/app.js` via esbuild.
- Main modal component: `src/frontend/components/TaskModal.tsx`
- Upload transport is provided by parent component via prop:
  - `onUpload(files) => Promise<string[]>`
- Persisted task format still uses `imageUrls` as list of URL strings.

## What was analyzed
- Existing image UX in `TaskModal` was basic:
  - multiline URL textarea
  - plain file input
- No visual drag/drop target, no previews, no quick remove workflow.

## Changes implemented
1. Added new component `src/frontend/components/ImageSelector.tsx`
   - Styled drop area
   - File picker button
   - Uses existing `onUpload` callback
   - Keeps manual URL editing in textarea
   - Shows image previews (grid)
   - Per-image remove action
2. Integrated into `TaskModal`
   - Replaced old textarea + file input with `<ImageSelector .../>`
3. Styling updates in `dashboard/index.html`
   - Added classes for image selector/dropzone/preview cards
   - Mobile preview layout adjusted to 1-column

## Behavior compatibility
- Upload flow unchanged on backend/API level.
- Saved payload still uses `imageUrls` parsed from textarea lines.
- Existing tasks continue to work.

## Files touched
- `src/frontend/components/ImageSelector.tsx` (new)
- `src/frontend/components/TaskModal.tsx`
- `dashboard/index.html`

## Build/run
```bash
npm install --include=dev
npm run build
npm start
```

## If continuing in GitHub Copilot CLI
Recommended prompt:
"Continue polishing ImageSelector UX in dashboard repo. Keep imageUrls compatibility, add upload progress per file and drag overlay animations, preserve existing backend API contracts."

## Open follow-ups
- Add per-file progress (currently aggregate status text)
- Optional: dedupe by normalized URL
- Optional: support paste-from-clipboard image upload
