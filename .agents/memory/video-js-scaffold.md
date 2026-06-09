---
name: video-js scaffold typecheck false-positives
description: Why `pnpm typecheck` fails on video-js artifacts even when the video is correct, and how to verify instead.
---

# video-js scaffold typecheck is unreliable

Running `pnpm --filter @workspace/<video-slug> run typecheck` on a video-js artifact reports errors that live in the **scaffold files** you must not modify:
- `src/lib/video/animations.ts` — framer-motion `Variant` / transition typing mismatches.
- `src/lib/video/hooks.ts` — `Cannot find name 'window'`.
- `src/main.tsx` — `Cannot find name 'document'` (DOM lib not in the typecheck tsconfig `lib`).

**Why:** the video scaffold ships with a tsconfig/framer-motion type setup that does not cleanly pass `tsc --noEmit`. These are pre-existing, not caused by your scene/control/audio edits.

**How to apply:** Do NOT chase these. Verify a video build with `bash scripts/validate-recording.sh` (run from the artifact dir) plus Vite workflow logs (HMR "Fast Refresh (new export)" messages are transitional, not real errors). Only treat typecheck errors as yours if they point at files you created (e.g. `VideoTemplate.tsx`, `VideoWithControls.tsx`, `useSceneControls.ts`, `App.tsx`).
