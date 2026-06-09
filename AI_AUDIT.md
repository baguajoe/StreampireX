# StreamPireX — AI Integration Audit (Part 18b)

Read-only audit. No code modified. Generated 2026-05-05 from working tree
on branch `claude/fix-recording-studio`.

## Summary

| Provider               | Integrations | ✅ Working | ⚠️ Partial | ❌ Stub/Broken | 🔧 Not wired |
|------------------------|-------------:|----------:|-----------:|---------------:|-------------:|
| Replicate              | 5            | 3         | 1          | 0              | 1            |
| ElevenLabs             | 2 (TTS+clone)| 2         | 0          | 0              | 0            |
| OpenAI                 | 4            | 4         | 0          | 0              | 0            |
| Anthropic (Claude)     | 4            | 4         | 0          | 0              | 0            |
| Deepgram               | 1            | 1         | 0          | 0              | 0            |
| Demucs (self-hosted)   | 1            | 0         | 1          | 0              | 0            |
| Matchering (self-host) | 1            | 0         | 1          | 0              | 0            |
| Whisper local          | 1            | 0         | 1          | 0              | 0            |
| pyttsx3 (offline TTS)  | 1            | 0         | 1          | 0              | 0            |
| MediaPipe (WASM)       | 1            | 1         | 0          | 0              | 0            |
| Suno-gap stubs         | 4            | 0         | 0          | 4              | 0            |

"Working" = backend code complete, env-keyed, wired to a frontend page that
reaches the route. "Partial" = code path exists but depends on optional
runtime install (Demucs, Matchering, local Whisper). "Stub" = endpoint
returns a fake success message with no implementation. "Not wired" =
backend is complete, but no UI calls it.

---

## Provider 1: Replicate

Backend installs `replicate` SDK + uses raw `requests` to
`https://api.replicate.com/v1/predictions`. Token loaded from
`REPLICATE_API_TOKEN` env var. No fallback when missing — endpoints return
500 / "not configured".

### A. Text-to-Video (Kling v1.6 Standard / Pro)
- **Code location:** `src/api/ai_video_generation_routes.py:145-303`
- **Frontend:** `src/front/js/pages/AIVideoStudio.js:106-120`,
  routed at `/ai-video-studio` in `src/front/js/layout.js:611`
- **Model used:** `kwaivgi/kling-v1.6-standard` (premium → `…-pro`)
- **Status:** ✅ working
- **API key handling:** `os.environ.get('REPLICATE_API_TOKEN')` —
  hard-required, returns 500 if missing
- **Error handling:** wrapped in try/except, refunds credits on failure
  (`ai_video_generation_routes.py:283-298`), updates DB record to `failed`
- **End-to-end flow:** UI prompt → `POST /api/ai-video/generate/text` →
  Replicate run → download MP4 → upload to R2 → return public URL → UI
  shows video player. Daily-limit + tier gating in place.
- **Issues found:** None blocking. Cost-tracking sets `api_cost` to a
  hardcoded estimate (`0.10` / `0.25`), not the real Replicate billed cost.
- **Demo-safe?:** **yes** — assuming `REPLICATE_API_TOKEN` and R2 envs are
  set in the demo environment.

### B. Image-to-Video (Kling v1.6)
- **Code location:** `src/api/ai_video_generation_routes.py:310-490`
- **Frontend:** Same `AIVideoStudio.js`, "Image to Video" tab
- **Status:** ✅ working
- **API key handling:** Same as A
- **Error handling:** Same refund-on-fail pattern as A
- **End-to-end flow:** Upload image (or supply URL) → R2 → Replicate
  image-to-video → R2 → UI display
- **Issues found:** Frontend supports both file upload and URL; backend
  handles both correctly.
- **Demo-safe?:** **yes**

### C. SPX Script — Comic Panel Generation (FLUX 1.1 Pro)
- **Code location:** `src/api/routes/script_routes.py:23-127`
- **Frontend (good path):** `src/front/js/components/spx-script/SPXComicEditor.js:96`
  — calls backend `/api/script/generate-panel` correctly.
- **Frontend (bad path):** `src/front/js/components/spx-script/SPXComicGenerator.js:101-132`
  — calls `https://api.replicate.com/...` **directly from the browser** with
  no auth header. Falls back to a "placeholder" status when it fails.
- **Model used:** `black-forest-labs/flux-1.1-pro`
- **Status:** ⚠️ partial — backend route works; one of two UI components
  bypasses it.
- **API key handling:** Backend uses `REPLICATE_API_TOKEN`. Frontend
  direct-call has no token at all.
- **Error handling:** Backend polls for up to 120s (line 86), returns the
  raw Replicate error text on failure (line 80). Credit deduction is
  commented out (lines 44-46, 113-116) — `# user.spx_credits -= …` so
  credits do not actually decrement.
- **End-to-end flow (good):** UI prompt → `/api/script/generate-panel` →
  Replicate predictions → poll → return image URL → UI shows panel.
- **Issues found:**
  1. `SPXComicGenerator.js` will always fail in production (no auth on
     direct Replicate call) and silently show "Wire /api/script/generate-panel"
     placeholder text to users.
  2. SPX Credits never get deducted (commented out).
- **Demo-safe?:** **only if** demo uses `SPXComicEditor` (not
  `SPXComicGenerator`). Risky — both routes resolve to `/spx-script` in
  layout.js (lines 569, 679 — duplicate route definition).

### D. AI Inpaint / Background Removal (Stable Diffusion + rembg)
- **Code location:** `src/api/ai_fill_routes.py:24-63`
- **Frontend:** `src/front/js/pages/SPXCanvasPage.js:92`,
  `src/front/js/pages/SPXVectorPage.js:1118`
- **Models used:** Replicate version `c11bac…` (inpaint),
  `50adaf…` (rembg). Hardcoded version hashes — these go stale on Replicate
  if the model version is removed.
- **Status:** ✅ working
- **API key handling:** Module-level `REPLICATE_TOKEN = os.getenv(...)`.
  No defensive check; `Authorization: Token ` (empty) sent if env var
  missing — Replicate will respond 401 and the route returns 500 with the
  error text. Acceptable.
- **Error handling:** `_poll()` raises after 120s (line 19); routes
  return 500 with raw `str(e)`.
- **End-to-end flow:** Canvas/Vector page selects mask area → POST b64
  image+mask → Replicate poll → returns inpainted PNG URL → drawn back
  onto canvas.
- **Issues found:** Hardcoded model versions will break silently when
  Replicate retires those revisions.
- **Demo-safe?:** **yes**, today.

### E. MiDaS Depth Estimation
- **Code location:** `src/api/ai_fill_routes.py:66-94`
- **Frontend:** `src/front/js/pages/SPXVectorPage.js:1425`
- **Model:** `isl-org/midas` (version `884e41…`)
- **Status:** ✅ working
- **Error handling:** Same as D.
- **End-to-end flow:** Vector page → rasterized SVG b64 → POST → depth map
  PNG URL.
- **Issues found:** Same hardcoded-version risk as D.
- **Demo-safe?:** **yes**.

---

## Provider 2: ElevenLabs

Used for voice cloning (custom DJ / creator voice) + TTS for radio breaks
and creator services. Loaded via `ELEVENLABS_API_KEY` env var.

### A. Voice Cloning (`/v1/voices/add`)
- **Code location:** `src/api/ai_radio_dj.py:1445-1541`
- **Frontend:** `src/front/js/component/AIRadioDJ.js` (Voice tab)
- **Status:** ✅ working
- **API key handling:** Returns 503 with friendly "feature will be enabled
  soon" message when key missing (`ai_radio_dj.py:1452-1456`). Good.
- **Error handling:** Catches `requests.Timeout` separately (504), generic
  exception returns 500 with stack trace logged.
- **End-to-end flow:** Upload voice sample → ElevenLabs `/voices/add` →
  returns `voice_id` → stored on `RadioStation.playlist_schedule.dj_config`
  → station now uses cloned voice for talk breaks.
- **Issues found:** None.
- **Demo-safe?:** **yes**.

### B. TTS (`/v1/text-to-speech/{voice_id}`) — used everywhere
- **Code locations:**
  - `src/api/ai_radio_dj.py:492-516` (`_tts_elevenlabs` helper)
  - `src/api/voice_clone_services.py:96-153` (`generate_voice_audio`
    helper used by all 6 voice services)
- **Frontends:**
  - AI Radio DJ → `/airadio-dj`, `/airadio-dj-page`
  - Voice Clone Services → `/voice-clone-services` (all 7 endpoints
    consumed: `/api/voice/narration`, `/api/voice/stream-alert`,
    `/api/voice/stream-alert/pregenerate`, `/api/voice/shoutout`,
    `/api/voice/story-narration`, `/api/voice/course/lesson`)
  - AI Lesson Tools → `/api/voice/course/lesson`
- **Model:** `eleven_monolingual_v1`
- **Status:** ✅ working — full pipeline through R2 with credit gating
- **API key handling:** `voice_clone_services.py:102-104` — returns
  `(None, None)` if missing; route then returns "Failed to generate" 500.
  Could be friendlier (say "ElevenLabs not configured") but doesn't crash.
- **Error handling:** `try/except` returns `(None, None)`; routes then
  surface a generic "Failed to generate intro audio" message. Credits
  *are* deducted before the call but **not refunded on failure** (verified
  in `voice_clone_services.py` — there is no refund path). This is a
  user-facing money-loss bug.
- **End-to-end flow:** Script → `POST /v1/text-to-speech/{voice_id}` →
  MP3 bytes → temp file → R2 upload → return public URL.
- **Issues found:**
  1. Credit-no-refund on ElevenLabs failure (charges user even if TTS
     fails). Note that `ai_video_gen_bp` (Replicate) does refund — pattern
     is inconsistent.
  2. Endpoints assume the user has already cloned a voice; if not,
     `check_voice_available()` returns 400 with a helpful pointer to
     "AI Radio DJ → Voice tab". Good UX guard.
- **Demo-safe?:** **yes** — given a cloned voice and `ELEVENLABS_API_KEY`.

---

## Provider 3: OpenAI

### A. GPT-4o-mini — Radio DJ Script Generation
- **Code location:** `src/api/ai_radio_dj.py:319-340` (`_generate_with_openai`)
- **Status:** ✅ working with template fallback
- **Error handling:** Tries OpenAI first, then Anthropic, then a
  template-based fallback (`_generate_fallback_script`, line 366). Robust.
- **Demo-safe?:** **yes**.

### B. GPT-4o — Show Notes Fallback
- **Code location:** `src/api/podcast_studio_ai_routes.py:635-663`
  (`_generate_notes_openai`)
- **Status:** ✅ working (used as fallback when `ANTHROPIC_API_KEY` is unset)
- **Demo-safe?:** **yes**.

### C. OpenAI TTS (`tts-1`)
- **Code location:** `src/api/ai_radio_dj.py:466-489` (`_tts_openai`)
- **Status:** ✅ working (used as #2 priority when no ElevenLabs cloned voice)
- **Demo-safe?:** **yes**.

### D. Whisper API — Transcription / Captions
- **Code locations:**
  - `src/api/podcast_studio_ai_routes.py:145-192` (`_transcribe_whisper`)
  - `src/api/ai_video_tools.py:410-455` (caption generation API path)
- **Frontend:** `src/front/js/pages/PodcastStudioPhase1.js:504` (transcribe);
  `src/front/js/component/AIVideoTools.js:127` (captions — but parent
  component is **never imported into any page or route**)
- **Status:** ✅ for podcast transcription; 🔧 not-wired for video captions
- **Error handling:** Returns 400 if `OPENAI_API_KEY` missing. Whisper
  fallback only triggers when `DEEPGRAM_API_KEY` is also missing — so
  Whisper is a tertiary path in podcast flow.
- **Demo-safe?:** **podcast transcription yes, video captions no UI**

---

## Provider 4: Anthropic (Claude)

### A. Claude Sonnet 4.5 — Show Notes / Magic Clips / Content Writer
- **Code locations:**
  - `src/api/podcast_studio_ai_routes.py:585-632` (`_generate_notes_anthropic`)
    — model `claude-sonnet-4-5-20250929`
  - `src/api/podcast_studio_phase2_routes.py:93-109` (Magic Clips) —
    model `claude-sonnet-4-5-20250929`
  - `src/api/ai_content_routes.py:82-126` (`generate_with_ai`) — model
    `claude-sonnet-4-20250514` (older). Uses Anthropic SDK
    (`import anthropic`) rather than raw HTTP.
  - `src/api/ai_radio_dj.py:343-363` (`_generate_with_anthropic`) — model
    `claude-sonnet-4-20250514`
- **Frontend wiring:**
  - Show Notes — used inside `PodcastStudio` flow (route `/podcast-studio`)
  - Magic Clips / Export Clip — `PodcastStudioPhase2.js:147,173` but
    **only `AsyncGuestRecordPage` is exported and routed** — the
    Magic Clips UI in this file is never reached.
  - Content Writer — `AIContentWriter.js` mounted at `/ai-content-writer`,
    template-fallback path runs when key missing.
- **Status:**
  - Show Notes: ✅ working
  - Magic Clips: ⚠️ partial — backend complete, UI code exists but is in
    the unrouted half of `PodcastStudioPhase2.js`
  - Content Writer: ✅ working (with graceful template fallback)
  - Radio DJ scripts: ✅ working
- **Error handling:** All paths fall back to OpenAI or templates if
  Anthropic key missing or call fails.
- **Issues found:**
  1. Two different Claude model versions in active use
     (`claude-sonnet-4-5-20250929` vs `claude-sonnet-4-20250514`).
     Per `claude-api` skill guidance the project should be on Claude
     Sonnet 4.6 (`claude-sonnet-4-6`) at minimum. Not a demo-blocker, but
     should be unified before launch.
  2. Magic Clips backend wasted unless its UI gets wired.
- **Demo-safe?:** **yes for show notes / radio / content writer; no for
  Magic Clips (UI not routed)**.

---

## Provider 5: Deepgram

### A. Nova-2 Transcription
- **Code location:** `src/api/podcast_studio_ai_routes.py:93-142`
- **Frontend:** `PodcastStudioPhase1.js:504` calls
  `/api/podcast-studio/transcribe`. Backend prefers Deepgram when
  `DEEPGRAM_API_KEY` set.
- **Status:** ✅ working — primary path for transcription
- **Error handling:** `raise_for_status()` propagates HTTP errors as 500
  with the message in the route response.
- **Issues found:**
  - Persistence is deferred: comment at lines 83-85 notes the
    `transcript` / `transcript_words` columns are not in `PodcastEpisode`
    model. **Transcript is returned to the client but not saved to DB.**
    Show Notes and Magic Clips both depend on `episode.transcript` —
    they will fail silently the second time the user comes back unless
    the transcript is re-fetched and re-passed in the request body.
- **Demo-safe?:** **yes for one-shot demo**, but the missing persistence
  will surface as "transcribe again every time" UX.

---

## Provider 6+: Self-hosted models

### Demucs — AI Stem Separation
- **Code location:** `src/api/ai_stem_separation.py:163-227`
- **Frontend:** `src/front/js/pages/AIStemSeparation.js`, routed `/ai-stem-separation`
- **Status:** ⚠️ partial — depends on `pip install demucs torch torchaudio`
  being present at runtime. `check_demucs_available()` (line 109) probes
  for it; if missing, returns 503 with `install_hint`.
- **Issues found:** On Render free/starter dynos this likely won't run
  (no GPU, slow CPU inference, 600s timeout cap). Verify install on the
  deploy environment before demo.
- **Demo-safe?:** **only if Demucs is actually installed on the deployed
  Python environment.** Worth running `python -c "import demucs"` on
  Render before demo.

### Matchering — AI Mastering Phase 2
- **Code location:** `src/api/ai_mastering.py:38-43`
- **Status:** ⚠️ partial — graceful import-fail; logs "⚠️ Matchering not
  installed — Phase 2 disabled" at startup. Phase 1 (pedalboard chain)
  works regardless.
- **Demo-safe?:** Phase 1 yes; Phase 2 only if `pip install matchering`
  ran on deploy.

### Whisper local
- **Code location:** `src/api/ai_video_tools.py:386-408`
- **Status:** ⚠️ partial, gated behind `WHISPER_MODE=local` env var.
  Falls back to OpenAI Whisper API when not set.

### pyttsx3 (offline TTS)
- **Code location:** `src/api/ai_radio_dj.py:519-531`
- **Status:** ⚠️ partial — bottom-of-the-stack fallback when no API keys.
  Output quality is low; not a demo path.

### MediaPipe Holistic (browser, WASM)
- **Code location:** `src/front/js/component/LiveStudio.js:2-69`
- **NPM deps:** `@mediapipe/{holistic,camera_utils,face_detection,hands,pose}`
  pinned in `package.json:137-141`
- **Status:** ✅ working (browser-side, no backend cost)
- **Demo-safe?:** **yes**, runs entirely in the browser.

---

## Provider 7 (BROKEN): suno_gap_routes — Music Generation Stubs

### **CRITICAL**: 4 stub routes, real frontend, no implementation

- **Code location:** `src/api/suno_gap_routes.py` (43 lines, all stubs)
- **Backend status:** every route returns
  `jsonify({'message': '<feature> endpoint ready'}), 200` — no AI call,
  no audio output, no error.
- **Frontend pages calling these stubs:**
  | Page | Route | Calls | Backend |
  |------|-------|-------|---------|
  | `AITextToSong.js` | `/ai-text-to-song` | `/api/ai/text-to-song` | stub |
  | `HumToSong.js` | `/hum-to-song` | `/api/ai/hum-to-song` | stub |
  | `AddBeatToVocals.js` | `/add-beat-to-vocals` | `/api/ai/add-beat` | stub |
  | `SongExtender.js` | `/song-extender` | `/api/ai/extend-song` | stub |
- **What the user will see:** Click "Generate Song" → request succeeds
  with HTTP 200 → frontend gets back `{message: "endpoint ready"}` and no
  audio URL → either "no audio URL" toast, broken UI state, or page hang.
- **Credits:** Frontend deducts AI credits *before* the call
  (`AITextToSong.js:286`, `HumToSong.js:299`). Users will be charged for
  fake generations.
- **Status:** ❌ broken/stub — 4 separate features
- **Demo-safe?:** **NO. Hide these from the demo.**

---

## Internal AI (algorithmic, no external API)

| Feature | Code location | Status | Demo-safe? |
|---|---|---|---|
| BPM detection (autocorrelation) | `src/front/js/utils/audioAnalysis.js` | ✅ verified Part 18 | yes |
| Key detection (Krumhansl-Schmuckler chroma) | `src/front/js/utils/audioAnalysis.js` | ✅ verified Part 18 | yes |
| Loudness/LUFS approximation | `src/front/js/utils/audioAnalysis.js` | ✅ verified Part 18 | yes |
| AI Mastering Phase 1 (pedalboard chain) | `src/api/ai_mastering.py` | ✅ working | yes |
| AI Chord Generator (music theory) | `src/api/ai_chord_generator.py` | ✅ working (zero-cost) | yes |
| AI Mix Assistant (librosa) | `src/api/ai_mix_assistant.py` + `/api/ai/mix-assistant/analyze` | ✅ working | yes |
| Magic Audio (ffmpeg filter chain) | `src/api/podcast_studio_ai_routes.py:336-512` | ✅ working | yes |
| Silence detect / remove (ffmpeg) | `src/api/ai_video_tools.py:65-239` | ⚠️ backend works, but `AIVideoTools.js` UI not mounted | partial |
| Thumbnail extraction (ffmpeg) | `src/api/ai_video_tools.py:246-339` | ⚠️ same — UI not mounted | partial |

---

## Critical Findings

### Demo-blockers (must fix before June 1)

1. **Suno-gap stubs charge credits and return fake success.**
   Either implement (integrate Suno / MusicGen / Stable Audio) or hide all
   four pages (`/ai-text-to-song`, `/hum-to-song`, `/add-beat-to-vocals`,
   `/song-extender`) behind a feature flag. **2-4 hours to gate; weeks to
   actually implement.**

2. **`SPXComicGenerator.js` calls Replicate from the browser without
   auth.** It will always fall back to a "placeholder" message that says
   "Wire /api/script/generate-panel" — visible to the user. Either delete
   that component (the SPXComicEditor variant works) or repoint its fetch
   to `/api/script/generate-panel`. Plus the duplicate `/spx-script` route
   in `layout.js:569` and `:679` should be deduped. **1 hour.**

3. **ElevenLabs failures don't refund credits.** Inconsistent with
   Replicate-video flow that does refund. User-facing money loss on
   transient API errors. **2 hours** to add the refund path in
   `voice_clone_services.generate_voice_audio` callers.

4. **Deepgram transcript not persisted** (lines 83-85 in
   `podcast_studio_ai_routes.py`). Show Notes / Magic Clips will silently
   fail on a returning user. **3 hours** including model migration.

### Polish-blockers (should fix before public launch July 1)

5. **Hardcoded Replicate model versions** (FLUX in script_routes.py,
   inpaint/rembg/midas in ai_fill_routes.py). When Replicate rotates these
   they 404. Add a version-resolution helper or pin to model slugs without
   versions when possible. **2 hours.**

6. **Mixed Claude model versions** — `claude-sonnet-4-20250514` in some
   files, `claude-sonnet-4-5-20250929` in others. Should consolidate on
   `claude-sonnet-4-6`. **1 hour.**

7. **AIVideoTools component is orphaned** — built but never imported into
   any page or layout route. Either mount it inside `VideoEditor.js` or
   delete. **1-2 hours** to mount with QA.

8. **Magic Clips UI in `PodcastStudioPhase2.js` is never routed** — only
   `AsyncGuestRecordPage` is exported. The transcript-driven clip-finder
   is dead code today. **2-4 hours** to expose either as standalone route
   or as a tab inside `PodcastStudio.js`.

9. **SPX Credits commented-out in `script_routes.generate_panel`**
   (lines 44-46, 113-116). Free comic generations until uncommented.
   **30 minutes.**

10. **Demucs / Matchering install verification** — depends on the deploy
    image actually having the pip-only deps. Add a startup check or smoke
    route. **1 hour.**

### Nice-to-have (post-launch)

11. Replace `api_cost` hardcoded estimates with values from Replicate's
    response payload for accurate accounting.
12. Move OpenAI Whisper local fallback (currently gated behind
    `WHISPER_MODE=local`) into a runtime auto-detect.

---

## Estimated Fix Time

| # | Issue | Hours | Priority |
|--:|---|---:|---|
| 1 | Gate or delete Suno-gap stub pages | 2-4 | **P0 demo-blocker** |
| 2 | Fix SPXComicGenerator direct-Replicate path + dedupe `/spx-script` route | 1 | **P0 demo-blocker** |
| 3 | Add ElevenLabs credit-refund on failure | 2 | **P0 demo-blocker** |
| 4 | Persist Deepgram transcript to DB (model migration) | 3 | **P0 demo-blocker** |
| 5 | Replace hardcoded Replicate model versions | 2 | P1 polish |
| 6 | Unify Claude model version on `claude-sonnet-4-6` | 1 | P1 polish |
| 7 | Mount or delete AIVideoTools component | 2 | P1 polish |
| 8 | Route Magic Clips UI from PodcastStudioPhase2 | 4 | P1 polish |
| 9 | Uncomment SPX Credits deduction in `generate_panel` | 0.5 | P1 polish |
| 10 | Verify Demucs/Matchering installed on Render | 1 | P1 polish |
| **P0 total** | | **8-10 hours** | |
| **P0 + P1 total** | | **18-21 hours** | |

---

## Honest Demo Assessment (today, 2026-05-05)

**Demo-safe AI features (assuming env vars set on the demo deploy):**

- ✅ AI Video Studio (text-to-video + image-to-video, Kling)
- ✅ AI Inpaint / Background Removal / Depth (SPX Canvas + Vector)
- ✅ SPX Script comic generation (FLUX) — *only via SPXComicEditor; risk
  of users hitting the broken SPXComicGenerator path*
- ✅ AI Radio DJ + Voice Cloning (ElevenLabs)
- ✅ Voice Clone Services (narration, alerts, shoutouts, story, course)
- ✅ AI Stem Separation (Demucs) — *if installed on deploy*
- ✅ AI Mastering Phase 1 (pedalboard) — Phase 2 (Matchering) only if
  installed
- ✅ AI Content Writer (Claude with template fallback)
- ✅ Podcast Studio: Transcription (Deepgram), Magic Audio (ffmpeg),
  Show Notes (Claude)
- ✅ AI Mix Assistant, AI Chord Generator, BPM/Key detection
- ✅ MediaPipe Holistic (LiveStudio body tracking)

**NOT demo-safe today:**

- ❌ AI Text-to-Song / Hum-to-Song / Add-Beat-to-Vocals / Song Extender
  (all four are stubs that charge credits)
- ❌ Magic Clips (Phase 2 podcast — UI not routed)
- ❌ AIVideoTools (silence removal, thumbnails, captions — UI orphan)
- ⚠️ SPXComicGenerator path (use SPXComicEditor)

**Riskiest user-visible integration (most likely to break a demo):**
**SPX Script comic generation.** Two reasons: (1) the duplicate
`/spx-script` route in `layout.js` makes it nondeterministic which
component renders, and (2) FLUX 1.1 Pro is pinned to a model slug — if
Replicate has updated the slug behavior, every panel attempt will fail.
The four music-gen stubs are technically more broken, but they're so
obviously fake that hiding them is straightforward. The comic generator
*looks* working until a panel actually fails to render.

---

## Search Strategy Used (for reproducibility)

```
grep -rli "replicate" src/api src/front/js
grep -rli "elevenlabs\|ELEVEN" src/api src/front/js
grep -rli "openai\|anthropic\|deepgram\|tensorflow\|mediapipe\|demucs"
grep -n "api.replicate\|api.elevenlabs\|api.openai\|api.anthropic"
grep -rn "/api/ai-fill\|/api/ai-video\|/api/ai/radio\|/api/voice/\|/api/podcast-studio"
grep -n "ai_video_gen_bp\|ai_fill_bp\|ai_video_tools_bp\|voice_clone_services_bp\|…" src/app.py
grep -n "AIVideoStudio\|AIRadioDJ\|VoiceCloneServices\|…" src/front/js/layout.js
```

No code or configuration was modified during this audit. The single
file written is `AI_AUDIT.md` at the repo root.
